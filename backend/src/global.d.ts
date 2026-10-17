import type { Response } from 'express'
import type { User } from '@/user/model'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Send<ResBody = any, T = Response<ResBody>> = (body?: ResBody) => T

  interface TypedResponse<TData = undefined, TBody = TypedResponseBody<TData>>
    extends Response {
    json: Send<TBody, this>
  }

  namespace Express {
    interface Request {
      /** Set by requireAuth / optionalAuth; ownership always comes from here. */
      user?: User
    }
  }
}
