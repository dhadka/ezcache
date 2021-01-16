import * as utils from '../src/utils'
import { RestoreType } from '../src/handler'

test('combine restore types', () => {
    expect(utils.combineRestoreType()).toBe(RestoreType.Miss)

    expect(utils.combineRestoreType(RestoreType.Miss)).toBe(RestoreType.Miss)
    expect(utils.combineRestoreType(RestoreType.Partial)).toBe(RestoreType.Partial)
    expect(utils.combineRestoreType(RestoreType.Full)).toBe(RestoreType.Full)

    expect(utils.combineRestoreType(RestoreType.Miss, RestoreType.Miss)).toBe(RestoreType.Miss)
    expect(utils.combineRestoreType(RestoreType.Partial, RestoreType.Partial)).toBe(RestoreType.Partial)
    expect(utils.combineRestoreType(RestoreType.Full, RestoreType.Full)).toBe(RestoreType.Full)

    expect(utils.combineRestoreType(RestoreType.Full, RestoreType.Miss)).toBe(RestoreType.Miss)
    expect(utils.combineRestoreType(RestoreType.Miss, RestoreType.Partial)).toBe(RestoreType.Miss)
    expect(utils.combineRestoreType(RestoreType.Full, RestoreType.Partial)).toBe(RestoreType.Partial)

    expect(utils.combineRestoreType(RestoreType.Full, RestoreType.Miss, RestoreType.Partial)).toBe(RestoreType.Miss)
})

test('concatenate keys', () => {
    expect(utils.concatenateKeys('foo')).toStrictEqual(["foo"])
    expect(utils.concatenateKeys('foo', [])).toStrictEqual(["foo"])
    expect(utils.concatenateKeys('foo', ['bar'])).toStrictEqual(["foo", "bar"])
    expect(utils.concatenateKeys('foo', ['bar', 'baz'])).toStrictEqual(["foo", "bar", "baz"])
})