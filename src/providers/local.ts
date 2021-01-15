import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import * as execa from 'execa'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { providers } from '../registry'
import { StorageProvider } from '../provider'
import { runner } from '../expressions'
import { concatenateKeys } from '../utils'

/**
 * Stores cache content on the local file system.  This is useful for self-hosted runners and
 * GitHub Enterprise Server.
 *
 * There are several key functional differences between local and hosted storage, namely:
 *
 *   1. No individual or total cache size limit.
 *   2. No scoping of caches to individual branches.  Caches are shared across branches.
 *   3. Eviction occurs during the save operation.
 *   4. Caches are only shareable on the local machine.
 *
 * Local caches are structured as follows:
 *
 *   <root>
 *     |- <owner1>
 *          |- <repo1>
 *               |- lastEviction.tstamp
 *               |- <key1>
 *                    |- committed.tstamp
 *                    |- lastAccessed.tstamp
 *                    |- <path1>
 *                    |- <path2>
 *               |- <key2>
 *                    |- lastAccessed.tstamp
 *                    |- <path1>
 *
 * Future work:
 *   1. Can a repo owner or name contain invalid characters on an OS?
 *   2. Override root folder, eviction settings, with env vars
 */
export class LocalStorageProvider extends StorageProvider {
  private getRepo(): IRepo {
    return { owner: github.context.repo.owner, name: github.context.repo.repo }
  }

  private getCacheRoot(): string {
    return path.join(os.homedir(), '.RunnerCache')
  }

  private getRepoFolder(repo: IRepo): string {
    return path.join(this.getCacheRoot(), repo.owner, repo.name)
  }

  private getKeyFolder(key: IKey): string {
    return path.join(this.getRepoFolder(key.repo), key.value)
  }

  private getCachePathFolder(cachePath: ICachePath): string {
    // Use a hash to map the path (e.g., ~/.npm) to the folder in the local cache.
    const pathHash = crypto.createHash('sha256').update(cachePath.path.toString()).digest('hex')
    return path.join(this.getKeyFolder(cachePath.key), pathHash)
  }

  private getLastAccessedPath(key: IKey): string {
    return path.join(this.getKeyFolder(key), 'lastAccessed.tstamp')
  }

  private getLastEvictedPath(repo: IRepo): string {
    return path.join(this.getRepoFolder(repo), 'lastEvicted.tstamp')
  }

  private getCommittedPath(key: IKey): string {
    return path.join(this.getKeyFolder(key), 'committed.tstamp')
  }

  private writeTimestamp(file: string, timestamp: Date): void {
    fs.writeFileSync(file, timestamp.toUTCString(), { encoding: 'utf8' })
  }

  private readTimestamp(file: string): Date {
    const timestamp = fs.readFileSync(file, { encoding: 'utf8' }).toString()
    return new Date(timestamp)
  }

  private getLastAccessed(key: IKey): Date {
    return this.readTimestamp(this.getLastAccessedPath(key))
  }

  private updateLastAccessed(key: IKey): void {
    this.writeTimestamp(this.getLastAccessedPath(key), new Date())
  }

  private getLastEvicted(repo: IRepo): Date {
    try {
      return this.readTimestamp(this.getLastEvictedPath(repo))
    } catch {
      return new Date()
    }
  }

  private updateLastEvicted(repo: IRepo): void {
    this.writeTimestamp(this.getLastEvictedPath(repo), new Date())
  }

  private commit(key: IKey): void {
    this.writeTimestamp(this.getCommittedPath(key), new Date())
  }

  private isCommitted(key: IKey): boolean {
    return fs.existsSync(this.getKeyFolder(key)) && fs.existsSync(this.getCommittedPath(key))
  }

  private preprocessPaths(paths: string[]): string[] {
    return paths.map((p) => {
      if (p.startsWith('~')) {
        p = os.homedir() + p.substr(1)
      }

      return path.normalize(p)
    })
  }

  private async restoreFolder(paths: string[], key: IKey): Promise<void> {
    const start = Date.now()
    core.debug(`Restoring cache ${key.value}`)

    for (const path of this.preprocessPaths(paths)) {
      const sourcePath = this.getCachePathFolder({ key: key, path: path })

      core.debug(`Copying ${sourcePath} to ${path}`)
      await this.copyFolder(sourcePath, path)
    }

    core.debug(`Updating last accessed time`)
    this.updateLastAccessed(key)

    core.info(`Cache successfully restored in ${Date.now() - start} ms`)
  }

  private async saveFolder(paths: string[], key: IKey): Promise<void> {
    const start = Date.now()
    core.debug(`Saving cache ${key.value}`)

    for (const path of this.preprocessPaths(paths)) {
      const targetPath = this.getCachePathFolder({ key: key, path: path })

      core.debug(`Copying ${path} to ${targetPath}`)
      await this.copyFolder(path, targetPath)
    }

    core.debug(`Committing cache ${key.value}`)
    this.updateLastAccessed(key)
    this.commit(key)

    core.info(`Cache successfully saved in ${Date.now() - start} ms`)
  }

