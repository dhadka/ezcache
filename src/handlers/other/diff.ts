import * as core from '@actions/core'
import { registry } from '../../registry'
import { hashFiles, runner } from '../../expressions'
import { CacheHandler } from '../../handler'

/**
 * Caches an arbitrary path (or paths), creating a new cache whenever the contents
 * change.  By design, this will never have an exact match during restore.  Instead,
 * this relies on the caching service returning the last created cache matching the
 * restore keys.
 */
class DiffCache extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return core
      .getInput('path')
      .split('\n')
      .map((s) => s.trim())
  }

  async getKeyForRestore(version?: string): Promise<string> {
    return `diff-no-match-primary-key`
  }

  async getKeyForSave(version?: string): Promise<string> {
    return `${runner.os}-${version}-diff-${await hashFiles(await this.getPaths())}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-diff-`]
  }
}

registry.add('diff', new DiffCache())
