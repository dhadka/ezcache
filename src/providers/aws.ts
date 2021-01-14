import * as tar from '@actions/cache/lib/internal/tar'
import * as utils from '@actions/cache/lib/internal/cacheUtils'
import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as path from 'path'
import * as execa from 'execa'
import { providers } from '../registry'
import { StorageProvider } from '../provider'

/**
 * Stores cache content to an AWS S3 bucket.
 */
class AwsStorageProvider extends StorageProvider {
  bucketName: string

  constructor() {
    super()

    this.bucketName = process.env['AWS_BUCKET_NAME'] || 'cache'
  }

  private getStorageKey(key: string): string {
    return `${github.context.repo.owner}/${github.context.repo.repo}/${key}`
  }

  async restoreCache(paths: string[], primaryKey: string, restoreKeys?: string[]): Promise<string | undefined> {
    const compressionMethod = await utils.getCompressionMethod()
    const archiveFolder = await utils.createTempDirectory()
    const archivePath = path.join(archiveFolder, utils.getCacheFileName(compressionMethod))

    const process = execa('aws', ['s3', 'cp', `s3://${this.bucketName}/${this.getStorageKey(primaryKey)}`, archivePath])
    try {
      await process
    } catch (e) {
      core.info(`Process exited with status ${process.exitCode}`)
    }

    await tar.extractTar(archivePath, compressionMethod)

    return primaryKey
  }

  async saveCache(paths: string[], key: string): Promise<void> {
    //do nothing
  }
}

providers.add('aws', new AwsStorageProvider())
providers.add('s3', new AwsStorageProvider())
