import { APIError } from '@/lib/fetcher.ts'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'

/** Only same-app paths: avoids open redirects through ?next=. */
export function safeNext(next: string | undefined): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next
  return '/'
}

/** Maps API field errors (by last path segment) onto the form. */
export function applyApiErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: Error
): void {
  const isApi = error instanceof APIError
  const message = isApi
    ? error.message
    : 'No pudimos conectar con Insieme. Revisa tu conexión e intenta de nuevo.'
  const entries = Object.entries((isApi ? error.errors : undefined) ?? {}) as [
    string,
    string
  ][]
  let mapped = false
  for (const [path, msg] of entries) {
    const field = path.split('.').pop() ?? path
    if (field in form.getValues()) {
      form.setError(field as Path<T>, { message: msg })
      mapped = true
    }
  }
  if (!mapped) form.setError('root', { message })
}
