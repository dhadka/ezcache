import { handlers } from '../../registry'
import { hashFiles, runner, matches } from '../../expressions'
import { CacheHandler } from '../../handler'
import { env } from '../../settings'

class PipEnv extends CacheHandler {
  getPythonVersion(): string {
    return env.getString('PYTHON_VERSION', { defaultValue: 'undefined' })
  }

  async getPaths(): Promise<string[]> {
    return ['~/.local/share/virtualenvs']
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-${this.getPythonVersion()}-pipenv-${await hashFiles('Pipfile.lock')}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-${this.getPythonVersion()}-pipenv-`]
  }

  async shouldCache(): Promise<boolean> {
    return await matches('Pipfile.lock')
  }
}

handlers.add('pipenv', new PipEnv())
