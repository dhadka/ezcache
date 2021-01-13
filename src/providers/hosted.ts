import * as core from '@actions/core'
import { saveCache, restoreCache, ReserveCacheError } from '@actions/cache'
import { StorageProvider } from '../provider'

/**
 * Stores cache content using the GitHub Actions Cache.
 */
export class HostedStorageProvider extends StorageProvider {
  async restoreCache(paths: string[], primaryKey: string, restoreKeys?: string[]): Promise<string | undefined> {
    return await restoreCache(paths, primaryKey, restoreKeys)
  }

  async saveCache(paths: string[], key: string): Promise<void> {
    try {
      await saveCache(paths, key)
    } catch (error) {
      if (error instanceof ReserveCacheError) {
        core.info(`Cache already exists, skip saving cache`)
      } else {
        throw error
      }
    }
  }
}
