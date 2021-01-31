import * as tar from '@actions/cache/lib/internal/tar'
import * as utils from '@actions/cache/lib/internal/cacheUtils'
import * as core from '@actions/core'
import * as github from '@actions/github'
import * as process from 'process'
import * as path from 'path'
import * as execa from 'execa'
import { providers } from '../registry'
import { StorageProvider } from '../provider'
import { concatenateKeys } from '../utils'
import { env } from '../settings'

/**
 * Stores cache content to an AWS S3 bucket.  The bucket is specified using the
 * AWS_BUCKET_NAME env var.  Each cache entry is accessed through a URL in the
 * format:
 *
 *   s3://<bucket_name>/<owner>/<repo>/<key>
 *
 * This uses the AWS CLI, which must be installed on the runner.  The original plan
 * was to use the AWS-SDK JavaScript library, but it adds 6 MBs of dependencies to
 * this action, nearly quadrupling its size.
 */
class AwsStorageProvider extends StorageProvider {
  private getBucketName(): string {
    return env.getString('AWS_BUCKET_NAME', { required: true })
  }

  private getEndpoint(): string {
    return env.getString('AWS_ENDPOINT')
  }

  private getStoragePrefix(): string {
    return `${github.context.repo.owner}/${github.context.repo.repo}`
  }

  private getStorageKey(key: string): string {
    return `${this.getStoragePrefix()}/${key}`
  }

  private invokeS3(command: 'ls' | 'mb' | 'cp', args: string[], capture: boolean = false): execa.ExecaChildProcess<string> {
    const expandedArgs = ['s3', command, ...args]

    if (this.getEndpoint()) {
      expandedArgs.unshift('--endpoint-url', this.getEndpoint())
    }

    return execa('aws', expandedArgs, capture ? {} : { stdout: 'inherit', stderr: 'inherit' })
  }

  private async list(): Promise<IEntry[]> {
    let output: string = ''

    try {
      core.info(`Listing keys for ${this.getStoragePrefix()}`)
      output = (await this.invokeS3('ls', [`s3://${this.getBucketName()}/${this.getStoragePrefix()}/`], true)).stdout
    } catch (e) {
      const execaError = e as execa.ExecaError

      if (execaError && execaError.stderr && execaError.stderr.indexOf('NoSuchBucket') >= 0) {
        core.info(`Bucket ${this.getBucketName()} not found, creating it now...`)
        await this.invokeS3('mb', [`s3://${this.getBucketName()}`])
      } else {
        core.error(e)
      }
    }

    // Each line in output contains four columns:
    //   <date> <time> <size> <object_name>
    // Lines with prefixes contain a different number of columns, which we exclude.
    return output
      .split('\n')
      .map((s) => s.split(/\s+/, 4))
      .filter((a) => a.length == 4)
      .map<IEntry>((a) => {
        return { key: a[3], size: parseInt(a[2]), created: new Date(`${a[0]} ${a[1]}`) }
      })
  }

  private async restore(key: string): Promise<boolean> {
    const compressionMethod = await utils.getCompressionMethod()
    const archiveFolder = await utils.createTempDirectory()
    const archivePath = path.join(archiveFolder, utils.getCacheFileName(compressionMethod))

    try {
      core.info(`Restoring cache from ${this.getStorageKey(key)}`)
      await this.invokeS3('cp', [ `s3://${this.getBucketName()}/${this.getStorageKey(key)}`, archivePath])
    } catch (e) {
      core.error(e)
      return false
    }

    await tar.extractTar(archivePath, compressionMethod)
    return true
  }

  async restoreCache(paths: string[], primaryKey: string, restoreKeys?: string[]): Promise<string | undefined> {
    const searchKeys = concatenateKeys(primaryKey, restoreKeys)
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
      await this.invokeS3('cp', [archivePath, `s3://${this.getBucketName()}/${this.getStorageKey(key)}`])
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
