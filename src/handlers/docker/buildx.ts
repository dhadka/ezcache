import * as core from '@actions/core'
import { handlers } from '../../registry'
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
}

handlers.add('buildx', new DockerBuildX())
