import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as stream from 'stream'
import * as util from 'util'
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

export async function matches(
  matchPatterns: string | string[],
  followSymbolicLinks: boolean = false,
): Promise<boolean> {
  if (Array.isArray(matchPatterns)) {
    matchPatterns = matchPatterns.join('\n')
  }

  const globber = await glob.create(matchPatterns, { followSymbolicLinks })

  for await (const _ of globber.globGenerator()) {
    return true
  }

  return false
}

export async function hashFiles(
  matchPatterns: string | string[],
  followSymbolicLinks: boolean = false,
): Promise<string> {
  const startTime = Date.now()
  let hasMatch = false
  const result = crypto.createHash('sha256')

  if (Array.isArray(matchPatterns)) {
    matchPatterns = matchPatterns.join('\n')
  }

  const globber = await glob.create(matchPatterns, { followSymbolicLinks })

  core.debug(`Search paths: ${globber.getSearchPaths().join(',')}`)

  for await (const file of globber.globGenerator()) {
    core.debug(`Processing ${file}`)

    if (fs.statSync(file).isDirectory()) {
      core.debug(`Skip directory '${file}'.`)
      continue
    }

    const hash = crypto.createHash('sha256')
    const pipeline = util.promisify(stream.pipeline)
    await pipeline(fs.createReadStream(file), hash)
    result.write(hash.digest())

    hasMatch = true
  }

  result.end()
  core.info(`Calculated hash in ${Date.now() - startTime} ms`)

  if (hasMatch) {
    return result.digest('hex')
  } else {
    return ''
  }
}
