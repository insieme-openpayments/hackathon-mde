import { Env } from '@/config/env'
import { createKnex } from '@/lib'

export const generateKnex = (env: Env) => createKnex(env.DATABASE_URL)
