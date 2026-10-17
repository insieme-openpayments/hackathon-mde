import axios, { type AxiosInstance } from 'axios'

export interface IntegrationCatalog {
  currency: string
  min_payment: number
  reference: { min_length: number; max_length: number }
  categories: Array<{ id: string; label: string }>
  companies: Array<{
    id: string
    name: string
    category: string
    logo_key: string | null
    partial: boolean
    fixed_amount: number | null
  }>
}

export interface IntegrationValidation {
  valid: boolean
  company_id: string
  company_name: string
  category: string
  reference: string
  amount: number
  currency: string
  partial_allowed: boolean
  min_amount: number
  max_amount: number
  due_date: string | null
  trace?: string | null
  requires_amount?: boolean | null
  message?: string | null
}

export interface IntegrationProduct {
  id: string
  name: string
  description?: string
  enabled: boolean
  provider: string
  currency: string
  min_amount: number
  max_amount: number
  fields?: Array<Record<string, unknown>>
  endpoints?: Record<string, string>
}

export interface IntegrationProducts {
  products: IntegrationProduct[]
}

export interface EfectyRequest {
  recipient_document: string
  recipient_name: string
  recipient_phone?: string | null
  amount: number
}

export interface IntegrationEfectyQuote {
  amount: number
  fee: number
  total: number
  currency: string
  max_amount: number
  min_amount: number
  recipient_document: string
  recipient_name: string
  message: string
}

export interface IntegrationEfectyTransfer {
  transfer_id: string
  status: string
  amount: number
  fee: number
  total: number
  currency: string
  recipient_document: string
  recipient_name: string
  recipient_phone?: string | null
  created_at: string
  expires_at: string | null
  claim: { method: string; instructions: string; network: string }
  message: string
}

export interface IntegrationBrebKey {
  key: string
  key_type: 'phone' | 'email' | 'document' | 'alphanumeric'
  exists: boolean
  holder_name: string
  bank: string
  message: string
}

export interface BrebTransferRequest {
  key: string
  amount: number
  description?: string | null
}

export interface IntegrationBrebTransfer {
  transfer_id: string
  status: string
  key: string
  key_type: string
  holder_name: string
  bank: string
  amount: number
  currency: string
  description?: string | null
  created_at: string
  message: string
}

export interface PayServiceRequest {
  trace: string | null
  company_id: string
  reference: string
  amount: number
  client_ip: string | null
}

export interface IntegrationPayment {
  status: 'approved' | 'pending' | 'rejected'
  transaction_id: number | string
  authorization_code: string | null
  trace: string | null
  company_id: string
  reference: string
  amount: number
  currency: string
  date: string
  message: string | null
  ticket: unknown
}

export interface IntegrationServiceTransaction {
  transaction_id: number | string
  status: string
  value: string
  date: string
  trace: string | null
}

export interface CompaniesParams {
  category?: string
  q?: string
  limit?: number
  offset?: number
}

export interface IntegrationCompanies {
  count: number
  total: number
  items: IntegrationCatalog['companies']
}

/** Long timeout for operations that move money (pay / transfers). */
export const MONEY_TIMEOUT_MS = 30_000

/** Network error or timeout: the upstream could not be reached. */
export class IntegrationUnavailable extends Error {
  constructor(message = 'integration-backend is unavailable') {
    super(message)
    this.name = 'IntegrationUnavailable'
    Object.setPrototypeOf(this, IntegrationUnavailable.prototype)
  }
}

