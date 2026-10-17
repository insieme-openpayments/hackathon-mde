import type { NextFunction, Request } from 'express'
import { loginSchema, registerSchema } from '@insieme/shared'
import type { SessionResponse } from '@insieme/shared'
import { Controller, toSuccessResponse } from '@/lib'
import { validate } from '@/middleware/validate'
import { getBearerToken } from '@/middleware/auth'
import type { IAuthService } from './service'

export interface IAuthController {
  register: Controller<SessionResponse>
  login: Controller<SessionResponse>
  logout: Controller
}

export class AuthController implements IAuthController {
  constructor(private authService: IAuthService) {}

  register = async (
    req: Request,
    res: TypedResponse<SessionResponse>,
    next: NextFunction
  ) => {
    try {
      const parsed = await validate(registerSchema, req.body)
      const input = {
        name: parsed.name,
        document: parsed.document,
        email: parsed.email,
        phone: parsed.phone,
        password: parsed.password
      }
      const session = await this.authService.register(input)
      res.status(201).json(toSuccessResponse(session))
    } catch (err) {
      next(err)
    }
  }

  login = async (
    req: Request,
    res: TypedResponse<SessionResponse>,
    next: NextFunction
  ) => {
    try {
      const { email, password } = await validate(loginSchema, req.body)
      const session = await this.authService.login(email, password)
      res.status(200).json(toSuccessResponse(session))
    } catch (err) {
      next(err)
    }
  }

  logout = async (req: Request, res: TypedResponse, next: NextFunction) => {
    try {
      const token = getBearerToken(req)
      if (token) await this.authService.logout(token)
      res.status(200).json(toSuccessResponse())
    } catch (err) {
      next(err)
    }
  }
}
