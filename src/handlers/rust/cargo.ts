import { registry, CacheHandler } from '../../registry'
import { hashFiles, exec, matches, runner } from '../../expressions'

class Cargo extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return ['~/.cargo/registry', '~/.cargo/git', 'target']
    }

    async getKey(): Promise<string> {
        return `${runner.os}-cargo-${await hashFiles('**/Cargo.lock')}`
    }

    async getRestoreKeys(): Promise<string[]> {
        return [`${runner.os}-cargo-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/Cargo.lock')
    }
}

registry.add("cargo", new Cargo())