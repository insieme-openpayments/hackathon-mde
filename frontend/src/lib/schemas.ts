// Shared zod schemas for the forms. Owner: P2 (data-stores).
import { z } from 'zod'
import { walletAddressUrlSchema } from '@insieme/shared'

export { walletAddressUrlSchema }

export const REF_REGEX = /^\d{6,20}$/
export const MIN_AMOUNT = 1000
export const MAX_FACTURA_AMOUNT = 5_000_000

export const ref1Schema = z
  .string()
  .regex(REF_REGEX, 'La referencia debe tener entre 6 y 20 dígitos')

export const emailSchema = z.string().email('Correo electrónico inválido')

export const confirmWalletSchema = z.object({
  walletAddressUrl: walletAddressUrlSchema
})
export type ConfirmWalletValues = z.infer<typeof confirmWalletSchema>
