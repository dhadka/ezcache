import * as core from '@actions/core'
import { registry } from '../../registry'
import { runner } from '../../expressions'
import { CacheHandler } from '../../handler'

/**
 * Creates a cache of an arbitrary path (or paths) that updates once a day.
 */
class DailyCache extends CacheHandler {
  private today: Date

  constructor() {
    super()
    this.today = new Date()
  }

  async getPaths(): Promise<string[]> {
    return core
      .getInput('path')
      .split('\n')
      .map((s) => s.trim())
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-daily-${this.today.getFullYear()}-${this.today.getMonth()}-${this.today.getDate()}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [
      `${runner.os}-${version}-daily-${this.today.getFullYear()}-${this.today.getMonth()}-`,
      `${runner.os}-${version}-daily-${this.today.getFullYear()}-`,
      `${runner.os}-${version}-daily-`,
    ]
  }
}

registry.add('daily', new DailyCache())
