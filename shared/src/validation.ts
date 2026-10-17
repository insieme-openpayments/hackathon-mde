import { z } from 'zod'

export const walletAddressUrlSchema = z
  .string()
  .transform((val) => val.replace('$', 'https://'))
  .pipe(z.string().url({ message: 'Invalid wallet address.' }))

export const REF_REGEX = /^\d{6,20}$/

const refSchema = z.string().regex(REF_REGEX, {
  message: 'La referencia debe tener entre 6 y 20 dígitos'
})

export const billLookupSchema = z.object({
  productId: z.string().uuid(),
  ref1: refSchema
})

export const catalogQuerySchema = z.object({
  type: z.enum(['servicio', 'giro', 'transferencia']).optional(),
  category: z.string().min(1).optional()
})

const noControlChars = (s: string) =>
  ![...s].some((c) => {
    const code = c.charCodeAt(0)
    return code < 32 || code === 127
  })
const CONTROL_MSG = { message: 'Caracteres no permitidos' }

export const orderDetailsSchema = z.object({
  ref1: refSchema,
  ref2: z
    .string()
    .trim()
    .max(40)
    .refine(noControlChars, CONTROL_MSG)
    .optional(),
  email: z
    .string()
    .trim()
    .refine(noControlChars, CONTROL_MSG)
    .pipe(z.string().email({ message: 'Correo inválido' }))
    .optional(),
  document: z
    .string()
    .trim()
    .max(40)
    .refine(noControlChars, CONTROL_MSG)
    .optional()
})

export const efectyQuoteSchema = z.object({
  recipientDocument: z
    .string()
    .transform((v) => v.replace(/[.\s]/g, ''))
    .pipe(
      z.string().regex(/^\d{6,15}$/, {
        message: 'La cédula debe tener entre 6 y 15 dígitos'
      })
    ),
  recipientName: z
    .string()
    .trim()
    .min(1, { message: 'Ingresa el nombre del beneficiario' })
    .max(80)
    .refine(noControlChars, CONTROL_MSG),
  recipientPhone: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, {
      message: 'El celular debe tener entre 10 y 15 dígitos'
    })
    .optional(),
  amount: z.number().int().positive()
})

export const brebResolveSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, { message: 'Ingresa la llave Bre-B' })
    .max(64)
    .refine(noControlChars, CONTROL_MSG)
})

const emailSchema = z
  .string()
  .trim()
  .refine(noControlChars, CONTROL_MSG)
  .pipe(z.string().email({ message: 'Correo inválido' }))

const itemBase = {
  productId: z.string().uuid(),
  quantity: z.literal(1).optional()
}

export const orderItemSchema = z.discriminatedUnion('kind', [
  z.object({
    ...itemBase,
    kind: z.literal('servicio'),
    amount: z.number().int().positive().optional(),
    details: orderDetailsSchema
  }),
  z.object({
    ...itemBase,
    kind: z.literal('factura'),
    amount: z.number().int().positive(),
    details: orderDetailsSchema
  }),
  z.object({
    ...itemBase,
    kind: z.literal('efecty'),
    amount: z.number().int().positive(),
    details: efectyQuoteSchema.omit({ amount: true }).extend({
      email: emailSchema.optional()
    })
  }),
  z.object({
    ...itemBase,
    kind: z.literal('breb'),
    amount: z.number().int().positive(),
    details: brebResolveSchema.extend({
      description: z
        .string()
        .trim()
        .max(100)
        .refine(noControlChars, CONTROL_MSG)
        .optional(),
      email: emailSchema.optional()
    })
  })
])

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
