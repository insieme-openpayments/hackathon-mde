import type { ZodTypeAny } from 'zod'

/**
 * Removes a persisted localStorage entry that is corrupt or does not match the
 * schema, so valtioPersist starts from its initial state instead of crashing.
 */
export function loadGuard(key: string, schema: ZodTypeAny): void {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return
    if (!schema.safeParse(JSON.parse(raw)).success) {
      localStorage.removeItem(key)
    }
  } catch {
    try {
      localStorage.removeItem(key)
    } catch {
      // storage unavailable
    }
  }
}
