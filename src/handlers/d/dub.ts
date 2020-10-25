import { registry } from '../../registry'
import { hashFiles, runner, matches } from '../../expressions'
import { CacheHandler } from '../../handler'

class Dub extends CacheHandler {
  async getPaths(): Promise<string[]> {
    switch (runner.os) {
      case 'Windows':
        return ['~/AppData/Local/dub']
      case 'Linux':
        return ['~/.dub']
      case 'macOS':
        return ['~/.dub']
    }
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-dub-${await hashFiles('**/dub.json')}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-dub-`]
  }

  async shouldCache(): Promise<boolean> {
    return await matches('**/dub.json')
  }
}

registry.add('dub', new Dub())
