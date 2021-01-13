import * as core from '@actions/core'
import { registry } from '../../registry'
import { runner } from '../../expressions'
import { CacheHandler } from '../../handler'
import * as state from '../../state'

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
    const restoredKey = state.readRestoredKey(this)

    if (process.env['UPDATE_CACHE']?.toLowerCase() === 'true' || !restoredKey || restoredKey === '') {
      return `${runner.os}-${version}-env-${Date.now()}`
    } else {
      return restoredKey
    }
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-env-`]
  }
}

registry.add('env', new EnvCache())
