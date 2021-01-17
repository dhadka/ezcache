import * as core from '@actions/core'
import * as os from 'os'
import * as path from 'path'
import * as execa from 'execa'
import * as crypto from 'crypto'
import { handlers } from '../../registry'
import { runner } from '../../expressions'
import { CacheHandler, ICacheOptions, IRestoreResult, RestoreType } from '../../handler'

/**
 * Installs and caches powershell modules.
 */
class Powershell extends CacheHandler {
  async getPaths(): Promise<string[]> {
    const installationPath = this.getModuleInstallPath()
    return this.getModules().map((module) => path.join(installationPath, module))
  }

  getModuleInstallPath(): string {
    switch (runner.os) {
      case 'Windows':
        return os.homedir() + '\\Documents\\WindowsPowerShell\\Modules'
      case 'Linux':
      case 'macOS':
        return '~/.local/share/powershell/Modules'
    }
  }

  getModules(): string[] {
    const modules = core.getInput('modules')

    if (!modules) {
      throw Error('Missing input: modules')
    }

    return modules.split(/\s*,\s*|\s+/).sort()
  }

  getHash(): string {
    const hash = crypto.createHash('sha256')
    hash.update(this.getModules().join(','))
    return hash.digest('hex')
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
          `Set-PSRepository PSGallery -InstallationPolicy Trusted; Install-Module ${this.getModules().join(',')} -Scope CurrentUser -ErrorAction Stop`,
        ],
        { stdout: 'inherit', stderr: 'inherit' },
      )
    }

    return result
  }
}

handlers.add('powershell', new Powershell())
