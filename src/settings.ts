import * as core from '@actions/core'

/**
 * Provides common methods for reading and parsing values from inputs, states, and environment
 * variables.
 */
export abstract class Settings {
  abstract get(name: string): string | undefined

  protected missing(name: string) {
    throw Error(`Required setting is missing: ${name}`)
  }

  protected outOfBounds(name: string, value: number, minValue?: number, maxValue?: number) {
    throw Error(`Setting is out of bounds: ${name}. Value: ${value}, Min Value: ${minValue}, Max Value: ${maxValue}`)
  }

  protected notInt(name: string, value: string | undefined) {
    throw Error(`Setting is not an integer: ${name}. Value: ${value}`)
  }

  /**
   * Returns the setting as a string.  If the value is not set and no default is
   * specified, returns ''.
   *
   * @param name the setting name
   * @param options the setting options
   */
  getString(name: string, options?: IStringOptions): string {
    const value = this.get(name)

    if (options?.required && !value) {
      this.missing(name)
    }

    return value ? value : options?.defaultValue || ''
  }

  /**
   * Parses the setting to an int.  If the value is not set and no default is specified,
   * returns 0.
   *
   * @param name the setting name
   * @param options the setting options
   */
  getInt(name: string, options?: IIntOptions): number {
    const value = this.get(name)

    if (options?.required && !value) {
      this.missing(name)
    }

    const numericValue = value ? parseInt(value) : options?.defaultValue || 0

    if (isNaN(numericValue)) {
      this.notInt(name, value)
    }

    if (
      (typeof options?.minValue === 'number' && numericValue < options.minValue) ||
      (typeof options?.maxValue === 'number' && numericValue > options.maxValue)
    ) {
      this.outOfBounds(name, numericValue, options.minValue, options.maxValue)
    }

    return numericValue
  }

  /**
   * Parses the setting to a boolean.  If the value is not set and no default is specified,
   * returns false.
   *
   * @param name the setting name
   * @param options the setting options
   */
  getBoolean(name: string, options?: IBooleanOptions): boolean {
    let value = this.get(name)

    if (options?.required && !value) {
      this.missing(name)
    }

    return value ? value.toLowerCase() === 'true' : options?.defaultValue || false
  }
}

interface IOptions {
  required?: boolean
}

export interface IStringOptions extends IOptions {
  defaultValue?: string
}

export interface IIntOptions extends IOptions {
  defaultValue?: number
  minValue?: number
  maxValue?: number
}

export interface IBooleanOptions extends IOptions {
  defaultValue?: boolean
}

class Inputs extends Settings {
  get(name: string): string | undefined {
    const value = core.getInput(name)
    return value !== '' ? value : undefined
  }
}

class Env extends Settings {
  get(name: string): string | undefined {
    return process.env[name]
  }
}

class State extends Settings {
  get(name: string): string | undefined {
    const value = core.getState(name)
    return value !== '' ? value : undefined
  }

  setString(name: string, value: any): void {
    core.saveState(name, value)
  }
}

export const inputs = new Inputs()
export const env = new Env()
export const state = new State()
