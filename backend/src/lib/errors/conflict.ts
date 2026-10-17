import { BaseError } from './base'

export class Conflict extends BaseError {
  constructor(message: string, errors?: Record<string, string>) {
    super(409, message, errors)
    Object.setPrototypeOf(this, Conflict.prototype)
  }
}
