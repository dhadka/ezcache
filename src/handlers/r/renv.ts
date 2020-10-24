import { registry } from '../../registry'
import { hashFiles, runner, matches } from '../../expressions'
import { CacheHandler } from '../../handler'

class REnv extends CacheHandler {
    async getPaths(): Promise<string[]> {
        switch (runner.os) {
            case 'Windows':
                return ['~\AppData\Local\renv']
            case 'Linux':
                return ['~/.local/share/renv']
            case 'macOS':
                return ['~/Library/Application Support/renv']
        }
    }

    async getKey(version?: string): Promise<string> {
        return `${runner.os}-${version}-renv-${await hashFiles('**/renv.lock')}`
    }

    async getRestoreKeys(version?: string): Promise<string[]> {
        return [`${runner.os}-${version}-renv-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/renv.lock')
    }
}

registry.add("renv", new REnv())