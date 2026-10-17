import { BaseError } from './base'

export class PayloadTooLarge extends BaseError {
  constructor() {
    super(413, 'Request body too large')
    Object.setPrototypeOf(this, PayloadTooLarge.prototype)
  }
}
