import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { StorageProvider } from '../provider'

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
  path: fs.PathLike
}

/**
 * Stores cache content on the local file system.  This is useful for self-hosted runners and
 * GitHub Enterprise Server.
 *
 * There are several key functional difference between local and hosted storage, namely:
 *
 *   1. No individual or total cache size limit.
 *   2. No scoping of caches to individual branches.  Caches are shared across branches.
 *   3. Eviction occurs during the save operation.
 *   4. Concurrency is not supported.  This assumes one job is running at any given time.
 *
 * Local caches are structured as follows:
 *
 *   <root>
 *     |- <owner1>
 *          |- <repo1>
 *               |- lastEviction.tstamp
 *                   |- <key1>
 *                        |- committed.tstamp
 *                        |- lastAccessed.tstamp
 *                        |- <path1>
 *                        |- <path2>
 *                   |- <key2>
 *                        |- lastAccessed.tstamp
 *                        |- <path1>
 * 
 * Future work:
 *   1. Can a repo name contain invalid characters on an OS?
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

  private writeTimestamp(file: fs.PathLike, timestamp: Date): void {
    fs.writeFileSync(file, timestamp.toUTCString(), { encoding: 'utf8' })
  }

  private readTimestamp(file: fs.PathLike): Date {
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
    return fs.existsSync(this.getKeyFolder(key)) && 
      fs.existsSync(this.getCommittedPath(key))
  }

  private concatenateKeys(primaryKey: string, restoreKeys?: string[]): string[] {
    var result = [primaryKey]

    if (restoreKeys) {
      result = result.concat(restoreKeys)
    }

    return result
  }

  private restoreFolder(paths: fs.PathLike[], key: IKey): void {
    const start = Date.now()
    core.debug(`Restoring cache ${key.value}`)

    for (const path of paths) {
      const sourcePath = this.getCachePathFolder({ key: key, path: path })

      core.debug(`Copying ${sourcePath} to ${path}`)
      this.copyFolder(sourcePath, path)
    }

    core.debug(`Updating last accessed time`)
    this.updateLastAccessed(key)

    core.debug(`Cache successfully restored in ${Date.now() - start} ms`)
  }

  private saveFolder(paths: fs.PathLike[], key: IKey): void {
    const start = Date.now()
    core.debug(`Saving cache ${key.value}`)

    for (const path of paths) {
      const targetPath = this.getCachePathFolder({ key: key, path: path })

      core.debug(`Copying ${path} to ${targetPath}`)
      this.copyFolder(path, targetPath)
    }

    core.debug(`Committing cache ${key.value}`)
    this.updateLastAccessed(key)
    this.commit(key)

    core.debug(`Cache successfully saved in ${Date.now() - start} ms`)
  }

  private copyFolder(source: fs.PathLike, target: fs.PathLike): void {
    // TODO: It's probably faster to call native copy programs
    fs.mkdirSync(target, { recursive: true })

    for (const file of fs.readdirSync(source)) {
      const sourcePath = path.join(source.toString(), file)
      const targetPath = path.join(target.toString(), file)
      const fstat = fs.statSync(sourcePath)

      if (fstat.isDirectory()) {
        this.copyFolder(sourcePath, targetPath)
      } else {
        fs.copyFileSync(sourcePath, targetPath)
      }
    }
  }

  private listKeys(repo: IRepo): IKey[] {
    const path = this.getRepoFolder(repo)
    
    if (fs.existsSync(path)) {
      return fs.readdirSync(path).map<IKey>(p => {
        return { repo: repo, value: p }
      })
    } else {
      return []
    }
  }

  async restoreCache(paths: string[], primaryKey: string, restoreKeys?: string[]): Promise<string | undefined> {
    const keys = this.concatenateKeys(primaryKey, restoreKeys)
    const repo = this.getRepo()

    for (const key of keys) {
      core.info(`Checking ${key}`)
      const cacheKey: IKey = { repo: repo, value: key }

      // Exact match
      if (this.isCommitted(cacheKey)) {
        this.restoreFolder(paths, cacheKey)
        return cacheKey.value
      }

      // Prefix match
      for (const testKey of this.listKeys(repo)) {
        if (testKey.value.startsWith(key) && this.isCommitted(testKey)) {
          this.restoreFolder(paths, testKey)
          return testKey.value
        }
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
    fs.rmSync(this.getKeyFolder(key), {recursive: true, force: true})
  }

  async saveCache(paths: string[], key: string): Promise<void> {
    const repo = this.getRepo()
    const cacheKey: IKey = {repo: repo, value: key}
    const cacheFolder = this.getKeyFolder(cacheKey)

    if (fs.existsSync(cacheFolder)) {
      core.info(`Cache already exists, skip saving cache`)
    } else {
      this.saveFolder(paths, cacheKey)
    }

    if (this.shouldRunEviction(repo)) {
      this.evict(repo)
    }
  }
}