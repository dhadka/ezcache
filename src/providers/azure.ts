import * as tar from '@actions/cache/lib/internal/tar'
import * as utils from '@actions/cache/lib/internal/cacheUtils'
import * as core from '@actions/core'
import * as github from '@actions/github'
import * as path from 'path'
import * as execa from 'execa'
import { providers } from '../registry'
import { StorageProvider } from '../provider'
import { concatenateKeys } from '../utils'
import { env } from '../settings'

/**
 * Stores cache content in an Azure blob container.  This uses the Azure CLI (az) for all
 * of the storage operations.  Each cache is stored as a compressed tar to the path
 *
 *   https://<account_name>.blob.core.windows.net/<container_name>/<owner>/<repo>/<key>
 */
class AzureStorageProvider extends StorageProvider {
  private getStoragePrefix(): string {
    return `${github.context.repo.owner}/${github.context.repo.repo}`
  }

  private getStorageKey(key: string): string {
    return `${this.getStoragePrefix()}/${key}`
  }

  private getContainerName(): string {
    return env.getString('CONTAINER_NAME', { required: true })
  }

  private getConnectionArgs(): string[] {
    const sasToken = env.getString('SAS_TOKEN')
    const connectionString = env.getString('CONNECTION_STRING')
    const accountKey = env.getString('ACCOUNT_KEY')
    let args = []

    args.push('--account-name', env.getString('ACCOUNT_NAME', { required: true }))

    if (sasToken) {
      args.push('--sas-token', sasToken)
    }

    if (connectionString) {
      args.push('--connection-string', connectionString)
    }

    if (accountKey) {
      args.push('--account-key', accountKey)
    }

    return args
  }

  private invokeContainer(
    command: 'create',
    args: string[],
    capture: boolean = false,
  ): execa.ExecaChildProcess<string> {
    return this.invokeAz(['storage', 'container', command, ...args], capture)
  }

  private invokeBlob(
    command: 'list' | 'download' | 'upload',
    args: string[],
    capture: boolean = false,
  ): execa.ExecaChildProcess<string> {
    return this.invokeAz(['storage', 'blob', command, ...args], capture)
  }

  private invokeAz(args: string[], capture: boolean = false): execa.ExecaChildProcess<string> {
    return execa('az', [...args, ...this.getConnectionArgs()], capture ? {} : { stdout: 'inherit', stderr: 'inherit' })
  }

  private async list(): Promise<IBlob[]> {
    let output: string = '[]'
    const containerName = this.getContainerName()
    const storagePrefix = this.getStoragePrefix()

    try {
      core.info(`Listing keys for ${storagePrefix}`)
      output = (await this.invokeBlob('list', ['--container-name', containerName, '--prefix', storagePrefix], true))
        .stdout
    } catch (e) {
      const execaError = e as execa.ExecaError

      if (execaError && execaError.stderr && execaError.stderr.indexOf('ContainerNotFound') >= 0) {
        core.info(`Container ${containerName} not found, creating it now...`)
        await this.invokeContainer('create', ['--name', containerName])
      } else {
        core.error(e)
      }
    }

    // remove the '<owner>/<repo>/' portion of the name
    const result: IBlob[] = JSON.parse(output)

    for (const blob of result) {
      blob.name = blob.name.substring(storagePrefix.length + 1)
    }

    return result
  }

  private async restore(key: string): Promise<boolean> {
    const compressionMethod = await utils.getCompressionMethod()
    const archiveFolder = await utils.createTempDirectory()
    const archivePath = path.join(archiveFolder, utils.getCacheFileName(compressionMethod))

    try {
      core.info(`Restoring cache from ${this.getStorageKey(key)}`)
      await this.invokeBlob('download', [
        '--container-name',
        this.getContainerName(),
        '--name',
        this.getStorageKey(key),
        '--file',
        archivePath,
      ])
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
      const matches = content.filter((c) => c.name.startsWith(searchKey))

      if (matches.length > 0) {
        // Exact match
        if (matches.some((m) => m.name === searchKey)) {
          if (await this.restore(searchKey)) {
            return searchKey
          }
        }

        // Prefix match - select most recently created entry
        matches.sort((a, b) => b.properties.creationTime.getTime() - a.properties.creationTime.getTime())

        if (await this.restore(matches[0].name)) {
          return matches[0].name
        }
      }
    }

    return undefined
  }

  async saveCache(paths: string[], key: string): Promise<void> {
    const resolvedPaths = await utils.resolvePaths(paths)
    const compressionMethod = await utils.getCompressionMethod()
    const archiveFolder = await utils.createTempDirectory()
    const archivePath = path.join(archiveFolder, utils.getCacheFileName(compressionMethod))

    await tar.createTar(archiveFolder, resolvedPaths, compressionMethod)

    try {
      core.info(`Saving cache to ${this.getStorageKey(key)}`)
      await this.invokeBlob('upload', [
        '--container-name',
        this.getContainerName(),
        '--name',
        this.getStorageKey(key),
        '--file',
        archivePath,
      ])
    } catch (e) {
      core.error(e)
    }
  }
}

interface IBlob {
  name: string
  properties: IProperties
}

interface IProperties {
  contentLength: number
  creationTime: Date
}

providers.add('azure', new AzureStorageProvider())
