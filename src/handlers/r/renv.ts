import { handlers } from '../../registry'
import { hashFiles, runner, matches } from '../../expressions'
import { CacheHandler } from '../../handler'

class REnv extends CacheHandler {
  async getPaths(): Promise<string[]> {
    switch (runner.os) {
      case 'Windows':
        return ['~AppDataLocal\renv']
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

handlers.add('renv', new REnv())
