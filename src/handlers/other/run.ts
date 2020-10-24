import * as core from '@actions/core'
import * as github from '@actions/github'
import { registry } from '../../registry'
import { runner } from '../../expressions'
import { CacheHandler } from '../../handler'

class PerRunCache extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return core.getInput('path').split('\n').map(s => s.trim())
    }

    async getKey(version?: string): Promise<string> {
        return `${runner.os}-${version}-run-${github.context.runId}`
    }
}

registry.add("run", new PerRunCache())