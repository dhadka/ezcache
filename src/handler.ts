import * as core from '@actions/core'
import { StorageProvider } from './provider'
import { HostedStorageProvider } from './providers/hosted'
import { LocalStorageProvider } from './providers/local'
import * as state from './state'

export interface ICacheOptions {
  version?: string
  provider?: string
}

export enum RestoreType {
  Miss,
  Partial,
  Full,
}

export interface IRestoreResult {
  type: RestoreType
  restoredKey: string | undefined
}

export abstract class CacheHandler {
  abstract getPaths(): Promise<string[]>

  async getKey(version?: string): Promise<string> {
    throw new Error('Not implemented')
  }

  async getKeyForRestore(version?: string): Promise<string> {
    return this.getKey(version)
  }

  async getKeyForSave(version?: string): Promise<string> {
    core.debug(`PrimaryKey: ${state.readPrimaryKey(this)}`)
    return state.readPrimaryKey(this) ?? this.getKey(version)
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return []
  }

  async shouldCache(): Promise<boolean> {
    return false
  }

  async setup(): Promise<void> {}

  getStorageProvider(options?: ICacheOptions): StorageProvider {
    // TODO: Make this extensible
    if (!options?.provider || options?.provider === 'hosted') {
      return new HostedStorageProvider()
    } else if (options?.provider === 'local') {
      return new LocalStorageProvider()
    } else {
      throw Error(`Provider not recognized: ${options?.provider}`)
    }
  }

  async saveCache(options?: ICacheOptions): Promise<void> {
    const paths = await this.getPaths()
    const key = await this.getKeyForSave(options?.version)
    const restoredKey = state.readRestoredKey(this)

    core.debug(`Paths: ${paths}`)
    core.debug(`Key: ${key}`)
    core.debug(`RestoredKey: ${restoredKey}`)

    if (key === restoredKey) {
      core.info(`Cache hit on primary key '${key}', skip saving cache`)
    } else {
      const storageProvider = this.getStorageProvider(options)
      core.info(`Calling saveCache('${paths}', '${key}') using ${storageProvider.constructor.name}`)

      await storageProvider.saveCache(paths, key)
    }
  }

  async restoreCache(options?: ICacheOptions): Promise<IRestoreResult> {
    const paths = await this.getPaths()
    const key = await this.getKeyForRestore(options?.version)
    const restoreKeys = await this.getRestoreKeys(options?.version)
    const storageProvider = this.getStorageProvider(options)

    core.info(`Calling restoreCache('${paths}', '${key}', ${restoreKeys}) using ${storageProvider.constructor.name}`)
    const restoredKey = await storageProvider.restoreCache(paths, key, restoreKeys)

    state.savePrimaryKey(this, key)
    state.addHandler(this)

    if (restoredKey) {
      core.info(`Restored cache with key '${restoredKey}'`)
      state.saveRestoredKey(this, restoredKey)
    }

    return {
      type: restoredKey ? (key === restoredKey ? RestoreType.Full : RestoreType.Partial) : RestoreType.Miss,
      restoredKey: restoredKey,
    }
  }
}
