import { Env } from '@/config/env'
import { initLogger } from '@/lib'

export const generateLogger = (env: Env) => initLogger(env.NODE_ENV)
