import * as core from '@actions/core'
import { registry } from '../../registry'
import { hashFiles, runner } from '../../expressions'
import { CacheHandler } from '../../handler'
import * as fs from 'fs'

const defaultCacheFolder = '.buildx-cache'

class DockerBuildX extends CacheHandler {
  getCachePath(): string {
    return core.getInput('path') ?? defaultCacheFolder
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

registry.add('buildx', new DockerBuildX())
