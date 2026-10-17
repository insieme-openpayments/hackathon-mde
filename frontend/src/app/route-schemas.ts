import { z } from 'zod'

export const categoryParamsSchema = z.object({ categoryId: z.string() })
export const productParamsSchema = z.object({ productId: z.string() })
export const facturaParamsSchema = z.object({ id: z.string() })

export const serviciosPagarSearchParamsSchema = z.object({
  ref1: z.string().optional()
})

export const checkoutConfirmationSearchParamsSchema = z.object({
  result: z.enum(['grant_rejected', 'grant_invalid']).optional(),
  hash: z.string().optional(),
  interact_ref: z.string().uuid().optional(),
  orderId: z.string().uuid()
})

export const oneClickConfirmationSearchParamsSchema =
  checkoutConfirmationSearchParamsSchema
    .omit({
      orderId: true
    })
    .extend({
      identifier: z.string().uuid()
    })

// Sin .uuid(): un ?destino malformado no debe tumbar la ruta; simplemente no
// coincide con ningún destino guardado y la página arranca vacía.
export const destinoSearchParamsSchema = z.object({
  destino: z.string().optional()
})

export const nextSearchParamsSchema = z.object({
  next: z.string().optional()
})
