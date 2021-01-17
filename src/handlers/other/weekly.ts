import * as core from '@actions/core'
import { handlers } from '../../registry'
import { runner } from '../../expressions'
import { CacheHandler } from '../../handler'

/**
 * Creates a cache that updates once a week.  Monday is considered the first day of the week.
 */
class WeeklyCache extends CacheHandler {
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

  private formatWeekOfYear(): string {
    const date = new Date(Date.UTC(this.today.getFullYear(), this.today.getMonth(), this.today.getDate()))
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))

    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
    const weekNumber = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)

    return weekNumber.toString().padStart(2, '0')
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-weekly-${this.formatYear()}-${this.formatWeekOfYear()}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-weekly-${this.formatYear()}-`, `${runner.os}-${version}-weekly-`]
  }
}

handlers.add('weekly', new WeeklyCache())
