import * as core from '@actions/core'
import { handlers } from '../../registry'
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
    // prettier-ignore
    return `${runner.os}-${version}-daily-${this.today.getUTCFullYear()}-${this.today.getUTCMonth() + 1}-${this.today.getUTCDate()}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [
      `${runner.os}-${version}-daily-${this.today.getUTCFullYear()}-${this.today.getUTCMonth() + 1}-`,
      `${runner.os}-${version}-daily-${this.today.getUTCFullYear()}-`,
      `${runner.os}-${version}-daily-`,
    ]
  }
}

handlers.add('daily', new DailyCache())
