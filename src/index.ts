import * as core from '@actions/core'
import * as exec from '@actions/exec'

async function run() {
    await exec.exec("echo", ['$(npm config get cache)'])
    await exec.exec("echo", ['**/package-lock.json\nfoo.txt'])
}

run()