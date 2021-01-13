export abstract class StorageProvider {
  abstract restoreCache(paths: string[], primaryKey: string, restoreKeys?: string[]): Promise<string | undefined>

  abstract saveCache(paths: string[], key: string): Promise<void>
}
