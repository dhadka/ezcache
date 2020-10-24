import { saveCache, restoreCache } from '@actions/cache'
import * as state from './state'

export interface ICacheOptions {
    version?: string
}

export enum RestoreType {
    Miss,
    Partial,
    Full
}

export interface IRestoreResult {
    type: RestoreType
    restoredKey: string | undefined
}

export class CacheHandler {
    recomputeKey: boolean

    constructor() {
        this.recomputeKey = false
    }

    async getPaths(): Promise<string[]> {
        throw Error('not implemented')
    }

    async getKey(version?: string): Promise<string> {
        throw Error('not implemented')
    }

    async getRestoreKeys(version?: string): Promise<string[]> {
        return []
    }

    async shouldCache(): Promise<boolean> {
        return false
    }

    async setup(): Promise<void> {

    }

    async saveCache(options?: ICacheOptions): Promise<void> {
        const paths = await this.getPaths()
        const key = this.recomputeKey? await this.getKey(options?.version) : state.readPrimaryKey(this)
        const restoredKey = state.readRestoredKey(this)

        if (key === restoredKey) {
            console.log(`Cache hit on primary key '${key}', skip saving cache`)
        } else {
            console.log(`Calling saveCache('${paths}', '${key}')`)
            await saveCache(paths, key)
        }
    }

    async restoreCache(options?: ICacheOptions): Promise<IRestoreResult> {
        const paths = await this.getPaths()
        const key = await this.getKey(options?.version)
        const restoreKeys = await this.getRestoreKeys(options?.version)

        console.log(`Calling restoreCache('${paths}', '${key}', ${restoreKeys})`)
        const restoredKey = await restoreCache(paths, key, restoreKeys)

        state.savePrimaryKey(this, key)
        state.addHandler(this)

        if (restoredKey) {
            state.saveRestoredKey(this, restoredKey ?? '')
        }

        return {
            type: restoredKey ? (key === restoredKey ? RestoreType.Full : RestoreType.Partial) : RestoreType.Miss,
            restoredKey: restoredKey
        }
    }
}