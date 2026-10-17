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
}

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
