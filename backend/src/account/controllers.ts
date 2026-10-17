import type { NextFunction, Request } from 'express'
import {
  saveBillSchema,
  saveDestinationSchema,
  updateBillSchema,
  updateDestinationSchema
} from '@insieme/shared'
import type { MeResponse, SavedBill, SavedDestination } from '@insieme/shared'
import { Controller, Unauthorized, toSuccessResponse } from '@/lib'
import { validate } from '@/middleware/validate'
import { toAccountUser } from '@/auth/service'
import type { IUserService } from '@/user/service'
import type { IOpenPayments } from '@/open-payments/service'
import type { User } from '@/user/model'
import type { ISavedBillService } from './bill-service'
import type { ISavedDestinationService } from './destination-service'

/** requireAuth ya garantiza req.user; esto solo estrecha el tipo. */
function currentUser(req: Request): User {
  if (!req.user) throw new Unauthorized('Inicia sesión para continuar')
  return req.user
}

export interface IMeController {
  me: Controller<MeResponse>
  clearGrant: Controller
}

export class MeController implements IMeController {
  constructor(
    private userService: IUserService,
    private openPayments: IOpenPayments
  ) {}

  me = async (
    req: Request,
    res: TypedResponse<MeResponse>,
    next: NextFunction
  ) => {
    try {
      const user = currentUser(req)
      const grant = user.oneClickGrant
      res.status(200).json(
        toSuccessResponse({
          user: toAccountUser(user),
          grant: grant
            ? {
                walletAddressUrl: grant.walletAddressUrl,
                createdAt: grant.createdAt
              }
            : null
        })
      )
    } catch (err) {
      next(err)
    }
  }

  clearGrant = async (req: Request, res: TypedResponse, next: NextFunction) => {
    try {
      const user = currentUser(req)
      const grant = user.oneClickGrant
      await this.userService.clearGrant(user.id)
      if (grant) {
        // Best-effort: leave no orphan token in the payer's wallet.
        void this.openPayments
          .revokeToken({
            accessToken: grant.accessToken,
            manageUrl: grant.manageUrl
          })
          .catch(() => undefined)
      }
      res.status(200).json(toSuccessResponse())
    } catch (err) {
      next(err)
    }
  }
}

export interface ISavedBillController {
  list: Controller<SavedBill[]>
  save: Controller<SavedBill>
  update: Controller<SavedBill>
  remove: Controller
}

export class SavedBillController implements ISavedBillController {
  constructor(private savedBillService: ISavedBillService) {}

  list = async (
    req: Request,
    res: TypedResponse<SavedBill[]>,
    next: NextFunction
  ) => {
    try {
      const bills = await this.savedBillService.list(currentUser(req).id)
      res.status(200).json(toSuccessResponse(bills))
    } catch (err) {
      next(err)
    }
  }

  save = async (
    req: Request,
    res: TypedResponse<SavedBill>,
    next: NextFunction
  ) => {
    try {
      const input = await validate(saveBillSchema, req.body)
      const { bill, created } = await this.savedBillService.save(
        currentUser(req).id,
        input
      )
      res.status(created ? 201 : 200).json(toSuccessResponse(bill))
    } catch (err) {
      next(err)
    }
  }

  update = async (
    req: Request,
    res: TypedResponse<SavedBill>,
    next: NextFunction
  ) => {
    try {
      const input = await validate(updateBillSchema, req.body)
      const bill = await this.savedBillService.update(
        currentUser(req).id,
        req.params.id,
        input
      )
      res.status(200).json(toSuccessResponse(bill))
    } catch (err) {
      next(err)
    }
  }

  remove = async (req: Request, res: TypedResponse, next: NextFunction) => {
    try {
      await this.savedBillService.remove(currentUser(req).id, req.params.id)
      res.status(200).json(toSuccessResponse())
    } catch (err) {
      next(err)
    }
  }
}

export interface ISavedDestinationController {
  list: Controller<SavedDestination[]>
  save: Controller<SavedDestination>
  update: Controller<SavedDestination>
  remove: Controller
}

export class SavedDestinationController implements ISavedDestinationController {
  constructor(private savedDestinationService: ISavedDestinationService) {}

  list = async (
    req: Request,
    res: TypedResponse<SavedDestination[]>,
    next: NextFunction
  ) => {
    try {
      const rows = await this.savedDestinationService.list(currentUser(req).id)
      res.status(200).json(toSuccessResponse(rows))
    } catch (err) {
      next(err)
    }
  }

  save = async (
    req: Request,
    res: TypedResponse<SavedDestination>,
    next: NextFunction
  ) => {
    try {
      const input = await validate(saveDestinationSchema, req.body)
      const row = await this.savedDestinationService.save(
        currentUser(req).id,
        input
      )
      res.status(200).json(toSuccessResponse(row))
    } catch (err) {
      next(err)
    }
  }

  update = async (
    req: Request,
    res: TypedResponse<SavedDestination>,
    next: NextFunction
  ) => {
    try {
      const input = await validate(updateDestinationSchema, req.body)
      const row = await this.savedDestinationService.update(
        currentUser(req).id,
        req.params.id,
        input
      )
      res.status(200).json(toSuccessResponse(row))
    } catch (err) {
      next(err)
    }
  }

  remove = async (req: Request, res: TypedResponse, next: NextFunction) => {
    try {
      await this.savedDestinationService.remove(
        currentUser(req).id,
        req.params.id
      )
      res.status(200).json(toSuccessResponse())
    } catch (err) {
      next(err)
    }
  }
}
