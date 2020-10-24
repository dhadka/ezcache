import { registry } from '../../registry'
import { hashFiles, runner, matches } from '../../expressions'
import { CacheHandler } from '../../handler'

class Pip extends CacheHandler {
  async getPaths(): Promise<string[]> {
    switch (runner.os) {
      case 'Windows':
        return ['~AppDataLocalpipCache']
      case 'Linux':
        return ['~/.cache/pip']
      case 'macOS':
        return ['~/Library/Caches/pip']
    }
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-pip-${await hashFiles('**/requirements.txt')}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-pip-`]
  }

  async shouldCache(): Promise<boolean> {
    return await matches('**/requirements.txt')
  }
}

registry.add('pip', new Pip())
