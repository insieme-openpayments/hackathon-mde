import { z } from 'zod'

export const walletAddressUrlSchema = z
  .string()
  .transform((val) => val.replace('$', 'https://'))
  .pipe(z.string().url({ message: 'Invalid wallet address.' }))

export const REF_REGEX = /^\d{6,20}$/

const refSchema = z
  .string()
  .regex(REF_REGEX, {
    message: 'La referencia debe tener entre 6 y 20 dígitos'
  })

export const billLookupSchema = z.object({
  productId: z.string().uuid(),
  ref1: refSchema
})

export const catalogQuerySchema = z.object({
  type: z.enum(['servicio']).optional(),
  category: z.string().min(1).optional()
})

export const orderDetailsSchema = z.object({
  ref1: refSchema,
  ref2: z.string().trim().max(40).optional(),
  email: z.string().trim().email({ message: 'Correo inválido' }).optional(),
  document: z.string().trim().max(40).optional()
})

export const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.literal(1).optional(),
  kind: z.enum(['servicio', 'factura']),
  amount: z.number().int().positive().optional(),
  details: orderDetailsSchema
})

export const createOrderSchema = z.object({
  walletAddressUrl: walletAddressUrlSchema,
  products: z.array(orderItemSchema).length(1)
})

export const instantBuySchema = createOrderSchema.extend({
  accessToken: z.string(),
  manageUrl: z.string().url()
})

export const finishOrderSchema = z.object({
  result: z.enum(['grant_rejected', 'grant_invalid']).optional(),
  hash: z.string().optional(),
  interactRef: z.string().uuid().optional()
})

export const setupFinishSchema = finishOrderSchema.extend({
  identifier: z.string().uuid()
})

export const oneClickSetupSchema = z.object({
  walletAddressUrl: walletAddressUrlSchema,
  amount: z
    .union([z.string(), z.number()])
    .refine((value) => !isNaN(Number(value)), {
      message: 'Must be a valid number'
    })
})
