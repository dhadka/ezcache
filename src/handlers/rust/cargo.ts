import { registry } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'
import { CacheHandler } from '../../handler'

class Cargo extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return ['~/.cargo/registry', '~/.cargo/git', 'target']
    }

    async getKey(version?: string): Promise<string> {
        return `${runner.os}-${version}-cargo-${await hashFiles('**/Cargo.lock')}`
    }

    async getRestoreKeys(version?: string): Promise<string[]> {
        return [`${runner.os}-${version}-cargo-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/Cargo.lock')
    }
}

registry.add("cargo", new Cargo())