/** The upstream answered with a 4xx/5xx status. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string
  ) {
    super(`integration-backend responded ${status}: ${detail}`)
    this.name = 'HttpError'
    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

export interface IIntegrationClient {
  getCatalog(): Promise<IntegrationCatalog>
  validateService(
    companyId: string,
    reference: string
  ): Promise<IntegrationValidation>
  getProducts(): Promise<IntegrationProducts>
  efectyQuote(body: EfectyRequest): Promise<IntegrationEfectyQuote>
  efectySend(body: EfectyRequest): Promise<IntegrationEfectyTransfer>
  efectyGet(id: string): Promise<IntegrationEfectyTransfer>
  brebResolve(key: string): Promise<IntegrationBrebKey>
  brebSend(body: BrebTransferRequest): Promise<IntegrationBrebTransfer>
  brebGet(id: string): Promise<IntegrationBrebTransfer>
  payService(body: PayServiceRequest): Promise<IntegrationPayment>
  serviceTransaction(
    id: string | number
  ): Promise<IntegrationServiceTransaction>
  companies(params?: CompaniesParams): Promise<IntegrationCompanies>
}

function extractDetail(data: unknown, fallback: string): string {
  const detail = (data as { detail?: unknown } | undefined)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d?.msg === 'string' ? d.msg : JSON.stringify(d)))
      .join('; ')
  }
  return fallback
}

export class IntegrationClient implements IIntegrationClient {
  private http: AxiosInstance

  constructor(baseURL: string, apiKey: string, timeout = 6000) {
    this.http = axios.create({
      baseURL,
      timeout,
      headers: { 'X-API-Key': apiKey }
    })
  }

  async getCatalog(): Promise<IntegrationCatalog> {
    return this.request<IntegrationCatalog>(() => this.http.get('/v1/catalog'))
  }

  async validateService(
    companyId: string,
    reference: string
  ): Promise<IntegrationValidation> {
    return this.request<IntegrationValidation>(() =>
      this.http.post('/v1/services/validate', {
        company_id: companyId,
        reference
      })
    )
  }

  async getProducts(): Promise<IntegrationProducts> {
    return this.request(() => this.http.get('/v1/products'))
  }

  async efectyQuote(body: EfectyRequest): Promise<IntegrationEfectyQuote> {
    return this.request(() => this.http.post('/v1/efecty/quote', body))
  }

  async efectySend(body: EfectyRequest): Promise<IntegrationEfectyTransfer> {
    return this.request(() =>
      this.http.post('/v1/efecty/transfers', body, {
        timeout: MONEY_TIMEOUT_MS
      })
    )
  }

  async efectyGet(id: string): Promise<IntegrationEfectyTransfer> {
    return this.request(() =>
      this.http.get(`/v1/efecty/transfers/${encodeURIComponent(id)}`)
    )
  }

  async brebResolve(key: string): Promise<IntegrationBrebKey> {
    return this.request(() => this.http.post('/v1/breb/keys/resolve', { key }))
  }

  async brebSend(body: BrebTransferRequest): Promise<IntegrationBrebTransfer> {
    return this.request(() =>
      this.http.post('/v1/breb/transfers', body, { timeout: MONEY_TIMEOUT_MS })
    )
  }

  async brebGet(id: string): Promise<IntegrationBrebTransfer> {
    return this.request(() =>
      this.http.get(`/v1/breb/transfers/${encodeURIComponent(id)}`)
    )
  }

  async payService(body: PayServiceRequest): Promise<IntegrationPayment> {
    return this.request(() =>
      this.http.post('/v1/services/pay', body, { timeout: MONEY_TIMEOUT_MS })
    )
  }

  async serviceTransaction(
    id: string | number
  ): Promise<IntegrationServiceTransaction> {
    return this.request(() =>
      this.http.get(
        `/v1/services/transactions/${encodeURIComponent(String(id))}`
      )
    )
  }

  async companies(params: CompaniesParams = {}): Promise<IntegrationCompanies> {
    return this.request(() =>
      this.http.get('/v1/catalog/companies', { params })
    )
  }

  private async request<T>(fn: () => Promise<{ data: T }>): Promise<T> {
    try {
      return (await fn()).data
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response) {
          throw new HttpError(
            err.response.status,
            extractDetail(err.response.data, err.message)
          )
        }
        throw new IntegrationUnavailable(err.message)
      }
      throw err
    }
  }
}
