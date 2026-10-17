import { Logger } from 'winston'
import type {
  BrebKeyResolution,
  BrebKeyType,
  EfectyQuote,
  OrderItemInput,
  OrderReceiptItem
} from '@insieme/shared'
import { BadRequest, InMemoryCache } from '@/lib'
import type { IProductService } from '@/product/service'
import type { Product } from '@/product/model'
import {
  HttpError,
  type IIntegrationClient,
  IntegrationUnavailable
} from '@/integration/client'

export const QUOTE_TTL_MS = 30 * 60 * 1000
export const EFECTY_MIN = 10_000
export const EFECTY_MAX = 1_500_000
export const BREB_MIN = 1_000
export const BREB_MAX = 5_000_000
export const BREB_NOT_FOUND = 'La llave Bre-B no existe o no está activa'

export interface PricedOrderItem {
  productId: string
  quantity: number
  price: number
  details: NonNullable<OrderReceiptItem['details']>
}

export type EfectyQuoteInput = {
  recipientDocument: string
  recipientName: string
  recipientPhone?: string
  amount: number
}

type MoneyItem = Extract<OrderItemInput, { kind: 'efecty' | 'breb' }>

export interface IMoneyService {
  quoteEfecty: (input: EfectyQuoteInput) => Promise<EfectyQuote>
  resolveBreb: (key: string) => Promise<BrebKeyResolution>
  priceMoneyItem: (item: MoneyItem) => Promise<PricedOrderItem>
}

const MASKED_HOLDERS = [
  'Ma*** Gó***',
  'Ca*** Ro***',
  'Lu*** He***',
  'Jo*** Ra***',
  'An*** Va***',
  'Ju*** Ma***'
]

export function brebKeyType(key: string): BrebKeyType {
  if (key.includes('@')) return 'email'
  if (/^3\d{9}$/.test(key)) return 'phone'
  if (/^\d{6,15}$/.test(key)) return 'document'
  return 'alphanumeric'
}

/** Same rule as the upstream mock: keys ending in 0, A or a do not exist. */
export function brebKeyExists(key: string): boolean {
  return !/[0Aa]$/.test(key)
}

const fmt = (n: number) => n.toLocaleString('es-CO')

export class MoneyService implements IMoneyService {
  private quotes = new InMemoryCache<EfectyQuote>()
  private keys = new InMemoryCache<BrebKeyResolution>()

  constructor(
    private logger: Logger,
    private productService: IProductService,
    private integrationClient: IIntegrationClient | null
  ) {}

  public async quoteEfecty(input: EfectyQuoteInput): Promise<EfectyQuote> {
    const cacheKey = `${input.recipientDocument}:${input.amount}`
    const cached = await this.quotes.get(cacheKey)
    if (cached) return { ...cached, recipientName: input.recipientName }

    const quote = await this.fetchQuote(input)
    this.quotes.set(cacheKey, quote, QUOTE_TTL_MS)
    return quote
  }

  public async resolveBreb(rawKey: string): Promise<BrebKeyResolution> {
    const key = rawKey.trim()
    const cached = await this.keys.get(key)
    if (cached) return cached

    const resolution = await this.fetchKey(key)
    this.keys.set(key, resolution, QUOTE_TTL_MS)
    return resolution
  }

  public async priceMoneyItem(item: MoneyItem): Promise<PricedOrderItem> {
    const product = await this.productService.getById(item.productId)
    const expectedType = item.kind === 'efecty' ? 'giro' : 'transferencia'
    if (product.type !== expectedType) {
      throw new BadRequest('Invalid input', {
        productId: 'Producto no válido para esta operación'
      })
    }
    if (product.metadata?.enabled === false) {
      throw new BadRequest('Invalid input', {
        amount: 'Este servicio no está disponible por ahora'
      })
    }
    const { min, max } = this.range(product, item.kind)
    if (item.amount < min || item.amount > max) {
      throw new BadRequest('Invalid input', {
        amount: `El valor debe estar entre $${fmt(min)} y $${fmt(max)}`
      })
    }

    if (item.kind === 'efecty') {
      const { recipientDocument, recipientName, recipientPhone, email } =
        item.details
      const quote = await this.quoteEfecty({
        recipientDocument,
        recipientName,
        recipientPhone,
        amount: item.amount
      })
      return {
        productId: product.id,
        quantity: 1,
        price: quote.total,
        details: {
          kind: 'efecty',
          recipientDocument: quote.recipientDocument,
          recipientName,
          ...(recipientPhone ? { recipientPhone } : {}),
          ...(email ? { email } : {}),
          fee: quote.fee,
          total: quote.total
        }
      }
    }

    const { key, description, email } = item.details
    const resolution = await this.resolveBreb(key)
    return {
      productId: product.id,
      quantity: 1,
      price: item.amount,
      details: {
        kind: 'breb',
        key: resolution.key,
        keyType: resolution.keyType,
        holderName: resolution.holderName,
        bank: resolution.bank,
        ...(description ? { description } : {}),
        ...(email ? { email } : {})
      }
    }
  }

