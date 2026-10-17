import type { NextFunction, Request, Response } from 'express'
import { Unauthorized } from '@/lib'
import type { IAuthService } from '@/auth/service'

export function getBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization
  if (!header) return undefined
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined
  return token
}

/** 401 si falta el token o la sesión expiró; coloca req.user. */
export const requireAuth =
  (authService: IAuthService) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = getBearerToken(req)
      const user = token ? await authService.authenticate(token) : undefined
      if (!user) throw new Unauthorized('Inicia sesión para continuar')
      req.user = user
      next()
    } catch (err) {
      next(err)
    }
  }

/** Silencioso: coloca req.user si el token es válido y sigue sin él si no. */
export const optionalAuth =
  (authService: IAuthService) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = getBearerToken(req)
      const user = token ? await authService.authenticate(token) : undefined
      if (user) req.user = user
    } catch {
      // Sesión inválida o error transitorio: se trata como anónimo.
    }
    next()
  }
