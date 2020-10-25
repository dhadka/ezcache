import { registry } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'
import { CacheHandler } from '../../handler'
import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'

class Nuget extends CacheHandler {
  async getPaths(): Promise<string[]> {
    const paths = ['~/.nuget/packages']
    const existingPackages = core.getState('NUGET_EXISTING_PACKAGES').split(',')

    for (const existingPackage of existingPackages) {
      paths.push("!~/.nuget/packages/" + existingPackage)
    }

    return paths
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-nuget-${await hashFiles('**/packages.lock.json')}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-nuget-`]
  }

  async shouldCache(): Promise<boolean> {
    return await matches('**/packages.lock.json')
  }

  async setup(): Promise<void> {
    // Hosted runners have a lot of Nuget packages already installed.  As caching these would be a
    // waste of resources, record all existing packages so they can be excluded.
    const existingPackages: string[] = []
    const rootPath = path.resolve('~/.nuget/packages')

    console.log(`Root: ${rootPath}`)

    for (const rootFile of fs.readdirSync(rootPath)) {
      const absoluteRootFile = path.join(rootPath, rootFile)

      if (fs.statSync(absoluteRootFile).isDirectory()) {
        for (const subFile of fs.readdirSync(absoluteRootFile)) {
          const absoluteSubFile = path.join(absoluteRootFile, subFile)

          if (fs.statSync(absoluteSubFile).isDirectory()) {
            console.log(`rootFile + '/' + subFile`)
            existingPackages.push(rootFile + '/' + subFile)
          }
        }
      }
    }

    core.saveState('NUGET_EXISTING_PACKAGES', existingPackages.join(','))
  }
}

registry.add('nuget', new Nuget())
