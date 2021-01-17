import { handlers } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'
import { CacheHandler } from '../../handler'

class Cargo extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return ['~/.cargo/bin', '~/.cargo/registry/index', '~/.cargo/registry/cache', '~/.cargo/git/db', 'target']
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-cargo-${await hashFiles(['**/Cargo.lock', '**/Cargo.toml'])}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-cargo-`]
  }

  async shouldCache(): Promise<boolean> {
    return await matches(['**/Cargo.lock', '**/Cargo.toml'])
  }
}

handlers.add('cargo', new Cargo())
