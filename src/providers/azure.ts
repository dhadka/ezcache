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
 * Stores cache content in an Azure blob container.  This uses the Azure CLI (az) for all
 * of the storage operations.
 */
class AzureStorageProvider extends StorageProvider {
  private getStoragePrefix(): string {
    return `${github.context.repo.owner}/${github.context.repo.repo}`
  }

  private getStorageKey(key: string): string {
    return `${this.getStoragePrefix()}/${key}`
  }

  private getConnectionArgs(): string[] {
    const sasToken = env.getString('SAS_TOKEN')
    const connectionString = env.getString('CONNECTION_STRING')
    let args = []

    args.push('--account-name', env.getString('ACCOUNT_NAME', { required: true }))

    if (sasToken) {
      args.push('--sas-token', sasToken)
    }
    
    if (connectionString) {
      args.push('--connection-string', connectionString)
    }

    return args
  }

  private invokeContainer(command: 'create', args: string[], capture: boolean = false): execa.ExecaChildProcess<string> {
    return this.invokeAz(['storage', 'container', command, ...args], capture)
  }

  private invokeBlob(command: 'list', args: string[], capture: boolean = false): execa.ExecaChildProcess<string> {
    return this.invokeAz(['storage', 'blob', command, ...args], capture)
  }

  private invokeAz(args: string[], capture: boolean = false): execa.ExecaChildProcess<string> {
    return execa('az', [...args, ...this.getConnectionArgs()], capture ? {} : { stdout: 'inherit', stderr: 'inherit' })
  }

  private async list(): Promise<IBlob[]> {
    let output: string = '[]'
    const containerName = env.getString('CONTAINER_NAME', { required: true })

    try {
      core.info(`Listing keys for ${this.getStoragePrefix()}`)
      output = (await this.invokeBlob('list', ['--container-name', containerName], true)).stdout
    } catch (e) {
      const execaError = e as execa.ExecaError

      if (execaError && execaError.stderr && execaError.stderr.indexOf('ContainerNotFound') >= 0) {
        core.info(`Container not found, creating it now...`)
        await this.invokeContainer('create', ['--name', containerName])
      } else {
        core.error(e)
      }
    }

    return JSON.parse(output)
  }

  private async restore(key: string): Promise<boolean> {
    // const compressionMethod = await utils.getCompressionMethod()
    // const archiveFolder = await utils.createTempDirectory()
    // const archivePath = path.join(archiveFolder, utils.getCacheFileName(compressionMethod))

    // try {
    //   core.info(`Restoring cache from ${this.getStorageKey(key)}`)
    //   await this.invokeS3('cp', [ `s3://${this.getBucketName()}/${this.getStorageKey(key)}`, archivePath])
    // } catch (e) {
    //   core.error(e)
    //   return false
    // }

    // await tar.extractTar(archivePath, compressionMethod)
    return false
  }

  async restoreCache(paths: string[], primaryKey: string, restoreKeys?: string[]): Promise<string | undefined> {
    const searchKeys = concatenateKeys(primaryKey, restoreKeys)
    const content = await this.list()

    for (const blob of content) {
      core.info(`Blob: ${blob.name}, Created: ${blob.creationTime}, Size: ${blob.properties.contentLength}`)
    }

    // for (const searchKey of searchKeys) {
    //   const matches = content.filter((c) => c.key.startsWith(searchKey))

    //   if (matches.length > 0) {
    //     // Exact match
    //     if (matches.some((m) => m.key === searchKey)) {
    //       if (await this.restore(searchKey)) {
    //         return searchKey
    //       }
    //     }

    //     // Prefix match - select most recently created entry
    //     matches.sort((a, b) => b.created.getTime() - a.created.getTime())

    //     if (await this.restore(matches[0].key)) {
    //       return matches[0].key
    //     }
    //   }
    // }

    return undefined
  }

  async saveCache(paths: string[], key: string): Promise<void> {
    // const resolvedPaths = await utils.resolvePaths(paths)
    // const compressionMethod = await utils.getCompressionMethod()
    // const archiveFolder = await utils.createTempDirectory()
    // const archivePath = path.join(archiveFolder, utils.getCacheFileName(compressionMethod))

    // await tar.createTar(archiveFolder, resolvedPaths, compressionMethod)

    // try {
    //   core.info(`Saving cache to ${this.getStorageKey(key)}`)
    //   await this.invokeS3('cp', [archivePath, `s3://${this.getBucketName()}/${this.getStorageKey(key)}`])
    // } catch (e) {
    //   core.error(e)
    // }
  }
}

interface IBlob {
  name: string
  creationTime: Date
  properties: IProperties
}

interface IProperties {
  contentLength: number
}

providers.add('azure', new AzureStorageProvider())
