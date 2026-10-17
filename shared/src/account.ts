// Cuenta Insieme (opcional): registro, sesión, facturas y destinos guardados,
// grant de pago en un clic guardado en el servidor.
//
// Demo sobre la testnet: el registro termina con una contraseña y su
// confirmación; NO se verifica correo, celular ni identidad (sin OTP, sin KYC).
import { z } from 'zod'
import { brebResolveSchema, efectyQuoteSchema, REF_REGEX } from './validation'
import type { BrebKeyType } from './types'

const noControlChars = (s: string) =>
  ![...s].some((c) => {
    const code = c.charCodeAt(0)
    return code < 32 || code === 127
  })
const CONTROL_MSG = { message: 'Caracteres no permitidos' }

export const accountEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine(noControlChars, CONTROL_MSG)
  .pipe(z.string().email({ message: 'Ingresa un correo válido' }))

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, {
    message: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`
  })
  .max(PASSWORD_MAX, {
    message: `La contraseña no puede superar ${PASSWORD_MAX} caracteres`
  })

/** Cédula, pasaporte u otro ID: alfanumérico, sin verificación. */
export const documentSchema = z
  .string()
  .transform((v) => v.replace(/[.\s-]/g, '').toUpperCase())
  .pipe(
    z.string().regex(/^[A-Z0-9]{5,20}$/, {
      message: 'El documento debe tener entre 5 y 20 letras o números'
    })
  )

export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s()+-]/g, ''))
  .pipe(
    z.string().regex(/^\d{7,15}$/, {
      message: 'El celular debe tener entre 7 y 15 dígitos'
    })
  )

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Escribe tu nombre completo' })
      .max(80)
      .refine(noControlChars, CONTROL_MSG),
    document: documentSchema,
    email: accountEmailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    passwordConfirm: z.string()
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirm']
  })

export const loginSchema = z.object({
  email: accountEmailSchema,
  password: z.string().min(1, { message: 'Ingresa tu contraseña' })
})

export interface AccountUser {
  id: string
  name: string
  document: string
  email: string
  phone: string
  createdAt: string
}

/** POST /auth/register (201) y POST /auth/login (200). */
export interface SessionResponse {
  /** Bearer token; el servidor guarda solo su hash. */
  token: string
  user: AccountUser
}

/** GET /me. El grant nunca expone accessToken ni manageUrl. */
export interface MeResponse {
  user: AccountUser
  grant: { walletAddressUrl: string; createdAt: string } | null
}

// ----- Facturas guardadas (reemplazan al localStorage 'mb-facturas') -----

export const saveBillSchema = z.object({
  productId: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(3, { message: 'El nombre debe tener al menos 3 caracteres' })
    .max(30)
    .refine(noControlChars, CONTROL_MSG),
  ref1: z.string().regex(REF_REGEX, {
    message: 'La referencia debe tener entre 6 y 20 dígitos'
  }),
  ref2: z
    .string()
    .regex(/^\d{0,20}$/, { message: 'La referencia debe ser numérica' })
    .optional()
})

export const updateBillSchema = saveBillSchema
  .omit({ productId: true })
  .partial()
  .extend({
    lastAmount: z.number().int().positive().optional(),
    lastPaidAt: z.string().datetime().optional()
  })

export interface SavedBill {
  id: string
  productId: string
  name: string
  ref1: string
  ref2: string | null
  lastAmount: number | null
  lastPaidAt: string | null
  createdAt: string
  updatedAt: string
}

// ----- Destinos guardados (Giro Efecty y Transferencia Bre-B) -----

export type DestinationKind = 'efecty' | 'breb'

export interface EfectyDestinationDetails {
  recipientDocument: string
  recipientName: string
  recipientPhone?: string
}

export interface BrebDestinationDetails {
  key: string
  keyType?: BrebKeyType
  holderName?: string
  bank?: string
}

const labelSchema = z
  .string()
  .trim()
  .min(1, { message: 'Escribe un nombre para este destino' })
  .max(40)
  .refine(noControlChars, CONTROL_MSG)

const shortText = z
  .string()
  .trim()
  .max(80)
  .refine(noControlChars, CONTROL_MSG)
  .optional()

/**
 * POST /me/destinations: upsert por (kind, identidad) donde la identidad es
 * `recipientDocument` (efecty) o `key` (breb). Responde 200 con el destino.
 */
export const saveDestinationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('efecty'),
    label: labelSchema.optional(),
    details: efectyQuoteSchema.omit({ amount: true }),
    lastAmount: z.number().int().positive().optional()
  }),
  z.object({
    kind: z.literal('breb'),
    label: labelSchema.optional(),
    details: brebResolveSchema.extend({
      keyType: z
        .enum(['phone', 'email', 'document', 'alphanumeric'])
        .optional(),
      holderName: shortText,
      bank: shortText
    }),
    lastAmount: z.number().int().positive().optional()
  })
])

export const updateDestinationSchema = z.object({
  label: labelSchema.optional(),
  lastAmount: z.number().int().positive().optional(),
  lastUsedAt: z.string().datetime().optional()
})

export type SavedDestination =
  | {
      id: string
      kind: 'efecty'
      label: string
      details: EfectyDestinationDetails
      lastAmount: number | null
      lastUsedAt: string | null
      createdAt: string
      updatedAt: string
    }
  | {
      id: string
      kind: 'breb'
      label: string
      details: BrebDestinationDetails
      lastAmount: number | null
      lastUsedAt: string | null
      createdAt: string
      updatedAt: string
    }

// ----- Grant de pago en un clic en la cuenta -----

/**
 * POST /orders/setup-one-click/finish: con sesión, el grant se guarda en la
 * cuenta y NO viaja al cliente (`storedInAccount: true`, sin tokens). Sin
 * sesión, se devuelve como hoy para el token-store del navegador.
 */
export interface SetupFinishResponse {
  walletAddressUrl: string
  storedInAccount: boolean
  accessToken?: string
  manageUrl?: string
}

/**
 * POST /orders/instant-buy: con sesión y grant guardado, `accessToken` y
 * `manageUrl` pueden omitirse; el servidor usa (y rota) el grant de la cuenta
 * y no devuelve tokens. Un 401 de Open Payments borra el grant guardado.
 */
export interface InstantBuyAccountResponse {
  walletAddressUrl: string
  orderId: string
  accessToken?: string
  manageUrl?: string
}
