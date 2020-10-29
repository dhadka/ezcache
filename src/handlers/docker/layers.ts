// This code is derived from github.com/satackey/action-docker-layer-caching.
//
// MIT License
//
// Copyright (c) 2020 satackey
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import * as core from '@actions/core'
import * as cache from '@actions/cache'
import { registry } from '../../registry'
import { runner } from '../../expressions'
import { CacheHandler, ICacheOptions, IRestoreResult, RestoreType } from '../../handler'
import * as state from '../../state'
import { assertType } from 'typescript-is' 
import * as execa from 'execa'
import * as path from 'path'
import * as fs from 'fs'
import PromisePool from 'native-promise-pool'
import * as recursiveReaddir from 'recursive-readdir'
import * as crypto from 'crypto'

interface Manifest {
  Config: string
  RepoTags: string[] | null
  Layers: string[]
}

type Manifests = Manifest[]

function assertManifests(x: unknown): asserts x is Manifests {
  assertType<Manifests>(x)
}

function loadRawManifests(path: string): string {
  return fs.readFileSync(`${path}/manifest.json`).toString()
}

function loadManifests(path: string): Manifests {
  const raw = loadRawManifests(path)
  const manifests = JSON.parse(raw.toString())
  assertManifests(manifests)
  return manifests
}

export class ImageDetector {
  async getExistingImages(): Promise<string[]> {
    const existingSet = new Set<string>([])
    
    const ids = (await execa('docker', ['image', 'ls', '-q'])).stdout.split(`\n`).filter(id => id !== ``)
    const repotags = (await execa('docker', ['image', 'ls', '--format', '{{.Repository}}:{{.Tag}}', '--filter', 'dangling=false'])).stdout.split(`\n`).filter(id => id !== ``);
    core.debug(JSON.stringify({ log: "getExistingImages", ids, repotags }));
    ([...ids, ...repotags]).forEach(image => existingSet.add(image))
    core.debug(JSON.stringify({ existingSet }))
    return Array.from(existingSet)
  }

  async getImagesShouldSave(alreadRegisteredImages: string[]): Promise<string[]> {
    const resultSet = new Set(await this.getExistingImages())
    alreadRegisteredImages.forEach(image => resultSet.delete(image))
    return Array.from(resultSet)
  }

  async checkIfImageHasAdded(restoredImages: string[]): Promise<boolean> {
    const existing = await this.getExistingImages()
    return JSON.stringify(restoredImages) === JSON.stringify(existing)
  }
}

class LayerCache {
  ids: string[] = []
  unformattedSaveKey: string = ''
  restoredRootKey: string = ''
  imagesDir: string = `/tmp/.docker-layer-cache`
  enabledParallel = true
  concurrency: number = 4

  static ERROR_CACHE_ALREAD_EXISTS_STR = `Cache already exists`
  static ERROR_LAYER_CACHE_NOT_FOUND_STR = `Layer cache not found`

  constructor(ids: string[]) {
    this.ids = ids
  }

  async store(key: string) {
    this.unformattedSaveKey = key

    await this.saveImageAsUnpacked()
    if (this.enabledParallel) {
      await this.separateAllLayerCaches()
    }

    if (await this.storeRoot() === undefined) {
      core.info(`cache key already exists, aborting.`)
      return false
    }

    await Promise.all(this.enabledParallel ? await this.storeLayers() : [])
    return true
  }

  private async saveImageAsUnpacked() {
    fs.mkdirSync(this.getSavedImageTarDir(), { recursive: true })
    await execa(`docker save '${(await this.makeRepotagsDockerSaveArgReady(this.ids)).join(`' '`)}' | tar xf - -C .`, { shell: true, cwd: this.getSavedImageTarDir() })
  }