  private range(product: Product, kind: 'efecty' | 'breb') {
    return {
      min: product.minAmount ?? (kind === 'efecty' ? EFECTY_MIN : BREB_MIN),
      max: product.maxAmount ?? (kind === 'efecty' ? EFECTY_MAX : BREB_MAX)
    }
  }

  private async fetchQuote(input: EfectyQuoteInput): Promise<EfectyQuote> {
    if (this.integrationClient) {
      try {
        const res = await this.integrationClient.efectyQuote({
          recipient_document: input.recipientDocument,
          recipient_name: input.recipientName,
          recipient_phone: input.recipientPhone ?? null,
          amount: input.amount
        })
        return {
          amount: res.amount,
          fee: res.fee,
          total: res.total,
          currency: res.currency,
          minAmount: res.min_amount,
          maxAmount: res.max_amount,
          recipientDocument: res.recipient_document,
          recipientName: res.recipient_name,
          message: res.message,
          simulated: false
        }
      } catch (err) {
        if (
          err instanceof HttpError &&
          (err.status === 422 || err.status === 404)
        ) {
          const field = /c[eé]dula|documento/i.test(err.detail)
            ? 'recipientDocument'
            : 'amount'
          throw new BadRequest('Invalid input', { [field]: err.detail })
        }
        if (err instanceof IntegrationUnavailable || err instanceof HttpError) {
          this.logger.warn(
            `integration-backend failed (${err.message}); using a local Efecty quote.`
          )
        } else {
          throw err
        }
      }
    }
    return await this.quoteLocally(input)
  }

  private async quoteLocally(input: EfectyQuoteInput): Promise<EfectyQuote> {
    const product = await this.productService
      .getBySlug('efecty')
      .catch(() => null)
    const min = product?.minAmount ?? EFECTY_MIN
    const max = product?.maxAmount ?? EFECTY_MAX
    if (input.amount < min || input.amount > max) {
      throw new BadRequest('Invalid input', {
        amount: `El giro debe estar entre $${fmt(min)} y $${fmt(max)} COP`
      })
    }
    return {
      amount: input.amount,
      fee: 0,
      total: input.amount,
      currency: 'COP',
      minAmount: min,
      maxAmount: max,
      recipientDocument: input.recipientDocument,
      recipientName: input.recipientName,
      message: 'Cotización simulada',
      simulated: true
    }
  }

  private async fetchKey(key: string): Promise<BrebKeyResolution> {
    if (this.integrationClient) {
      try {
        const res = await this.integrationClient.brebResolve(key)
        if (!res.exists) {
          throw new BadRequest('Invalid input', { key: BREB_NOT_FOUND })
        }
        return {
          key: res.key,
          keyType: res.key_type,
          exists: true,
          holderName: res.holder_name,
          bank: res.bank,
          message: res.message,
          simulated: false
        }
      } catch (err) {
        if (err instanceof BadRequest) throw err
        if (
          err instanceof HttpError &&
          (err.status === 404 || err.status === 422)
        ) {
          throw new BadRequest('Invalid input', { key: err.detail })
        }
        if (err instanceof IntegrationUnavailable || err instanceof HttpError) {
          this.logger.warn(
            `integration-backend failed (${err.message}); using a local Bre-B key resolution.`
          )
        } else {
          throw err
        }
      }
    }
    return this.resolveLocally(key)
  }

  private resolveLocally(key: string): BrebKeyResolution {
    if (!brebKeyExists(key)) {
      throw new BadRequest('Invalid input', { key: BREB_NOT_FOUND })
    }
    const sum = [...key].reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return {
      key,
      keyType: brebKeyType(key),
      exists: true,
      holderName: MASKED_HOLDERS[sum % MASKED_HOLDERS.length],
      bank: 'Banco Mock Bre-B',
      message: 'Llave Bre-B encontrada.',
      simulated: true
    }
  }
}
