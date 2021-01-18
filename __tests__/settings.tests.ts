import { env, inputs, state, Settings } from '../src/settings'

class TestSettings extends Settings {
    map: Map<string, string | undefined>

    constructor() {
        super()
        this.map = new Map<string, string | undefined>()
        this.map.set('emptyString', '')
        this.map.set('string', 'string')
        this.map.set('int', '5')
        this.map.set('false', 'false')
        this.map.set('true', 'true')
    }

    get(name: string): string | undefined {
        return this.map.get(name)
    }
}

test('test getString', () => {
  const settings = new TestSettings()
  expect(settings.getString('string')).toBe('string')
  expect(settings.getString('string', { defaultValue: 'other' })).toBe('string')
  expect(settings.getString('string', { required: true })).toBe('string')

  expect(settings.getString('undefined')).toBe('')
  expect(settings.getString('undefined', { defaultValue: 'other' })).toBe('other')
  expect(() => settings.getString('undefined', { required: true })).toThrowError()
})

test('test getInt', () => {
  const settings = new TestSettings()
  expect(settings.getInt('int')).toBe(5)
  expect(settings.getInt('int', { defaultValue: 10 })).toBe(5)
  expect(settings.getInt('int', { required: true })).toBe(5)

  expect(settings.getInt('int', { minValue: 5, maxValue: 5 })).toBe(5)
  expect(() => settings.getInt('int', { minValue: 10 })).toThrowError()
  expect(() => settings.getInt('int', { maxValue: 0 })).toThrowError()

  expect(settings.getInt('undefined')).toBe(0)
  expect(settings.getInt('undefined', { defaultValue: 10 })).toBe(10)
  expect(() => settings.getInt('undefined', { required: true })).toThrowError()

  expect(() => settings.getInt('string')).toThrowError()
})

test('test getBoolean', () => {
  const settings = new TestSettings()
  expect(settings.getBoolean('true')).toBe(true)
  expect(settings.getBoolean('true', { defaultValue: false })).toBe(true)
  expect(settings.getBoolean('true', { required: true })).toBe(true)

  expect(settings.getBoolean('false')).toBe(false)
  expect(settings.getBoolean('false', { defaultValue: true })).toBe(false)
  expect(settings.getBoolean('false', { required: true })).toBe(false)

  expect(settings.getBoolean('string')).toBe(false)

  expect(settings.getBoolean('undefined')).toBe(false)
  expect(settings.getBoolean('undefined', { defaultValue: true })).toBe(true)
  expect(settings.getBoolean('undefined', { defaultValue: false })).toBe(false)
  expect(() => settings.getBoolean('undefined', { required: true })).toThrowError() 
})

test('test env', () => {
    process.env['TEST_VALUE'] = 'foo'
    expect(env.get('TEST_VALUE')).toBe('foo')
    expect(env.get('undefined')).toBeUndefined()
})

test('test input', () => {
    process.env['INPUT_FOO'] = 'bar'
    expect(inputs.get('foo')).toBe('bar')
    expect(inputs.get('FOO')).toBe('bar')
    expect(inputs.get('undefined')).toBeUndefined()
})

test('test state', () => {
    process.env['STATE_FOO'] = 'bar'
    expect(state.get('FOO')).toBe('bar')
    expect(state.get('undefined')).toBeUndefined()
})
