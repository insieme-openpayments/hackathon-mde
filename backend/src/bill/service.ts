import { Logger } from 'winston'
import type { BillLookupResult, OrderItemInput } from '@insieme/shared'
import { BadRequest } from '@/lib'
import { IProductService } from '@/product/service'
import type { Product } from '@/product/model'
import type { BillSnapshot, BillSnapshotCache } from '@/cache/bill-snapshot'
import {
  HttpError,
  type IIntegrationClient,
  IntegrationUnavailable
} from '@/integration/client'
import { type IMoneyService, type PricedOrderItem } from '@/money/service'
import { simulateBill, simulateInvoiceDetails } from './simulate'

export const NO_BILL_MESSAGE =
  'No encontramos una factura pendiente con esta referencia'
export const SNAPSHOT_TTL_MS = 30 * 60 * 1000
export const MIN_PAYMENT = 1000
export const MAX_INVOICE_PAYMENT = 5_000_000

export type { PricedOrderItem }

export type ResolvedBill = Pick<
  BillSnapshot,
  | 'amount'
  | 'partial'
  | 'minAmount'
  | 'maxAmount'
  | 'dueDate'
  | 'trace'
  | 'requiresAmount'
  | 'source'
>

/** Holder/concept/dueDate: simulated only when the bill itself is simulated. */
const invoiceDetails = (
  resolved: ResolvedBill,
  slug: string,
  ref1: string
): Pick<BillSnapshot, 'holder' | 'concept' | 'dueDate'> => {
  if (resolved.source === 'local') {
    const sim = simulateInvoiceDetails(slug, ref1)
    return {
      holder: sim.holder,
      concept: sim.concept,
      dueDate: resolved.dueDate ?? sim.dueDate
    }
  }
  return { holder: null, concept: null, dueDate: resolved.dueDate ?? null }
}

export interface IBillService {
  resolveBill: (product: Product, ref1: string) => Promise<ResolvedBill>
  lookup: (productId: string, ref1: string) => Promise<BillLookupResult>
  priceOrderItem: (item: OrderItemInput) => Promise<PricedOrderItem>
}

export const snapshotKey = (productId: string, ref1: string) =>
  `${productId}:${ref1}`

export class BillService implements IBillService {
  constructor(
    private logger: Logger,
    private productService: IProductService,
    private integrationClient: IIntegrationClient | null,
    private billSnapshotCache: BillSnapshotCache,
    private moneyService: IMoneyService
  ) {}

  public async resolveBill(
    product: Product,
    ref1: string
  ): Promise<ResolvedBill> {
    if (this.integrationClient) {
      try {
        const res = await this.integrationClient.validateService(
          product.slug,
          ref1
        )
        const requiresAmount = res.requires_amount === true
        const trace = res.trace ?? null
        // A fixed-amount convenio always bills its fixed amount (same rule
        // as the local simulation), whatever the upstream returned.
        if (product.fixedAmount != null) {
          return {
            amount: product.fixedAmount,
            partial: res.partial_allowed,
            minAmount: Math.min(res.min_amount, product.fixedAmount),
            maxAmount: product.fixedAmount,
            dueDate: res.due_date ?? null,
            trace,
            requiresAmount,
            source: 'integration-backend'
          }
        }
        // requires_amount: the payer types the value, so it is editable
        // within the same min/max even if the product is not partial.
        return {
          amount: res.amount,
          partial: res.partial_allowed || requiresAmount,
          minAmount: res.min_amount,
          maxAmount:
            requiresAmount && res.max_amount <= 0
              ? MAX_INVOICE_PAYMENT
              : res.max_amount,
          dueDate: res.due_date ?? null,
          trace,
          requiresAmount,
          source: 'integration-backend'
        }
      } catch (err) {
        if (
          err instanceof HttpError &&
          (err.status === 404 || err.status === 422)
        ) {
          throw new BadRequest('Invalid input', { ref1: err.detail })
        }
        if (
          err instanceof HttpError &&
          (err.status === 401 || err.status === 403)
        ) {
          this.logger.error(
            `integration-backend rejected our credentials (${err.status}); check INTEGRATION_API_KEY.`
          )
        }
        if (err instanceof IntegrationUnavailable || err instanceof HttpError) {
          this.logger.warn(
            `integration-backend failed (${err.message}); using the local bill simulation.`
          )
        } else {
          throw err
        }
      }
    }
    return this.resolveLocally(product, ref1)
  }

