import { BaseModel } from '@/lib'
import type { Pojo } from 'objection'
import type { SettlementReceipt } from '@insieme/shared'
import type { ProviderAttempt } from './providers'

export enum SettlementStatus {
  SETTLED = 'SETTLED',
  FAILED = 'FAILED'
}

export class Settlement extends BaseModel {
  static tableName = 'settlements'
  static jsonAttributes = ['attempts', 'receipt']

  public orderId!: string
  public idempotencyKey!: string
  public provider!: string | null
  public authCode!: string | null
  public amount!: number | null
  public paidAt!: Date | null
  public attempts!: ProviderAttempt[]
  public receipt!: SettlementReceipt | null
  public status!: SettlementStatus

  /**
   * Public JSON view: never leaks the provider that executed the payment,
   * the failover attempts or the idempotency key. Internal consumers
   * (GET /admin/orders) read the instance properties directly.
   */
  $formatJson(json: Pojo): Pojo {
    return {
      authCode: json.authCode,
      paidAt:
        json.paidAt instanceof Date ? json.paidAt.toISOString() : json.paidAt,
      amount: json.amount,
      receipt: json.receipt ?? null
    }
  }
}
