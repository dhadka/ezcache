import { registry, CacheHandler } from '../../registry'
import { hashFiles, exec, matches, runner } from '../../expressions'

class Bundler extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return ['vendor/bundle']
    }

    async getKey(): Promise<string> {
        return `${runner.os}-gems-${await hashFiles('**/Gemfile.lock')}`
    }

    async getRestoreKeys(): Promise<string[]> {
        return [`${runner.os}-gems-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/Gemfile.lock')
    }

    async setup(): Promise<void> {
        await exec('bundle', 'config', 'path', 'vendor/bundle')
    }
}

registry.add("bundler", new Bundler())