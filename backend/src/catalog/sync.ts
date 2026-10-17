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

const MONEY_PRODUCTS: Record<string, { type: string; name: string }> = {
  efecty: { type: 'giro', name: 'Giro Efecty' },
  breb: { type: 'transferencia', name: 'Transferencia Bre-B' }
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
                ...(c.logo_key ? { logoKey: c.logo_key } : {}),
                active: true
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
              metadata: {
                ...(c.logo_key ? { logoKey: c.logo_key } : {}),
                active: true
              },
              ...fields
            })
          }
        }

        // Convenios the upstream no longer lists are hidden, never deleted
        // (orders reference them). An empty list is treated as a glitch.
        if (catalog.companies.length > 0) {
          const present = new Set(catalog.companies.map((c) => c.id))
          const stale = await Product.query(trx).where('type', 'servicio')
          for (const p of stale) {
            if (!present.has(p.slug) && p.metadata?.active !== false) {
              await p.$query(trx).patch({
                metadata: { ...(p.metadata ?? {}), active: false }
              })
            }
          }
        }
      })

      await this.syncMoneyProducts(this.integrationClient)

      this.catalogSource = 'integration-backend'
      this.lastSyncAt = new Date()
      return true
    } catch (err) {
      this.catalogSource = 'local'
      this.logger.warn(
        `Catalog sync with integration-backend failed; keeping the current catalog. ${
          err instanceof Error ? err.message : String(err)
        }`
      )
      return false
    }
  }

  /** Syncs enabled/provider and min/max of the Efecty and Bre-B products. */
  private async syncMoneyProducts(client: IIntegrationClient): Promise<void> {
    try {
      const { products } = await client.getProducts()
      for (const up of products) {
        const def = MONEY_PRODUCTS[up.id]
        if (!def) continue // 'services' has no product of its own
        const meta = { enabled: up.enabled, provider: up.provider }
        const existing = await Product.query().where('slug', up.id).first()
        if (existing) {
          await existing.$query().patch({
            minAmount: up.min_amount,
            maxAmount: up.max_amount,
            metadata: { ...(existing.metadata ?? {}), ...meta }
          })
        } else {
          await Product.query().insert({
            id: randomUUID(),
            slug: up.id,
            type: def.type,
            name: def.name,
            category: null,
            price: 0,
            requiresManualAmount: true,
            fixedAmount: null,
            minAmount: up.min_amount,
            maxAmount: up.max_amount,
            logo: null,
            sortOrder: 0,
            metadata: meta
          })
        }
      }
    } catch (err) {
      this.logger.warn(
        `Money products sync failed; keeping the current values. ${
          err instanceof Error ? err.message : String(err)
        }`
      )
    }
  }
}
