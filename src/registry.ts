import * as core from '@actions/core'
import { CacheHandler } from './handler'

class Registry {
  handlers = new Map<string, CacheHandler>()

  toCanonicalName(name: string): string {
    return name.toLowerCase()
  }

  add(name: string, handler: CacheHandler) {
    core.debug(`Registering ${name} handler`)
    this.handlers.set(this.toCanonicalName(name), handler)
  }

  getFirst(name: string): CacheHandler | undefined {
    return this.handlers.get(this.toCanonicalName(name))
  }

  contains(name: string) {
    return this.handlers.has(this.toCanonicalName(name))
  }

  async getAll(name: string): Promise<CacheHandler[]> {
    name = this.toCanonicalName(name)

    const result: CacheHandler[] = []

    if (!name || name === 'auto') {
      for (const handler of this.handlers.values()) {
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

export const registry = new Registry()
