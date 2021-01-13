import * as tar from '@actions/cache/lib/internal/tar'
import * as utils from '@actions/cache/lib/internal/cacheUtils'
import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import * as AWS from 'aws-sdk'
import { providers } from '../registry'
import { StorageProvider } from '../provider'

/**
 * Stores cache content to an AWS S3 bucket.
 */
class AwsStorageProvider extends StorageProvider {
  client: AWS.S3
  bucketName: string

  constructor() {
    super()

    const region = process.env['AWS_REGION'] || 'us-east-1'
    const apiVersion = process.env['AWS_API_VERSION'] || '2006-03-01'

    AWS.config.update({ region: region })
    this.client = new AWS.S3({ apiVersion: apiVersion })

    this.bucketName = process.env['AWS_BUCKET_NAME'] || 'cache'
  }

  private getStorageKey(key: string): string {
    return `${github.context.repo.owner}/${github.context.repo.repo}/${key}`
  }

  async restoreCache(paths: string[], primaryKey: string, restoreKeys?: string[]): Promise<string | undefined> {
    const downloadParams = {
      Bucket: this.bucketName,
      Key: this.getStorageKey(primaryKey),
    }

    core.info(`Bucket: ${downloadParams.Bucket}`)
    core.info(`Key: ${downloadParams.Key}`)

    const compressionMethod = await utils.getCompressionMethod()
    const archiveFolder = await utils.createTempDirectory()
    const archivePath = path.join(archiveFolder, utils.getCacheFileName(compressionMethod))

    try {
      const stream = fs.createWriteStream(archivePath)
      this.client.getObject(downloadParams).createReadStream().pipe(stream)
      
      await tar.extractTar(archivePath, compressionMethod)
    } finally {
      try {
        fs.rmSync(archivePath, {force: true})
      } catch (e) {
        core.info(e)
      }
    }

    return primaryKey
  }

  async saveCache(paths: string[], key: string): Promise<void> {
    const compressionMethod = await utils.getCompressionMethod()
    const cachePaths = await utils.resolvePaths(paths)
    const archiveFolder = await utils.createTempDirectory()
    const archivePath = path.join(archiveFolder, utils.getCacheFileName(compressionMethod))

    await tar.createTar(archiveFolder, cachePaths, compressionMethod)

    const stream = fs.createReadStream(archivePath)
    stream.on('error', (e) => console.error(e))

    let metadata: { [key: string]: string } = {}
    metadata['lastAccessed'] = new Date().toUTCString()

    const uploadParams = {
      Bucket: this.bucketName,
      Key: this.getStorageKey(key),
      Body: stream,
      Metadata: metadata,
    }

    this.client.upload(uploadParams)
  }
}

providers.add('aws', new AwsStorageProvider())
providers.add('s3', new AwsStorageProvider())
