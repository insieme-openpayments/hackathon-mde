// STUB - implemented by P5 (payment+confirmation). Props are the contract.
// Final behaviour (see plan "ConfirmPanel"): fixed bottom panel; first
// "Confirmar" opens it; second either instant-buys (matching one-click token)
// or writes the payment draft and creates the order, then redirects.
import { Actions, BackButton, KvRows, type KvRow } from '@/components/insieme'
import { Button } from '@/components/ui/button.tsx'
import type { OrderItemDetails, OrderItemKind } from '@/lib/api-types.ts'

export interface ConfirmPanelProps {
  /** Rows of the "Confirma la transacción" summary. */
  rows: KvRow[]
  /** Whole COP units to charge. */
  amount: number
  productId: string
  kind: OrderItemKind
  details: OrderItemDetails
  /** Which flow renders the panel (decides where to return to). */
  source: 'servicios' | 'facturas'
  /** Saved invoice being paid (facturas flow); `markPaid` runs on success. */
  facturaId?: string
  /** "Confirmar" is clickable. */
  enabled: boolean
  onBack: () => void
}

export function ConfirmPanel({ rows, enabled, onBack }: ConfirmPanelProps) {
  return (
    <section className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-[420px] animate-sheet-up flex-col gap-3 bg-sheet p-4 shadow-sheet">
      <h3 className="text-sm font-medium">Confirma la transacción</h3>
      <KvRows rows={rows} />
      <Actions>
        <BackButton onClick={onBack} />
        <Button
          aria-label="Confirmar"
          disabled={!enabled}
          className="flex-1"
          variant="default"
        >
          Confirmar
        </Button>
      </Actions>
    </section>
  )
}
