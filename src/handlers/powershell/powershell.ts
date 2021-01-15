import * as core from '@actions/core'
import * as execa from 'execa'
import * as crypto from 'crypto'
import { handlers } from '../../registry'
import { runner } from '../../expressions'
import { CacheHandler, ICacheOptions, IRestoreResult, RestoreType } from '../../handler'

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

  getModules(): string[] {
    const modules = core.getInput('modules')

    if (!modules) {
      throw Error('Powershell caches require the module input')
    }

    return modules.split(/\s*,\s*|\s+/).sort()
  }

  getHash(): string {
    const hash = crypto.createHash('sha256')
    hash.update(this.getModules().join(','))
    return hash.digest().toString()
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-powershell-${this.getHash()}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-powershell-`]
  }

  async restoreCache(options?: ICacheOptions): Promise<IRestoreResult> {
    const result = await super.restoreCache(options)

    if (result.type !== RestoreType.Full) {
      core.info('Installing powershell modules')

      // prettier-ignore
      await execa(
        'PowerShell',
        [
          '-Command',
          `Set-PSRepository PSGallery -InstallationPolicy Trusted; Install-Module ${this.getModules().join(',',)} -ErrorAction Stop`,
        ],
        { stdout: 'inherit', stderr: 'inherit' },
      )
    }

    return result
  }
}

handlers.add('powershell', new Powershell())
