import type { SavedDestination } from '@insieme/shared'
import { money } from '@/lib/money.ts'

export function destinationKindLabel(kind: SavedDestination['kind']): string {
  return kind === 'efecty' ? 'Giro Efecty' : 'Bre-B'
}

/** Where "Enviar de nuevo" goes: the flow page reads ?destino=<id>. */
export function destinationHref(d: Pick<SavedDestination, 'id' | 'kind'>) {
  return (d.kind === 'efecty' ? '/giros' : '/breb') + '?destino=' + d.id
}

/** Last amount sent, or a neutral text when there is none. */
export function destinationLastValue(d: SavedDestination): string {
  return d.lastAmount
    ? `Último valor: ${money(d.lastAmount)}`
    : 'Sin envíos aún'
}

/**
 * Second line under the label: the beneficiary's ID for Efecty (the label is
 * already the name), bank + key for Bre-B (the label is the holder).
 */
export function destinationDetail(d: SavedDestination): string {
  if (d.kind === 'efecty') {
    const doc = d.details.recipientDocument
    return /^\d+$/.test(doc)
      ? `Cédula ${Number(doc).toLocaleString('es-CO')}`
      : `Cédula ${doc}`
  }
  // The label is usually the masked holder already: show bank + key instead.
  return [d.details.bank, `Llave ${d.details.key}`].filter(Boolean).join(' · ')
}
