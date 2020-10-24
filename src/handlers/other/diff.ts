import * as core from '@actions/core'
import * as github from '@actions/github'
import { registry, CacheHandler } from '../../registry'
import { hashFiles, runner } from '../../expressions'

class DiffCache extends CacheHandler {
    getBranchName(): string {
        let ref = github.context.ref

        if (ref.startsWith('refs/heads/')) {
            ref = ref.substring(11)
        }

        return ref
    }

    async getPaths(): Promise<string[]> {
        return core.getInput('path').split('\n').map(s => s.trim())
    }

    async getKey(version?: string): Promise<string> {
        return `${runner.os}-${version}-diff-${this.getBranchName()}-${await hashFiles(await this.getPaths())}`
    }

    async getRestoreKeys(version?: string): Promise<string[]> {
        return [`${runner.os}-${version}-diff-${this.getBranchName()}-`, `${runner.os}-${version}-last-master-`]
    }
}

registry.add("diff", new DiffCache())