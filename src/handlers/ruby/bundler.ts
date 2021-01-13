import { handlers } from '../../registry'
import { hashFiles, exec, matches, runner } from '../../expressions'
import { CacheHandler } from '../../handler'

class Bundler extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return ['vendor/bundle']
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-gems-${await hashFiles('**/Gemfile.lock')}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-gems-`]
  }

  async shouldCache(): Promise<boolean> {
    return await matches('**/Gemfile.lock')
  }

  async setup(): Promise<void> {
    await exec('bundle', 'config', 'path', 'vendor/bundle')
  }
}

handlers.add('bundler', new Bundler())
