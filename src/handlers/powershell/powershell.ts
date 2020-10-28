import { registry } from '../../registry'
import { hashFiles, runner, matches } from '../../expressions'
import { CacheHandler } from '../../handler'

class Powershell extends CacheHandler {
  async getPaths(): Promise<string[]> {
    switch (runner.os) {
      case 'Windows':
        return ['~\Documents\PowerShell\Modules']
      case 'Linux':
        return ['~/.local/share/powershell/Modules']
      case 'macOS':
        return ['~/.local/share/powershell/Modules']
    }
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-powershell-${await hashFiles(await this.getPaths())}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-powershell-`]
  }
}

registry.add('powershell', new Powershell())
