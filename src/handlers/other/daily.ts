import * as core from '@actions/core'
import { handlers } from '../../registry'
import { runner } from '../../expressions'
import { CacheHandler } from '../../handler'

/**
 * Creates a cache that updates once a day.
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

  private formatYear(): string {
    return this.today.getUTCFullYear().toString()
  }

  private formatMonth(): string {
    return (this.today.getUTCMonth() + 1).toString().padStart(2, '0')
  }

  private formatDay(): string {
    return this.today.getUTCDate().toString().padStart(2, '0')
  }

  async getKey(version?: string): Promise<string> {
    // prettier-ignore
    return `${runner.os}-${version}-daily-${this.formatYear()}-${this.formatMonth()}-${this.formatDay()}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [
      `${runner.os}-${version}-daily-${this.formatYear()}-${this.formatMonth()}-`,
      `${runner.os}-${version}-daily-${this.formatYear()}-`,
      `${runner.os}-${version}-daily-`,
    ]
  }
}

handlers.add('daily', new DailyCache())