  private copyFolderInternal(source: string, target: string): void {
    fs.mkdirSync(target, { recursive: true })

    for (const file of fs.readdirSync(source)) {
      const sourcePath = path.join(source, file)
      const targetPath = path.join(target, file)
      const fstat = fs.statSync(sourcePath)

      if (fstat.isDirectory()) {
        this.copyFolderInternal(sourcePath, targetPath)
      } else {
        fs.copyFileSync(sourcePath, targetPath)
      }
    }
  }

  private async copyFolderWindows(source: string, target: string): Promise<void> {
    const process = execa('robocopy', [source, target, '/E', '/MT:32', '/NP', '/NS', '/NC', '/NFL', '/NDL'])
    try {
      await process
    } catch (e) {
      // Robocopy has non-standard exit codes.
      const exitCode = process.exitCode ?? 0

      if (exitCode & 0x8 || exitCode & 0x10) {
        throw e
      }
    }
  }

  private async copyFolderNative(source: string, target: string): Promise<void> {
    switch (runner.os) {
      case 'Windows':
        await this.copyFolderWindows(source, target)
      case 'Linux':
      case 'macOS':
        this.copyFolderInternal(source, target)
    }
  }

  private async copyFolder(source: string, target: string): Promise<void> {
    if (process.env['CACHE_DISABLE_NATIVE'] === 'true') {
      this.copyFolderInternal(source, target)
    } else {
      await this.copyFolderNative(source, target)
    }
  }

  private listKeys(repo: IRepo): IKey[] {
    const path = this.getRepoFolder(repo)

    if (fs.existsSync(path)) {
      return fs.readdirSync(path).map<IKey>((p) => {
        return { repo: repo, value: p }
      })
    } else {
      return []
    }
  }

  async restoreCache(paths: string[], primaryKey: string, restoreKeys?: string[]): Promise<string | undefined> {
    const keys = concatenateKeys(primaryKey, restoreKeys)
    const repo = this.getRepo()

    for (const key of keys) {
      const cacheKey: IKey = { repo: repo, value: key }

      // Exact match
      if (this.isCommitted(cacheKey)) {
        await this.restoreFolder(paths, cacheKey)
        return cacheKey.value
      }

      // Prefix match - select most recently created entry
      const matches = this.listKeys(repo).filter((k) => k.value.startsWith(key) && this.isCommitted(k))

      if (matches.length > 0) {
        matches.sort((a, b) => fs.statSync(this.getKeyFolder(b)).ctimeMs - fs.statSync(this.getKeyFolder(a)).ctimeMs)

        await this.restoreFolder(paths, matches[0])
        return matches[0].value
      }
    }
  }

  private daysInPast(days: number): Date {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date
  }

  private shouldRunEviction(repo: IRepo): boolean {
    return this.getLastEvicted(repo) < this.daysInPast(1)
  }

  private shouldEvictKey(key: IKey): boolean {
    return this.getLastAccessed(key) < this.daysInPast(7)
  }

  private shouldEvictUncommittedKey(key: IKey): boolean {
    return fs.statSync(this.getKeyFolder(key)).ctime < this.daysInPast(1)
  }

  private evict(repo: IRepo): void {
    const start = Date.now()
    core.debug(`Evicting stale caches from ${repo.owner}/${repo.name}`)

    for (const key of this.listKeys(repo)) {
      if (this.isCommitted(key)) {
        if (this.shouldEvictKey(key)) {
          core.debug(`Evicting cache ${key}`)
          this.evictKey(key)
        }
      } else if (this.shouldEvictUncommittedKey(key)) {
        core.debug(`Evicting uncommitted cache ${key}`)
        this.evictKey(key)
      }
    }

    this.updateLastEvicted(repo)
    core.debug(`Eviction successfully completed in ${Date.now() - start} ms`)
  }

  private evictKey(key: IKey): void {
    // It's technically possible for a machine to have multiple runners where a job
    // tries to restore a cache that is being evicted.  However, given that we only
    // evict after a cache has been unused for 7 days, this is very unlikely.
    fs.rmSync(this.getCommittedPath(key), { force: true })
    fs.rmSync(this.getKeyFolder(key), { recursive: true, force: true })
  }

  async saveCache(paths: string[], key: string): Promise<void> {
    const repo = this.getRepo()
    const cacheKey: IKey = { repo: repo, value: key }
    const cacheFolder = this.getKeyFolder(cacheKey)

    if (fs.existsSync(cacheFolder)) {
      core.info(`Cache already exists, skip saving cache`)
    } else {
      await this.saveFolder(paths, cacheKey)
    }

    if (this.shouldRunEviction(repo)) {
      this.evict(repo)
    }
  }
}

interface IRepo {
  owner: string
  name: string
}

interface IKey {
  repo: IRepo
  value: string
}

interface ICachePath {
  key: IKey
  path: string
}

providers.add('local', new LocalStorageProvider())
