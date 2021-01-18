import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as execa from 'execa'
import { handlers } from '../../registry'
import { runner, hashFiles } from '../../expressions'
import { CacheHandler, ICacheOptions, IRestoreResult, RestoreType } from '../../handler'
import { inputs } from '../../settings'

/**
 * Create caches based on an install script.  To use this cache type:
 *
 *   1. Create a script (with execute permissions) that installs the dependencies.
 *
 *   2. Specify the path, or paths, needed to cache the installed dependencies.
 *
 * On a cache miss, this handler will run the script and save the cache.  On a cache hit,
 * this handler will restore the cached files and skip running the script.
 *
 * A new cache is created whenever the script file changes.
 */
class InstallScriptCache extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return core
      .getInput('path')
      .split('\n')
      .map((s) => s.trim())
  }

  private getScript(): string {
    return inputs.getString('script', { required: true })
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-script-${await hashFiles(this.getScript())}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-script-`]
  }

  async restoreCache(options?: ICacheOptions): Promise<IRestoreResult> {
    const result = await super.restoreCache(options)

    if (result.type !== RestoreType.Full) {
      let script = this.getScript()

      if (fs.existsSync(script)) {
        // Get the full path (Linux / MacOS need a path segment before the filename)
        script = path.resolve(script)
      } else {
        throw Error(`Script not found: ${script}`)
      }

      core.info(`Invoking installation script ${script}`)
      await execa(script, [], { stdout: 'inherit', stderr: 'inherit' })
    }

    return result
  }
}

handlers.add('script', new InstallScriptCache())
