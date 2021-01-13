import * as core from '@actions/core'
import { CacheHandler } from './handler'
import { StorageProvider } from './provider'

abstract class Registry<T> {
  mapping = new Map<string, T>()

  toCanonicalName(name: string): string {
    return name.toLowerCase()
  }

  add(name: string, value: T) {
    core.debug(`Registering ${name} with ${this.constructor.name}`)
    this.mapping.set(this.toCanonicalName(name), value)
  }

  getFirst(name: string): T | undefined {
    return this.mapping.get(this.toCanonicalName(name))
  }

  contains(name: string): boolean {
    return this.mapping.has(this.toCanonicalName(name))
  }
}

class CacheHandlerRegistry extends Registry<CacheHandler> {
  async getAll(name: string): Promise<CacheHandler[]> {
    name = this.toCanonicalName(name)

    const result: CacheHandler[] = []

    if (!name || name === 'auto') {
      for (const handler of this.mapping.values()) {
        if (await handler.shouldCache()) {
          result.push(handler)
        }
      }
    } else {
      const handler = this.getFirst(name)

      if (handler) {
        result.push(handler)
      }
    }

    return result
  }
}

class StorageProviderRegistry extends Registry<StorageProvider> {

}

export const handlers = new CacheHandlerRegistry()
export const providers = new StorageProviderRegistry()
