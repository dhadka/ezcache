import * as core from '@actions/core'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import * as execa from 'execa'
import * as crypto from 'crypto'
import { handlers } from '../../registry'
import { runner } from '../../expressions'
import { CacheHandler, ICacheOptions, IRestoreResult, RestoreType } from '../../handler'

class Powershell extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return this.getModulePaths()
  }

  getSearchPaths(): string[] {
    switch (runner.os) {
      case 'Windows':
        return [
          os.homedir() + '\\Documents\\PowerShell\\Modules',
          process.env['ProgramFiles'] + '\\PowerShell\\Modules',
          os.homedir() + '\\Documents\\WindowsPowerShell\\Modules',
          process.env['ProgramFiles'] + '\\WindowsPowerShell\\Modules',
        ]
      case 'Linux':
      case 'macOS':
        return ['~/.local/share/powershell/Modules', '/usr/local/share/powershell/Modules']
    }
  }

  getModulePaths(): string[] {
    const modules = this.getModules()
    const searchPaths = this.getSearchPaths()
    const result: string[] = []

    for (const module of modules) {
      let found = false

      for (const searchPath of searchPaths) {
        const modulePath = path.join(searchPath, module)

        if (fs.existsSync(modulePath)) {
          result.push(modulePath)
          found = true
          break
        }
      }

      if (!found) {
        throw Error(`Unable to find module path for ${module}`)
      }
    }

    return result
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
          `Set-PSRepository PSGallery -InstallationPolicy Trusted; Install-Module ${this.getModules().join(',')} -ErrorAction Stop`,
        ],
        { stdout: 'inherit', stderr: 'inherit' },
      )
    }

    return result
  }
}

handlers.add('powershell', new Powershell())
