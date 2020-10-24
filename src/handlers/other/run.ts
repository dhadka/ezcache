import * as core from '@actions/core'
import * as github from '@actions/github'
import { registry, CacheHandler } from '../../registry'
import { runner } from '../../expressions'

class PerRunCache extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return core.getInput('path').split('\n').map(s => s.trim())
    }

    async getKey(version?: string): Promise<string> {
        return `${runner.os}-run-${github.context.runId}`
    }
}

registry.add("run", new PerRunCache())