  private async makeRepotagsDockerSaveArgReady(repotags: string[]): Promise<string[]> {
    const getMiddleIdsWithRepotag = async (id: string): Promise<string[]> => {
      return [id, ...(await this.getAllImageIdsFrom(id))]
    }
    return (await Promise.all(repotags.map(getMiddleIdsWithRepotag))).flat()
  }

  private async getAllImageIdsFrom(repotag: string): Promise<string[]> {
    const rawHistoryIds = (await execa('docker', ['history', '-q', repotag])).stdout
    const historyIds = rawHistoryIds.split(`\n`).filter(id => id !== `<missing>` && id !== ``)
    return historyIds
  }

  private async getManifests() {
    return loadManifests(this.getUnpackedTarDir())
  }

  private async storeRoot() {
    const rootKey = await this.generateRootSaveKey()
    const paths = [
      this.getUnpackedTarDir(),
    ]
    core.info(`Start storing root cache, key: ${rootKey}, dir: ${paths}`)
    const cacheId = await LayerCache.dismissError(cache.saveCache(paths, rootKey), LayerCache.ERROR_CACHE_ALREAD_EXISTS_STR, -1)
    core.info(`Stored root cache, key: ${rootKey}, id: ${cacheId}`)
    return cacheId !== -1 ? cacheId : undefined
  }

  private async separateAllLayerCaches() {
    await this.moveLayerTarsInDir(this.getUnpackedTarDir(), this.getLayerCachesDir())
  }

  private async joinAllLayerCaches() {
    await this.moveLayerTarsInDir(this.getLayerCachesDir(), this.getUnpackedTarDir())
  }

  private async moveLayerTarsInDir(fromDir: string, toDir: string) {
    const layerTars = (await recursiveReaddir(fromDir))
      .filter(path => path.endsWith(`/layer.tar`))
      .map(path => path.replace(`${fromDir}/`, ``))

    const moveLayer = async (layer: string) => {
      const from = `${fromDir}/${layer}`
      const to = `${toDir}/${layer}`
      core.debug(`Moving layer tar from ${from} to ${to}`)
      fs.mkdirSync(`${path.dirname(to)}`, { recursive: true })
      fs.renameSync(from, to)
    }
    await Promise.all(layerTars.map(moveLayer))
  }

  private async storeLayers(): Promise<number[]> {
    const pool = new PromisePool(this.concurrency)

    const result =  Promise.all(
      (await this.getLayerIds()).map(
        layerId => {
          return pool.open(() => this.storeSingleLayerBy(layerId))
        }
      )
    )
    return result
  }

  static async dismissError<T>(promise: Promise<T>, dismissStr: string, defaultResult: T): Promise<T> {
    try {
      return await promise
    } catch (e) {
      core.debug(`catch error: ${e.toString()}`)
      if (typeof e.message !== 'string' || !e.message.includes(dismissStr)) {
        core.error(`Unexpected error: ${e.toString()}`)
        throw e
      }

      core.info(`${dismissStr}: ${e.toString()}`)
      core.debug(e)
      return defaultResult
    }
  }

  private async storeSingleLayerBy(layerId: string): Promise<number> {
    const path = this.genSingleLayerStorePath(layerId)
    const key = await this.generateSingleLayerSaveKey(layerId)

    core.info(`Start storing layer cache: ${JSON.stringify({ layerId, key })}`)
    const cacheId = await LayerCache.dismissError(cache.saveCache([path], key), LayerCache.ERROR_CACHE_ALREAD_EXISTS_STR, -1)
    core.info(`Stored layer cache: ${JSON.stringify({ key, cacheId })}`)

    core.debug(JSON.stringify({ log: `storeSingleLayerBy`, layerId, path, key, cacheId}))
    return cacheId
  }

  // ---

