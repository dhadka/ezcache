import * as core from '@actions/core'
import { providers } from './registry'
import { StorageProvider } from './provider'
import { state } from './settings'

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

enum State {
  RestoredKey = 'RestoredKey',
  PrimaryKey = 'PrimaryKey',
  CacheHandlers = 'CacheHandlers',
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
    core.debug(`PrimaryKey: ${this.readPrimaryKey()}`)
    return this.readPrimaryKey() || this.getKey(version)
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return []
  }

  async shouldCache(): Promise<boolean> {
    return false
  }

  async setup(): Promise<void> {}

  private getScopedStateKey(name: string) {
    return `${this.constructor.name}-${name}`
  }

  protected saveRestoredKey(value: string) {
    state.setString(this.getScopedStateKey(State.RestoredKey), value)
  }

  protected savePrimaryKey(value: string) {
    state.setString(this.getScopedStateKey(State.PrimaryKey), value)
  }

  protected addHandler() {
    const handlers = this.readHandlers()
    handlers.push(this.constructor.name)
    state.setString(State.CacheHandlers, handlers.join(','))
  }

  protected readRestoredKey(): string {
    return state.getString(this.getScopedStateKey(State.RestoredKey))
  }

  protected readPrimaryKey(): string {
    return state.getString(this.getScopedStateKey(State.PrimaryKey))
  }

  protected readHandlers(): string[] {
    return state.getString(State.CacheHandlers).split(',')
  }

  getStorageProvider(options?: ICacheOptions): StorageProvider {
    const name = options?.provider || 'hosted'
    const provider = providers.getFirst(name)

    if (!provider) {
      throw Error(`No provider found for ${name}`)
    }

    core.info(`Using ${provider.constructor.name}`)
    return provider
  }

  async saveCache(options?: ICacheOptions): Promise<void> {
    const paths = await this.getPaths()
    const key = await this.getKeyForSave(options?.version)
    const restoredKey = this.readRestoredKey()

    if (key === restoredKey) {
      core.info(`Cache hit on primary key '${key}', skip saving cache`)
    } else {
      const storageProvider = this.getStorageProvider(options)
      core.info(`Calling saveCache('${paths}', '${key}')`)

      await storageProvider.saveCache(paths, key)
    }
  }

  async restoreCache(options?: ICacheOptions): Promise<IRestoreResult> {
    const paths = await this.getPaths()
    const key = await this.getKeyForRestore(options?.version)
    const restoreKeys = await this.getRestoreKeys(options?.version)
    const storageProvider = this.getStorageProvider(options)

    core.info(`Calling restoreCache('${paths}', '${key}', [${restoreKeys.map((s) => `'${s}'`).join(', ')}])`)

    const restoredKey = await storageProvider.restoreCache(paths, key, restoreKeys)

    this.savePrimaryKey(key)
    this.addHandler()

    if (restoredKey) {
      core.info(`Restored cache with key '${restoredKey}'`)
      this.saveRestoredKey(restoredKey)
    }

    return {
      type: restoredKey ? (key === restoredKey ? RestoreType.Full : RestoreType.Partial) : RestoreType.Miss,
      restoredKey: restoredKey,
    }
  }
}
