import * as core from '@actions/core'
import { handlers } from '../../registry'
import { runner } from '../../expressions'
import { CacheHandler } from '../../handler'
import { env } from '../../settings'

/**
 * Creates a new cache when an environment variable changes.  This works by
 * appending a unique value, such as the current time (yes, this is not guaranteed
 * to be unique but should be good enough), to the key when the UPDATE_CACHE
 * env var is set to 'true'.
 */
class EnvCache extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return core
      .getInput('path')
      .split('\n')
      .map((s) => s.trim())
  }

  async getKeyForRestore(version?: string): Promise<string> {
    return `env-never-match-primary-key`
  }

  async getKeyForSave(version?: string): Promise<string> {
    const restoredKey = this.readRestoredKey()

    if (env.getBoolean('UPDATE_CACHE') || !restoredKey || restoredKey === '') {
      return `${runner.os}-${version}-env-${Date.now()}`
    } else {
      return restoredKey
    }
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-env-`]
  }
}

handlers.add('env', new EnvCache())