  public async lookup(
    productId: string,
    ref1: string
  ): Promise<BillLookupResult> {
    const product = await this.productService.getById(productId)
    const key = snapshotKey(product.id, ref1)

    // Reuse a live snapshot so repeated lookups (other tabs, double click)
    // never change the amount a previous screen was shown.
    let snapshot = await this.billSnapshotCache.get(key)
    if (!snapshot) {
      const resolved = await this.resolveBill(product, ref1)
      snapshot = {
        ...resolved,
        ...invoiceDetails(resolved, product.slug, ref1)
      }
      this.billSnapshotCache.set(key, snapshot, SNAPSHOT_TTL_MS)
    }
    const bill = snapshot
    const dueDate = bill.dueDate

    return {
      productId: product.id,
      convenio: product.slug,
      name: product.name,
      category: product.category ?? '',
      ref1,
      amount: bill.amount,
      partial: bill.partial,
      minAmount: bill.minAmount,
      maxAmount: bill.maxAmount,
      fixedAmount: product.fixedAmount,
      holder: bill.holder,
      concept: bill.concept,
      dueDate
    }
  }

  public async priceOrderItem(item: OrderItemInput): Promise<PricedOrderItem> {
    if (item.kind === 'efecty' || item.kind === 'breb') {
      return await this.moneyService.priceMoneyItem(item)
    }
    const product = await this.productService.getById(item.productId)
    const { ref1, ref2, email, document } = item.details
    const errors: Record<string, string> = {}
    const snapshot = await this.billSnapshotCache.get(
      snapshotKey(product.id, ref1)
    )
    let price = 0
    let extra: Partial<
      Pick<BillSnapshot, 'holder' | 'concept' | 'dueDate' | 'trace'>
    > = {}

    if (item.kind === 'servicio') {
      let bill: BillSnapshot
      if (snapshot) {
        bill = snapshot
      } else {
        const resolved = await this.resolveBill(product, ref1)
        bill = {
          ...resolved,
          ...invoiceDetails(resolved, product.slug, ref1)
        }
      }
      extra = {
        holder: bill.holder,
        concept: bill.concept,
        dueDate: bill.dueDate,
        ...(bill.trace ? { trace: bill.trace } : {})
      }

      if (bill.partial) {
        const min = Math.max(MIN_PAYMENT, bill.minAmount)
        const max = bill.requiresAmount ? bill.maxAmount : bill.amount
        if (item.amount === undefined) {
          errors.amount = 'Ingresa el valor a pagar'
        } else if (item.amount < min || item.amount > max) {
          errors.amount = `El valor debe estar entre ${min} y ${max}`
        } else {
          price = item.amount
        }
      } else if (item.amount === undefined || item.amount === bill.amount) {
        price = bill.amount
      } else {
        errors.amount = 'El valor no coincide con la factura'
      }
    } else {
      if (item.amount === undefined) {
        errors.amount = 'Ingresa el valor a pagar'
      } else if (
        item.amount < MIN_PAYMENT ||
        item.amount > MAX_INVOICE_PAYMENT
      ) {
        errors.amount = `El valor debe estar entre ${MIN_PAYMENT} y ${MAX_INVOICE_PAYMENT}`
      } else {
        price = item.amount
      }
      if (!email) errors.email = 'Ingresa tu correo electrónico'
      if (snapshot) {
        extra = {
          holder: snapshot.holder,
          concept: snapshot.concept,
          dueDate: snapshot.dueDate,
          ...(snapshot.trace ? { trace: snapshot.trace } : {})
        }
      }
    }

    if (Object.keys(errors).length) {
      throw new BadRequest('Invalid input', errors)
    }

    const details: PricedOrderItem['details'] = {
      ref1,
      ...(ref2 ? { ref2 } : {}),
      ...(email ? { email } : {}),
      ...(document ? { document } : {}),
      kind: item.kind,
      ...extra
    }

    return { productId: product.id, quantity: 1, price, details }
  }

  private resolveLocally(product: Product, ref1: string): ResolvedBill {
    const amount = simulateBill(product.slug, ref1, product.fixedAmount)
    if (amount === null) {
      throw new BadRequest('Invalid input', { ref1: NO_BILL_MESSAGE })
    }
    const partial = product.requiresManualAmount
    return {
      amount,
      partial,
      minAmount: partial
        ? Math.max(MIN_PAYMENT, product.minAmount ?? MIN_PAYMENT)
        : amount,
      maxAmount: amount,
      dueDate: null,
      source: 'local'
    }
  }
}
