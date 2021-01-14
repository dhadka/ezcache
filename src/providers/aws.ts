import * as tar from '@actions/cache/lib/internal/tar'
import * as utils from '@actions/cache/lib/internal/cacheUtils'
import * as core from '@actions/core'
import * as github from '@actions/github'
import * as process from 'process'
import * as path from 'path'
import * as execa from 'execa'
import { providers } from '../registry'
import { StorageProvider } from '../provider'

/**
 * Stores cache content to an AWS S3 bucket.  The bucket is specified using the
 * AWS_BUCKET_NAME env var.  Each cache entry is accessed through a URL in the
 * format:
 *
 *   s3://<bucket_name>/<owner>/<repo>/<key>
 */
class AwsStorageProvider extends StorageProvider {
  bucketName: string | undefined
  endpoint: string | undefined

  constructor() {
    super()

    this.bucketName = process.env['AWS_BUCKET_NAME']
    this.endpoint = process.env['AWS_ENDPOINT']
  }

  private getStoragePrefix(): string {
    return `${github.context.repo.owner}/${github.context.repo.repo}`
  }

  private getStorageKey(key: string): string {
    return `${this.getStoragePrefix()}/${key}`
  }

  private async list(): Promise<IEntry[]> {
    core.info(`Listing keys for ${this.getStoragePrefix()}`)
    const args = ['s3', 'ls', `s3://${this.bucketName}/${this.getStoragePrefix()}/`]

    if (this.endpoint) {
      args.unshift('--endpoint-url', this.endpoint)
    }

    const output = await execa('aws', args)

    // Each line in output contains four columns:
    //   <date> <time> <size> <object_name>
    // Lines with prefixes contain a different number of columns, which we exclude.
    return output.stdout
      .split('\n')
      .map((s) => s.split(/\s+/, 4))
      .filter((a) => a.length == 4)
      .map<IEntry>((a) => {
        return { key: a[3], size: parseInt(a[2]), created: new Date(`${a[0]} ${a[1]}`) }
      })
  }

  private validateBucketName() {
    if (!this.bucketName) {
      throw Error('Missing bucket name, must set environment variable AWS_BUCKET_NAME')
    }
  }

  private async restore(key: string): Promise<boolean> {
    this.validateBucketName()

    const compressionMethod = await utils.getCompressionMethod()
    const archiveFolder = await utils.createTempDirectory()
    const archivePath = path.join(archiveFolder, utils.getCacheFileName(compressionMethod))

    core.info(`Restoring cache from ${this.getStorageKey(key)}`)
    const args = ['s3', 'cp', `s3://${this.bucketName}/${this.getStorageKey(key)}`, archivePath]

    if (this.endpoint) {
      args.unshift('--endpoint-url', this.endpoint)
    }

    const subprocess = execa('aws', args, {
      stdout: 'inherit',
      stderr: 'inherit',
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
    const searchKeys = this.concatenateKeys(primaryKey, restoreKeys)
    const content = await this.list()

    for (const searchKey of searchKeys) {
      const matches = content.filter((c) => c.key.startsWith(searchKey))

      if (matches.length > 0) {
        // Exact match
        if (matches.some((m) => m.key === searchKey)) {
          if (await this.restore(searchKey)) {
            return searchKey
          }
        }

        // Prefix match - select most recently created entry
        matches.sort((a, b) => b.created.getTime() - a.created.getTime())

        if (await this.restore(matches[0].key)) {
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
      const args = ['s3', 'cp', archivePath, `s3://${this.bucketName}/${this.getStorageKey(key)}`]

      if (this.endpoint) {
        args.unshift('--endpoint-url', this.endpoint)
      }

      await execa('aws', args, {
        stdout: 'inherit',
        stderr: 'inherit',
      })
    } catch (e) {
      core.error(e)
    }
  }
}

interface IEntry {
  key: string
  size: number
  created: Date
}

providers.add('aws', new AwsStorageProvider())
providers.add('s3', new AwsStorageProvider())
