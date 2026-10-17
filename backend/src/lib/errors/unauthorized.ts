import { BaseError } from './base'

export class Unauthorized extends BaseError {
  constructor(message: string, errors?: Record<string, string>) {
    super(401, message, errors)
    Object.setPrototypeOf(this, Unauthorized.prototype)
  }
}
