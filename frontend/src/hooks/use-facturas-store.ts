import { useSnapshot } from 'valtio'
import { facturasStore } from '@/lib/stores/facturas-store'

export function useFacturasStore() {
  return useSnapshot(facturasStore)
}
