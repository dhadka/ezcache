import * as tar from '@actions/cache/lib/internal/tar'
import * as utils from '@actions/cache/lib/internal/cacheUtils'
import * as core from '@actions/core'
import * as github from '@actions/github'
import * as process from 'process'
import * as path from 'path'
import * as execa from 'execa'
import { providers } from '../registry'
import { StorageProvider } from '../provider'

interface IKeyEntry {
  key: string,
  created: Date
}

/**
 * Stores cache content to an AWS S3 bucket.
 */
class AwsStorageProvider extends StorageProvider {
  bucketName: string

  constructor() {
    super()

    this.bucketName = process.env['AWS_BUCKET_NAME'] || 'cache'
  }

  private getStoragePrefix(): string {
    return `${github.context.repo.owner}/${github.context.repo.repo}`
  }

  private getStorageKey(key: string): string {
    return `${this.getStoragePrefix()}/${key}`
  }

  private async list(): Promise<IKeyEntry[]> {
    core.info(`Listing keys for ${this.getStoragePrefix()}`)
    const output = await execa('aws', ['s3', 'ls', `s3://${this.bucketName}/${this.getStoragePrefix()}/`])

    return output.stdout
      .split('\n')                  // Split output into lines
      .map(s => s.split(/\s+/, 4))  // Split each line into four columns
      .filter(a => a.length == 4)   // Exclude lines that do not contain all four columns, such are prefixes
      .map<IKeyEntry>(a => {
        return { key: a[3], created: new Date(a[0]) }
      })
  }

  private async restore(key: string): Promise<boolean> {
    const compressionMethod = await utils.getCompressionMethod()
    const archiveFolder = await utils.createTempDirectory()
    const archivePath = path.join(archiveFolder, utils.getCacheFileName(compressionMethod))

    core.info(`Restoring cache from ${this.getStorageKey(key)}`)
    const subprocess = execa('aws', ['s3', 'cp', `s3://${this.bucketName}/${this.getStorageKey(key)}`, archivePath], {
      stdout: 'inherit',
      stderr: 'inherit'
    })

    try {
      await subprocess
    } catch (e) {
      core.error(e)
      return false
    }

    await tar.extractTar(archivePath, compressionMethod)
    return true
  }

  private concatenateKeys(primaryKey: string, restoreKeys?: string[]): string[] {
    var result = [primaryKey]

    if (restoreKeys) {
      result = result.concat(restoreKeys)
    }

    return result
  }

  async restoreCache(paths: string[], primaryKey: string, restoreKeys?: string[]): Promise<string | undefined> {
    const content = await this.list()
    const searchKeys = this.concatenateKeys(primaryKey, restoreKeys)

    for (const searchKey of searchKeys) {
      const matches = content.filter(c => c.key.startsWith(searchKey))

      if (matches) {
        // Exact match
        if (matches.some(m => m.key === searchKey)) {
          if (this.restore(searchKey)) {
            return searchKey
          }
        }

        // Prefix match - select most recently created key
        matches.sort((a, b) => b.created.getTime() - a.created.getTime())

        if (this.restore(matches[0].key)) {
          return matches[0].key
        }
      }
    }
  }

  async saveCache(paths: string[], key: string): Promise<void> {
    const resolvedPaths = await utils.resolvePaths(paths)
    const compressionMethod = await utils.getCompressionMethod()
    const archiveFolder = await utils.createTempDirectory()
    const archivePath = path.join(archiveFolder, utils.getCacheFileName(compressionMethod))

    await tar.createTar(archiveFolder, resolvedPaths, compressionMethod)

    try {
      core.info(`Saving cache to ${this.getStorageKey(key)}`)
      await execa('aws', ['s3', 'cp', archivePath, `s3://${this.bucketName}/${this.getStorageKey(key)}`], {
        stdout: 'inherit',
        stderr: 'inherit'
      })
    } catch (e) {
      core.error(e)
    }
  }
}

providers.add('aws', new AwsStorageProvider())
providers.add('s3', new AwsStorageProvider())
