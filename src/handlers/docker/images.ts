import * as core from '@actions/core'
import { registry } from '../../registry'
import { runner } from '../../expressions'
import { CacheHandler, ICacheOptions, IRestoreResult, RestoreType } from '../../handler'
import * as execa from 'execa'
import * as path from 'path'
import * as fs from 'fs'

const dockerCacheFolder = '.docker-cache'

class DockerImages extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return [dockerCacheFolder]
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-docker`
  }

  async listImages(): Promise<string[]> {
    const result = await execa('docker', ['image', 'ls', '--format', '{{.Repository}}:{{.Tag}}', '--filter', 'dangling=false'])
    return result.stdout.split(`\n`).filter(id => id !== ``)
  }

  async setup(): Promise<void> {
    const existingImages = await this.listImages()
    core.saveState('EXISTING_DOCKER_IMAGES', existingImages.join(','))

    fs.mkdirSync(dockerCacheFolder, { recursive: true })
  }

  async saveCache(options?: ICacheOptions): Promise<void> {
    const images = new Set(await this.listImages())
    const existingImages = core.getState('EXISTING_DOCKER_IMAGES').split(',')
    
    existingImages.forEach(image => images.delete(image))

    for (const image of images) {
      await execa('docker', ['save', '-o', path.join(dockerCacheFolder, `${image.replace(/\//g, '_')}.tar`), image], { stdout: process.stdout })
    }

    await super.saveCache(options)
  }

  async restoreCache(options?: ICacheOptions): Promise<IRestoreResult> {
    const result = await super.restoreCache(options)

    if (result.type != RestoreType.Miss) {
      for (const file of fs.readdirSync(dockerCacheFolder)) {
        await execa('docker', ['load', '-i', path.join(dockerCacheFolder, file)], { stdout: process.stdout })
      }
    }

    return result
  }
}

registry.add('docker', new DockerImages())
registry.add('docker-images', new DockerImages())
