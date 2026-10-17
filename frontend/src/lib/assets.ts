// Owner: P2 (data-stores).
import { IMAGES_URL } from '@/lib/constants.ts'

/** Resolves a catalog `logo` (relative to GET /images/) to a URL. */
export function resolveAssetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path
  return IMAGES_URL + path
}

/**
 * Icon of a category, served from frontend/public/assets.
 * STUB: P2 maps category ids to the real prototype icon files.
 */
export function categoryIcon(icon: string | null | undefined): string {
  if (!icon) return ''
  if (icon.startsWith('/')) return icon
  return `/assets/servicios/${icon}`
}
