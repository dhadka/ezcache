import * as core from '@actions/core'
import { handlers } from '../../registry'
import { hashFiles, runner } from '../../expressions'
import { CacheHandler } from '../../handler'
import { inputs } from '../../settings'
import * as fs from 'fs'

const defaultCacheFolder = '.buildx-cache'

class DockerBuildX extends CacheHandler {
  getCachePath(): string {
    return inputs.getString('path', { defaultValue: defaultCacheFolder })
  }

  async getPaths(): Promise<string[]> {
    return [this.getCachePath()]
  }

  async getKeyForRestore(version?: string): Promise<string> {
    return 'buildx-never-match-primary-key'
  }

  async getKeyForSave(version?: string): Promise<string> {
    return `${runner.os}-${version}-buildx-${await hashFiles(this.getCachePath())}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-buildx-`]
  }

  async setup(): Promise<void> {
    fs.mkdirSync(this.getCachePath(), { recursive: true })
  }
}

handlers.add('buildx', new DockerBuildX())
