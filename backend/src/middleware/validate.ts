import { z } from 'zod'
import { BadRequest } from '@/lib'

export async function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): Promise<z.infer<T>> {
  const res = await schema.safeParseAsync(data)
  if (!res.success) {
    const errors: Record<string, string> = {}
    res.error.issues.forEach((i) => {
      errors[i.path.join('.')] = i.message
    })

    throw new BadRequest('Invalid input', errors)
  }
  return res.data
}
