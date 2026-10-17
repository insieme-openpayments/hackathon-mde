import { z } from 'zod'
import type {
  SavedBill as SavedBillDto,
  saveBillSchema,
  updateBillSchema
} from '@insieme/shared'
import { BadRequest, Conflict, NotFound, isUniqueViolation } from '@/lib'
import { Product } from '@/product/model'
import { SavedBill } from './bill-model'

type SaveInput = z.infer<typeof saveBillSchema>
type UpdateInput = z.infer<typeof updateBillSchema>

export interface ISavedBillService {
  list: (userId: string) => Promise<SavedBillDto[]>
  /** `created` es false cuando (productId, ref1) ya existía. */
  save: (
    userId: string,
    input: SaveInput
  ) => Promise<{ bill: SavedBillDto; created: boolean }>
  update: (
    userId: string,
    id: string,
    input: UpdateInput
  ) => Promise<SavedBillDto>
  remove: (userId: string, id: string) => Promise<void>
}

export function toBillDto(b: SavedBill): SavedBillDto {
  return {
    id: b.id,
    productId: b.productId,
    name: b.name,
    ref1: b.ref1,
    ref2: b.ref2 ?? null,
    lastAmount: b.lastAmount ?? null,
    lastPaidAt: b.lastPaidAt ? new Date(b.lastPaidAt).toISOString() : null,
    createdAt: new Date(b.createdAt).toISOString(),
    updatedAt: new Date(b.updatedAt).toISOString()
  }
}

const isUuid = (id: string) => z.string().uuid().safeParse(id).success

export class SavedBillService implements ISavedBillService {
  private async owned(userId: string, id: string): Promise<SavedBill> {
    // Un recurso ajeno o inexistente responde igual: 404, sin filtrar existencia.
    const bill = isUuid(id)
      ? await SavedBill.query().findOne({ id, userId })
      : undefined
    if (!bill) throw new NotFound('Factura no encontrada')
    return bill
  }

  public async list(userId: string): Promise<SavedBillDto[]> {
    const rows = await SavedBill.query()
      .where({ userId })
      .orderByRaw('"lastPaidAt" DESC NULLS LAST')
      .orderBy('createdAt', 'desc')
    return rows.map(toBillDto)
  }

  public async save(userId: string, input: SaveInput) {
    const product = await Product.query().findById(input.productId)
    if (!product || product.type !== 'servicio') {
      throw new BadRequest('Invalid input', {
        productId: 'Servicio no encontrado'
      })
    }
    const patch = { name: input.name, ref2: input.ref2 ?? null }
    const upsertExisting = async () => {
      const existing = await SavedBill.query().findOne({
        userId,
        productId: input.productId,
        ref1: input.ref1
      })
      if (!existing) return undefined
      const updated = await existing.$query().patchAndFetch(patch)
      return { bill: toBillDto(updated), created: false }
    }

    const found = await upsertExisting()
    if (found) return found
    try {
      const bill = await SavedBill.query().insert({
        userId,
        productId: input.productId,
        ref1: input.ref1,
        ...patch
      })
      return { bill: toBillDto(bill), created: true }
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
      const raced = await upsertExisting()
      if (raced) return raced
      throw err
    }
  }

  public async update(
    userId: string,
    id: string,
    input: UpdateInput
  ): Promise<SavedBillDto> {
    const bill = await this.owned(userId, id)
    const patch: Partial<SavedBill> = {}
    if (input.name !== undefined) patch.name = input.name
    if (input.ref1 !== undefined) patch.ref1 = input.ref1
    if (input.ref2 !== undefined) patch.ref2 = input.ref2 || null
    if (input.lastAmount !== undefined) patch.lastAmount = input.lastAmount
    if (input.lastPaidAt !== undefined)
      patch.lastPaidAt = new Date(input.lastPaidAt)
    if (Object.keys(patch).length === 0) return toBillDto(bill)
    try {
      return toBillDto(await bill.$query().patchAndFetch(patch))
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new Conflict('Factura repetida', {
          ref1: 'Ya guardaste esta factura'
        })
      }
      throw err
    }
  }

  public async remove(userId: string, id: string): Promise<void> {
    const bill = await this.owned(userId, id)
    await bill.$query().delete()
  }
}
