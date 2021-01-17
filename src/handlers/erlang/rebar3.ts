import { handlers } from '../../registry'
import { hashFiles, runner, matches } from '../../expressions'
import { CacheHandler } from '../../handler'

class Rebar3 extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return ['~/.cache/rebar3', '_build']
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-erlang-${process.env['OTP_VERSION']}-${await hashFiles('**/*rebar.lock')}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-erlang-${process.env['OTP_VERSION']}-`]
  }

  async shouldCache(): Promise<boolean> {
    return await matches('**/*rebar.lock')
  }
}

handlers.add('rebar3', new Rebar3())
