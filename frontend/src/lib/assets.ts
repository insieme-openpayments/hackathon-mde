// Asset URL helpers. Owner: P2 (data-stores).
import { API_BASE_URL } from '@/lib/constants.ts'

/** Resolves a catalog `logo` (relative to GET /images/) to a URL. */
export function resolveAssetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^(https?:)?\/\//.test(path) || path.startsWith('/assets/')) return path
  return API_BASE_URL + '/images/' + path.replace(/^\/+/, '')
}

const KNOWN_CATEGORIES = new Set([
  'agua',
  'energia',
  'gas',
  'telefonia',
  'salud',
  'catalogo',
  'financieras',
  'impuestos',
  'educacion',
  'administracion',
  'movilidad',
  'otros'
])

/** Accepts a category id ('gas') or a stored icon ('assets/servicios/cat-gas.svg'). */
function toCategoryId(idOrIcon: string | null | undefined): string {
  if (!idOrIcon) return 'otros'
  const match = /cat-([a-z]+)(?:-white)?\.svg$/.exec(idOrIcon)
  const id = match ? match[1] : idOrIcon
  return KNOWN_CATEGORIES.has(id) ? id : 'otros'
}

/** Icon of a category, served from frontend/public/assets. */
export function categoryIcon(idOrIcon: string | null | undefined): string {
  return `/assets/servicios/cat-${toCategoryId(idOrIcon)}.svg`
}

/** Bigger icon shown in the payment header (gas has a dedicated one). */
export function categoryHeadIcon(idOrIcon: string | null | undefined): string {
  const id = toCategoryId(idOrIcon)
  return id === 'gas'
    ? '/assets/servicios/head-gas.svg'
    : `/assets/servicios/cat-${id}.svg`
}

/**
 * Icon for dark backgrounds (facturas pills/cards). Gas has a white variant;
 * the others are plain icons the caller inverts with a CSS filter.
 */
export function categoryWhiteIcon(idOrIcon: string | null | undefined): string {
  const id = toCategoryId(idOrIcon)
  return id === 'gas'
    ? '/assets/facturas/cat-gas-white.svg'
    : `/assets/servicios/cat-${id}.svg`
}