  async restore(primaryKey: string, restoreKeys?: string[]) {
    const restoredCacheKey = await this.restoreRoot(primaryKey, restoreKeys)
    if (restoredCacheKey === undefined) {
      core.info(`Root cache could not be found. aborting.`)
      return undefined
    }
    if (this.enabledParallel) {
      const hasRestoredAllLayers = await this.restoreLayers()
      if (!hasRestoredAllLayers) {
        core.info(`Some layer cache could not be found. aborting.`)
        return undefined
      }
      await this.joinAllLayerCaches()
    }
    await this.loadImageFromUnpacked()
    return restoredCacheKey
  }

  private async restoreRoot(primaryKey: string, restoreKeys?: string[]): Promise<string | undefined> {
    core.debug(`Trying to restore root cache: ${ JSON.stringify({ restoreKeys, dir: this.getUnpackedTarDir() }) }`)
    const restoredRootKey = await cache.restoreCache([this.getUnpackedTarDir()], primaryKey, restoreKeys)
    core.debug(`restoredRootKey: ${restoredRootKey}`)
    if (restoredRootKey === undefined) {
      return undefined
    }
    this.restoredRootKey = restoredRootKey

    return restoredRootKey
  }

  private async restoreLayers(): Promise<boolean> {

    
    const pool = new PromisePool(this.concurrency)
    const tasks = (await this.getLayerIds()).map(
      layerId => pool.open(() => this.restoreSingleLayerBy(layerId))
    )

    try {
      await Promise.all(tasks)
    } catch (e) {
      if (typeof e.message === `string` && e.message.includes(LayerCache.ERROR_LAYER_CACHE_NOT_FOUND_STR)) {
        core.info(e.message)

        // Avoid UnhandledPromiseRejectionWarning
        tasks.map(task => task.catch(core.info))

        return false
      }
      throw e
    }

    return true
  }

  private async restoreSingleLayerBy(id: string): Promise<string> {
    const path = this.genSingleLayerStorePath(id)
    const key = await this.recoverSingleLayerKey(id)
    const dir = path.replace(/[^/\\]+$/, ``)

    core.debug(JSON.stringify({ log: `restoreSingleLayerBy`, id, path, dir, key }))

    fs.mkdirSync(dir, { recursive: true })
    const result = await cache.restoreCache([path], key)

    if (result == null) {
      throw new Error(`${LayerCache.ERROR_LAYER_CACHE_NOT_FOUND_STR}: ${JSON.stringify({ id })}`)
    }

    return result
  }

  private async loadImageFromUnpacked() {
    await execa(`tar cf - . | docker load`, { cwd: this.getUnpackedTarDir(), shell: true })
  }

  async cleanUp() {
    fs.rmdirSync(this.getImagesDir(), { recursive: true })
  }

  // ---

  getImagesDir(): string {
    return this.imagesDir
  }

  getUnpackedTarDir(): string {
    return `${this.getImagesDir()}/${this.getCurrentTarStoreDir()}`
  }

  getLayerCachesDir() {
    return `${this.getUnpackedTarDir()}-layers`
  }

  getSavedImageTarDir(): string {
    return `${this.getImagesDir()}/${this.getCurrentTarStoreDir()}`
  }

  getCurrentTarStoreDir(): string {
    return 'image'
  }

  genSingleLayerStorePath(id: string) {
    return `${this.getLayerCachesDir()}/${id}/layer.tar`
  }

  async generateRootHashFromManifest(): Promise<string> {
    const manifest = await loadRawManifests(this.getUnpackedTarDir())
    return crypto.createHash(`sha256`).update(manifest, `utf8`).digest(`hex`)
  }

  async generateRootSaveKey(): Promise<string> {
    const rootHash = await this.generateRootHashFromManifest()
    const formatted = await this.getFormattedSaveKey(rootHash)
    core.debug(JSON.stringify({ log: `generateRootSaveKey`, rootHash, formatted }))
    return `${formatted}-root`
  }

  async generateSingleLayerSaveKey(id: string) {
    const formatted = await this.getFormattedSaveKey(id)
    core.debug(JSON.stringify({ log: `generateSingleLayerSaveKey`, formatted, id }))
    return `layer-${formatted}`
  }
  
