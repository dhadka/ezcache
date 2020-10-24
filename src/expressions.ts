import * as glob from '@actions/glob'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as stream from 'stream'
import * as util from 'util'
import * as path from 'path'
import * as execa from 'execa'
import * as process from 'process'

class Runner {
  os: 'Windows' | 'Linux' | 'macOS'

  constructor() {
      const platform = process.platform
  
      if (platform === 'win32') {
          this.os = 'Windows'
      } else if (platform === 'darwin') {
          this.os = 'macOS'
      } else {
          this.os = 'Linux'
      }
  }
}

export const runner = new Runner()

export async function exec(cmd: string, ...args: string[]): Promise<string> {
  return (await execa(cmd, args, {})).stdout
}

export async function matches(matchPatterns: string | string[], followSymbolicLinks: boolean = false): Promise<boolean> {
  if (Array.isArray(matchPatterns)) {
    matchPatterns = matchPatterns.join("\n")
  }

  const globber = await glob.create(matchPatterns, {followSymbolicLinks})
  
  for await (const file of globber.globGenerator()) {
    return true
  }

  return false
}

export async function hashFiles(matchPatterns: string | string[], followSymbolicLinks: boolean = false): Promise<string> {
  let hasMatch = false
  const githubWorkspace = process.cwd()
  const result = crypto.createHash('sha256')
  let count = 0

  if (Array.isArray(matchPatterns)) {
    matchPatterns = matchPatterns.join("\n")
  }

  const globber = await glob.create(matchPatterns, {followSymbolicLinks})
  
  for await (const file of globber.globGenerator()) {
    console.log(file)

    if (!file.startsWith(`${githubWorkspace}${path.sep}`)) {
      console.log(`Ignore '${file}' since it is not under GITHUB_WORKSPACE.`)
      continue
    }

    if (fs.statSync(file).isDirectory()) {
      console.log(`Skip directory '${file}'.`)
      continue
    }

    const hash = crypto.createHash('sha256')
    const pipeline = util.promisify(stream.pipeline)
    await pipeline(fs.createReadStream(file), hash)
    result.write(hash.digest())

    count++

    if (!hasMatch) {
      hasMatch = true
    }
  }

  result.end()

  if (hasMatch) {
      return result.digest('hex')
  } else {
      return ''
  }
}