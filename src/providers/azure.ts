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
    args.push('--container-name', env.getString('CONTAINER_NAME', { required: true }))

    if (sasToken) {
      args.push('--sas-token', sasToken)
    }
    
    if (connectionString) {
      args.push('--connection-string', connectionString)
    }

    return args
  }

  private invokeAz(command: 'list', args: string[], capture: boolean = false): execa.ExecaChildProcess<string> {
    const expandedArgs = ['az', 'storage', 'blob', command, ...this.getConnectionArgs(), ...args]

    return execa('az', expandedArgs, capture ? {} : { stdout: 'inherit', stderr: 'inherit' })
  }

  private async list(): Promise<IEntry[]> {
    let output: string = ''

    try {
      core.info(`Listing keys for ${this.getStoragePrefix()}`)
      output = (await this.invokeAz('list', [], true)).stdout
    } catch (e) {
      const execaError = e as execa.ExecaError

      if (execaError) {
        if (execaError.stderr.indexOf('ContainerNotFound') >= 0) {
          core.info(`Container not found, creating it now...`)
          //await this.invokeAzCopy('make', [`https://${this.getStorageAccountName()}.blob.core.windows.net/${this.getContainerName()}/${this.getSasToken()}`])
        } else {
          core.error(e)
        }
      } else {
        core.error(e)
      }
    }

    // Each line in output contains four columns:
    //   <date> <time> <size> <object_name>
    // Lines with prefixes contain a different number of columns, which we exclude.
    // return output
    //   .split('\n')
    //   .map((s) => s.startsWith("INFO: ") ? s.substring(0, 6) : s)
    //   .map((s) => s.split(/;/, 2))
    //   .filter((a) => a.length == 2)
    //   .map<IEntry>((a) => {
    //     return { key: a[3], size: parseInt(a[2]), created: new Date(`${a[0]} ${a[1]}`) }
    //   })
    return []
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

interface IEntry {
  key: string
  size: number
  created: Date
}

providers.add('azure', new AzureStorageProvider())
