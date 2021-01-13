import { registry } from '../../registry'
import { hashFiles, runner, matches } from '../../expressions'
import { CacheHandler } from '../../handler'

class Powershell extends CacheHandler {
  async getPaths(): Promise<string[]> {
    switch (runner.os) {
      case 'Windows':
        return ['~DocumentsPowerShellModules']
      case 'Linux':
      case 'macOS':
        return ['~/.local/share/powershell/Modules']
    }
  }

  async getKeyForRestore(version?: string): Promise<string> {
    return `powershell-never-match-primary-key`
  }

  async getKeyForSave(version?: string): Promise<string> {
    return `${runner.os}-${version}-powershell-${await hashFiles(await this.getPaths())}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-powershell-`]
  }
}

registry.add('powershell', new Powershell())
