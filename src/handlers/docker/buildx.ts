import * as core from '@actions/core'
import { handlers } from '../../registry'
import { ICacheOptions, IRestoreResult } from '../../handler'
import { DiffCache } from '../other/diff'
import * as fs from 'fs'

const defaultCacheFolder = '.buildx-cache'

class DockerBuildX extends DiffCache {
  getCachePath(): string {
    return core.getInput('path') || defaultCacheFolder
  }

  async getPaths(): Promise<string[]> {
    return [this.getCachePath()]
  }

  async setup(): Promise<void> {
    fs.mkdirSync(this.getCachePath(), { recursive: true })
  }

  private extendVersion(options?: ICacheOptions): ICacheOptions {
    if (options) {
      options.version = options.version ? `${options.version}-buildx` : 'buildx'
      return options
    } else {
      return { version: 'buildx' }
    }
  }

  async saveCache(options?: ICacheOptions): Promise<void> {
    await super.saveCache(this.extendVersion(options))
  }

  async restoreCache(options?: ICacheOptions): Promise<IRestoreResult> {
    return await super.restoreCache(this.extendVersion(options))
  }
}

handlers.add('buildx', new DockerBuildX())
