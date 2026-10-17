import { z } from 'zod'
import type {
  SavedDestination as SavedDestinationDto,
  saveDestinationSchema,
  updateDestinationSchema
} from '@insieme/shared'
import { NotFound, isUniqueViolation } from '@/lib'
import { SavedDestinationRow } from './destination-model'

type SaveInput = z.infer<typeof saveDestinationSchema>
type UpdateInput = z.infer<typeof updateDestinationSchema>

export interface ISavedDestinationService {
  list: (userId: string) => Promise<SavedDestinationDto[]>
  save: (userId: string, input: SaveInput) => Promise<SavedDestinationDto>
  update: (
    userId: string,
    id: string,
    input: UpdateInput
  ) => Promise<SavedDestinationDto>
  remove: (userId: string, id: string) => Promise<void>
}

export function toDestinationDto(d: SavedDestinationRow): SavedDestinationDto {
  return {
    id: d.id,
    kind: d.kind,
    label: d.label,
    details: d.details,
    lastAmount: d.lastAmount ?? null,
    lastUsedAt: d.lastUsedAt ? new Date(d.lastUsedAt).toISOString() : null,
    createdAt: new Date(d.createdAt).toISOString(),
    updatedAt: new Date(d.updatedAt).toISOString()
  } as unknown as SavedDestinationDto
}

const isUuid = (id: string) => z.string().uuid().safeParse(id).success

const clean = <T extends Record<string, unknown>>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T

function identityAndLabel(input: SaveInput): {
  identity: string
  label: string
  details: Record<string, unknown>
} {
  if (input.kind === 'efecty') {
    return {
      identity: input.details.recipientDocument,
      label: input.label ?? input.details.recipientName,
      details: clean(input.details)
    }
  }
  const key = input.details.key
  return {
    identity: key.trim().toLowerCase(),
    label: input.label ?? input.details.holderName ?? key,
    details: clean(input.details)
  }
}

export class SavedDestinationService implements ISavedDestinationService {
  private async owned(
    userId: string,
    id: string
  ): Promise<SavedDestinationRow> {
    const row = isUuid(id)
      ? await SavedDestinationRow.query().findOne({ id, userId })
      : undefined
    if (!row) throw new NotFound('Destino no encontrado')
    return row
  }

  public async list(userId: string): Promise<SavedDestinationDto[]> {
    const rows = await SavedDestinationRow.query()
      .where({ userId })
      .orderByRaw('"lastUsedAt" DESC NULLS LAST')
      .orderBy('createdAt', 'desc')
    return rows.map(toDestinationDto)
  }

  public async save(
    userId: string,
    input: SaveInput
  ): Promise<SavedDestinationDto> {
    const { identity, label, details } = identityAndLabel(input)
    const upsert = async () => {
      const existing = await SavedDestinationRow.query().findOne({
        userId,
        kind: input.kind,
        identity
      })
      if (!existing) return undefined
      const updated = await existing.$query().patchAndFetch({
        // Sin etiqueta explícita se conserva la que el usuario ya tenía.
        label: input.label ?? existing.label,
        details: { ...(existing.details ?? {}), ...details },
        lastAmount: input.lastAmount ?? existing.lastAmount,
        lastUsedAt: new Date()
      })
      return toDestinationDto(updated)
    }

    const found = await upsert()
    if (found) return found
    try {
      const row = await SavedDestinationRow.query().insert({
        userId,
        kind: input.kind,
        identity,
        label,
        details,
        lastAmount: input.lastAmount ?? null,
        lastUsedAt: new Date()
      })
      return toDestinationDto(row)
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
      const raced = await upsert()
      if (raced) return raced
      throw err
    }
  }

  public async update(
    userId: string,
    id: string,
    input: UpdateInput
  ): Promise<SavedDestinationDto> {
    const row = await this.owned(userId, id)
    const patch: Partial<SavedDestinationRow> = {}
    if (input.label !== undefined) patch.label = input.label
    if (input.lastAmount !== undefined) patch.lastAmount = input.lastAmount
    if (input.lastUsedAt !== undefined)
      patch.lastUsedAt = new Date(input.lastUsedAt)
    if (Object.keys(patch).length === 0) return toDestinationDto(row)
    return toDestinationDto(await row.$query().patchAndFetch(patch))
  }

  public async remove(userId: string, id: string): Promise<void> {
    const row = await this.owned(userId, id)
    await row.$query().delete()
  }
}
