// Formatting helpers ported from customer-frontend/js/core.js (App.ui).
// Owner: P2 (data-stores).

export const money = (n: number | string | null | undefined): string =>
  '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })

export const num = (n: number | string | null | undefined): string =>
  Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })

export const digits = (s: string | null | undefined): string =>
  String(s || '').replace(/\D/g, '')

const pad = (n: number) => String(n).padStart(2, '0')

/** "DD/MM/YYYY HH:mm:ss" (prototype `now()` format). */
export function formatDateTime(value?: string | Date | null): string {
  const d = value ? new Date(value) : new Date()
  if (Number.isNaN(d.getTime())) return '—'
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** "DD/MM/YYYY". */
export const today = (): string => formatDateTime().split(' ')[0]
