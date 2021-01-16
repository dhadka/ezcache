import { RestoreType } from './handler'

export function combineRestoreType(...types: RestoreType[]): RestoreType {
  if (types.length === 0) {
    return RestoreType.Miss
  }

  return types.reduce((prev, curr) => {
    if (prev === RestoreType.Miss || curr === RestoreType.Miss) {
      return RestoreType.Miss
    } else if (prev === RestoreType.Partial || curr === RestoreType.Partial) {
      return RestoreType.Partial
    } else {
      return RestoreType.Full
    }
  })
}

export function concatenateKeys(primaryKey: string, restoreKeys?: string[]): string[] {
  const result = [primaryKey]

  if (restoreKeys) {
    result.push(...restoreKeys)
  }

  return result
}
