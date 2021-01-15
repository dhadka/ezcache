import { handlers } from '../../registry'
import { hashFiles, runner } from '../../expressions'
import { CacheHandler } from '../../handler'
import * as os from 'os'

class Powershell extends CacheHandler {
  async getPaths(): Promise<string[]> {
    switch (runner.os) {
      case 'Windows':
        return ['~/Documents/PowerShell/Modules', process.env['ProgramFiles'] + '/PowerShell/Modules']
      case 'Linux':
      case 'macOS':
        return ['~/.local/share/powershell/Modules', '/usr/local/share/powershell/Modules']
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

handlers.add('powershell', new Powershell())
