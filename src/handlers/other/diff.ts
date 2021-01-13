import * as core from '@actions/core'
import { handlers } from '../../registry'
import { hashFiles, runner } from '../../expressions'
import { CacheHandler } from '../../handler'

/**
 * Caches an arbitrary path (or paths), creating a new cache whenever the contents
 * change.  By design, this will never have an exact match during restore.  Instead,
 * it restores the last created cache on the current branch.
 */
class DiffCache extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return core
      .getInput('path')
      .split('\n')
      .map((s) => s.trim())
  }

  async getKeyForRestore(version?: string): Promise<string> {
    return `diff-never-match-primary-key`
  }

  async getKeyForSave(version?: string): Promise<string> {
    return `${runner.os}-${version}-diff-${await hashFiles(await this.getPaths())}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-diff-`]
  }
}

handlers.add('diff', new DiffCache())
