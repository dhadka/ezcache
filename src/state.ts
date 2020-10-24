import * as core from '@actions/core'
import { CacheHandler } from './handler'

enum State {
  RestoredKey = 'RestoredKey',
  PrimaryKey = 'PrimaryKey',
  CacheHandlers = 'CacheHandlers',
}

function getScopedStateKey(handler: CacheHandler, name: string) {
  return `${handler.constructor.name}-${name}`
}

export function saveRestoredKey(handler: CacheHandler, value: string) {
  core.saveState(getScopedStateKey(handler, State.RestoredKey), value)
}

export function savePrimaryKey(handler: CacheHandler, value: string) {
  core.saveState(getScopedStateKey(handler, State.PrimaryKey), value)
}

export function addHandler(handler: CacheHandler) {
  const handlers = readHandlers()
  handlers.push(handler.constructor.name)
  core.saveState(State.CacheHandlers, handlers.join(','))
}

export function readRestoredKey(handler: CacheHandler): string {
  return core.getState(getScopedStateKey(handler, State.RestoredKey))
}

export function readPrimaryKey(handler: CacheHandler): string {
  return core.getState(getScopedStateKey(handler, State.PrimaryKey))
}

export function readHandlers(): string[] {
  return core.getState(State.CacheHandlers).split(',')
}
