import { saveCache, restoreCache } from '@actions/cache'

export class CacheHandler {
    async getPaths(): Promise<string[]> {
        throw Error('not implemented')
    }

    async getKey(): Promise<string> {
        throw Error('not implemented')
    }

    async getRestoreKeys(): Promise<string[]> {
        return []
    }

    async shouldCache(): Promise<boolean> {
        return false
    }

    async setup(): Promise<void> {

    }

    async saveCache(): Promise<void> {
        const paths = await this.getPaths()
        const key = await this.getKey()

        console.log(`Calling saveCache(${paths}, ${key})`)
        //await saveCache(paths, key)
    }

    async restoreCache(): Promise<void> {
        const paths = await this.getPaths()
        const key = await this.getKey()
        const restoreKeys = await this.getRestoreKeys()

        console.log(`Calling restoreCache(${paths}, ${key}, ${restoreKeys})`)
        //await restoreCache(paths, key, restoreKeys)
    }
}

class Registry {
    handlers = new Map<string, CacheHandler>()

    toCanonicalName(name: string): string {
        return name.toLowerCase()
    }

    all(): IterableIterator<CacheHandler> {
        return this.handlers.values()
    }

    add(name: string, handler: CacheHandler) {
        console.log(`Registering ${name} with ${typeof handler}`)
        this.handlers.set(this.toCanonicalName(name), handler)
    }

    get(name: string): CacheHandler | undefined {
        return this.handlers.get(this.toCanonicalName(name))
    }

    contains(name: string) {
        return this.handlers.has(this.toCanonicalName(name))
    }
}

export const registry = new Registry()