  async recoverSingleLayerKey(id: string) {
    const unformatted = await this.recoverUnformattedSaveKey()
    return `layer-${unformatted}`.replace('{hash}', id)
  }

  async getFormattedSaveKey(hash: string) {
    const result = this.unformattedSaveKey.replace('{hash}', hash)
    core.debug(JSON.stringify({ log: `getFormattedSaveKey`, hash, result }))
    return result
  }

  async recoverUnformattedSaveKey() {
    const hash = await this.generateRootHashFromManifest()
    core.debug(JSON.stringify({ log: `recoverUnformattedSaveKey`, hash}))

    return this.restoredRootKey.replace(hash, `{hash}`).replace(/-root$/, ``)
  }

  async getLayerTarFiles(): Promise<string[]> {
    const getTarFilesFromManifest = (manifest: Manifest) => manifest.Layers

    const tarFilesThatMayDuplicate = (await this.getManifests()).flatMap(getTarFilesFromManifest)
    const tarFiles = [...new Set(tarFilesThatMayDuplicate)]
    return tarFiles
  }

  async getLayerIds(): Promise<string[]> {
    const getIdfromLayerRelativePath = (path: string) => path.replace('/layer.tar', '')
    const layerIds = (await this.getLayerTarFiles()).map(getIdfromLayerRelativePath);
    core.debug(JSON.stringify({ log: `getLayerIds`, layerIds }))
    return layerIds
  }
}

class DockerLayers extends CacheHandler {
  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-docker`
  }

  async saveCache(options?: ICacheOptions): Promise<void> {
    const key = await this.getKey(options?.version)

    const restoredKey = state.readRestoredKey(this)
    const alreadyExistingImages = JSON.parse(core.getState(`already-existing-images`))
    const restoredImages = JSON.parse(core.getState(`restored-images`))
  
    assertType<string[]>(alreadyExistingImages)
    assertType<string[]>(restoredImages)
  
    const imageDetector = new ImageDetector()
    if (await imageDetector.checkIfImageHasAdded(restoredImages)) {
      core.info(`Key ${restoredKey} already exists, not saving cache.`)
      return
    }
  
    const imagesToSave = await imageDetector.getImagesShouldSave(alreadyExistingImages)
    if (imagesToSave.length < 1) {
      core.info(`There is no image to save.`)
      return
    }
  
    const layerCache = new LayerCache(imagesToSave)
    layerCache.concurrency = parseInt(core.getInput(`concurrency`, { required: true }), 10)
  
    await layerCache.store(key)
    await layerCache.cleanUp()
  }

  async restoreCache(options?: ICacheOptions): Promise<IRestoreResult> {
    const key = await this.getKey(options?.version)
    const restoreKeys = await this.getRestoreKeys(options?.version)
    const imageDetector = new ImageDetector()
  
    const alreadyExistingImages = await imageDetector.getExistingImages()
  
    const layerCache = new LayerCache([])
    layerCache.concurrency = parseInt(core.getInput(`concurrency`, { required: true }), 10)
    const restoredKey = await layerCache.restore(key, restoreKeys)
    await layerCache.cleanUp()
  
    core.saveState(`already-existing-images`, JSON.stringify(alreadyExistingImages))
    core.saveState(`restored-images`, JSON.stringify(await imageDetector.getImagesShouldSave(alreadyExistingImages)))

    state.savePrimaryKey(this, key)
    state.addHandler(this)

    if (restoredKey) {
      core.info(`Restored cache with key '${restoredKey}'`)
      state.saveRestoredKey(this, restoredKey)
    }

    return {
      type: restoredKey ? (key === restoredKey ? RestoreType.Full : RestoreType.Partial) : RestoreType.Miss,
      restoredKey: restoredKey,
    }
  }
}

registry.add('layers', new DockerLayers())
