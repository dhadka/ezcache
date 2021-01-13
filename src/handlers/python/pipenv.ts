import { handlers } from '../../registry'
import { hashFiles, runner, matches } from '../../expressions'
import { CacheHandler } from '../../handler'

class PipEnv extends CacheHandler {
  getPythonVersion(): string {
    return process.env['PYTHON_VERSION'] || 'undef'
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
