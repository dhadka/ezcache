import { registry, CacheHandler } from '../../registry'
import { hashFiles, exec, runner, matches } from '../../expressions'

class Pip extends CacheHandler {
    async getPaths(): Promise<string[]> {
        switch (runner.os) {
            case 'Windows':
                return ['~\AppData\Local\pip\Cache']
            case 'Linux':
                return ['~/.cache/pip']
            case 'macOS':
                return ['~/Library/Caches/pip']
        }
    }

    async getKey(): Promise<string> {
        return `${runner.os}-pip-${await hashFiles('**/requirements.txt')}`
    }

    async getRestoreKeys(): Promise<string[]> {
        return [`${runner.os}-pip-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/requirements.txt')
    }
}

registry.add("pip", new Pip())