// Shared zod schemas for the forms. Owner: P2 (data-stores).
import { z } from 'zod'
import {
  walletAddressUrlSchema,
  createOrderSchema,
  instantBuySchema,
  billLookupSchema,
  oneClickSetupSchema,
  REF_REGEX
} from '@insieme/shared'

export {
  walletAddressUrlSchema,
  createOrderSchema,
  instantBuySchema,
  billLookupSchema,
  oneClickSetupSchema,
  REF_REGEX
}

export const MIN_AMOUNT = 1000
export const MAX_FACTURA_AMOUNT = 5_000_000
export const FACTURA_NAME_MIN = 3

const money = (n: number) =>
  '$' + n.toLocaleString('es-CO', { maximumFractionDigits: 0 })

export const ref1Schema = z
  .string()
  .regex(REF_REGEX, 'La referencia debe tener entre 6 y 20 dígitos')

export const ref2Schema = z
  .string()
  .regex(/^\d{0,20}$/, 'La referencia debe ser numérica')
  .optional()
  .or(z.literal(''))

export const emailSchema = z
  .string()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Ingresa un correo válido')

export const confirmWalletSchema = z.object({
  walletAddressUrl: walletAddressUrlSchema
})
export type ConfirmWalletValues = z.infer<typeof confirmWalletSchema>

/** Servicios step 1: reference lookup. */
export const serviciosRefSchema = z.object({ ref1: ref1Schema })
export type ServiciosRefValues = z.infer<typeof serviciosRefSchema>

/** Servicios step 2 for a bill that allows partial payments. */
export function serviciosPartialSchema(bill: number) {
  const min = Math.min(MIN_AMOUNT, bill)
  return z.object({
    amount: z
      .number({
        invalid_type_error: `Ingresa un valor entre ${money(min)} y ${money(bill)}`
      })
      .int()
      .min(min, `Ingresa un valor entre ${money(min)} y ${money(bill)}`)
      .max(bill, `Ingresa un valor entre ${money(min)} y ${money(bill)}`),
    email: emailSchema
  })
}

export const serviciosEmailSchema = z.object({ email: emailSchema })

/** Facturas: create/edit saved invoice. */
export const facturaNombreSchema = z
  .string()
  .trim()
  .min(FACTURA_NAME_MIN, 'El nombre debe tener al menos 3 caracteres')
  .max(30)

export const facturaNuevaSchema = z.object({
  name: facturaNombreSchema,
  ref1: z
    .string()
    .regex(REF_REGEX, 'Digita una referencia numérica de mínimo 6 dígitos'),
  ref2: ref2Schema
})
export type FacturaNuevaValues = z.infer<typeof facturaNuevaSchema>

export const facturaEditarSchema = z.object({ name: facturaNombreSchema })
export type FacturaEditarValues = z.infer<typeof facturaEditarSchema>

/** Facturas: pay a saved invoice (amount always editable). */
export const facturaPagarSchema = z.object({
  amount: z
    .number({
      invalid_type_error: `El valor debe estar entre ${money(MIN_AMOUNT)} y ${money(MAX_FACTURA_AMOUNT)}`
    })
    .int()
    .min(
      MIN_AMOUNT,
      `El valor debe estar entre ${money(MIN_AMOUNT)} y ${money(MAX_FACTURA_AMOUNT)}`
    )
    .max(
      MAX_FACTURA_AMOUNT,
      `El valor debe estar entre ${money(MIN_AMOUNT)} y ${money(MAX_FACTURA_AMOUNT)}`
    ),
  email: emailSchema
})
export type FacturaPagarValues = z.infer<typeof facturaPagarSchema>
