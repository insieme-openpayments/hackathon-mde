import { randomUUID } from 'crypto'
import { Logger } from 'winston'
import { Product } from '@/product/model'
import { Category } from '@/category/model'
import type { IIntegrationClient } from '@/integration/client'

export type CatalogSource = 'integration-backend' | 'local'

export interface CatalogSyncStatus {
  catalogSource: CatalogSource
  lastSyncAt: string | null
}

export interface ICatalogSyncService {
  sync: () => Promise<boolean>
  start: () => void
  getStatus: () => CatalogSyncStatus
}

export const SYNC_INTERVAL_MS = 10 * 60 * 1000

export class CatalogSyncService implements ICatalogSyncService {
  private catalogSource: CatalogSource = 'local'
  private lastSyncAt: Date | null = null

  constructor(
    private logger: Logger,
    private integrationClient: IIntegrationClient | null
  ) {}

  public getStatus(): CatalogSyncStatus {
    return {
      catalogSource: this.catalogSource,
      lastSyncAt: this.lastSyncAt ? this.lastSyncAt.toISOString() : null
    }
  }

  /** Runs one sync now and then every 10 minutes. Never blocks the caller. */
  public start(): void {
    if (!this.integrationClient) return
    void this.sync()
    setInterval(() => void this.sync(), SYNC_INTERVAL_MS).unref()
  }

  /**
   * Upserts categories and products from integration-backend by id/slug.
   * Never deletes rows (orders reference products). On failure the seeded
   * catalog is kept. Returns true when the sync succeeded.
   */
  public async sync(): Promise<boolean> {
    if (!this.integrationClient) return false
    try {
      const catalog = await this.integrationClient.getCatalog()

      await Category.transaction(async (trx) => {
        for (const [i, c] of catalog.categories.entries()) {
          const existing = await Category.query(trx).findById(c.id)
          if (existing) {
            await existing.$query(trx).patch({ label: c.label })
          } else {
            await Category.query(trx).insert({
              id: c.id,
              label: c.label,
              icon: null,
              sortOrder: i + 1
            })
          }
        }

        for (const [i, c] of catalog.companies.entries()) {
          const existing = await Product.query(trx).where('slug', c.id).first()
          const fields = {
            name: c.name,
            category: c.category,
            requiresManualAmount: c.partial,
            fixedAmount: c.fixed_amount ?? null,
            minAmount: catalog.min_payment
          }
          if (existing) {
            await existing.$query(trx).patch({
              ...fields,
              metadata: {
                ...(existing.metadata ?? {}),
                ...(c.logo_key ? { logoKey: c.logo_key } : {})
              }
            })
          } else {
            await Product.query(trx).insert({
              id: randomUUID(),
              slug: c.id,
              type: 'servicio',
              price: 0,
              maxAmount: null,
              logo: null,
              sortOrder: i + 1,
              metadata: c.logo_key ? { logoKey: c.logo_key } : null,
              ...fields
            })
          }
        }
      })

      this.catalogSource = 'integration-backend'
      this.lastSyncAt = new Date()
      return true
    } catch (err) {
      this.logger.warn(
        `Catalog sync with integration-backend failed; keeping the current catalog. ${
          err instanceof Error ? err.message : String(err)
        }`
      )
      return false
    }
  }
}
