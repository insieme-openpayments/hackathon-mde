import {
  AwilixContainer,
  InjectionMode,
  asClass,
  asFunction,
  asValue,
  createContainer as createAwilixContainer
} from 'awilix'
import type { Env } from './config/env'
import { type Knex } from 'knex'
import { Logger } from 'winston'
import { ProductService, type IProductService } from './product/service'
import { OrderService, type IOrderService } from './order/service'
import { UserService, type IUserService } from './user/service'
import { IProductController, ProductController } from './product/controller'
import { IOrderController, OrderController } from './order/controller'
import {
  AuthenticatedClient,
  createAuthenticatedClient
} from '@interledger/open-payments'
import { IOpenPayments, OpenPayments } from './open-payments/service'
import { TokenCache } from './cache/token'
import { IPaymentService, PaymentService } from './payment/service'
import { type OneClickCache, OneClickCacheData } from './cache/one-click'
import { BillService, type IBillService } from './bill/service'
import { MoneyService, type IMoneyService } from './money/service'
import { MoneyController, type IMoneyController } from './money/controller'
import { BillController, type IBillController } from './bill/controller'
import type { BillSnapshot, BillSnapshotCache } from './cache/bill-snapshot'
import {
  IntegrationClient,
  type IIntegrationClient
} from './integration/client'
import {
  SettlementService,
  type ISettlementService
} from './settlement/service'
import { CatalogSyncService, type ICatalogSyncService } from './catalog/sync'
import { generateLogger } from '@/config/logger'
import { generateKnex } from '@/config/knex'
import { asClassSingletonWithLogger, InMemoryCache } from '@/lib'

export interface Cradle {
  env: Env
  logger: Logger
  knex: Knex
  opClient: AuthenticatedClient
  oneClickCache: OneClickCache
  billSnapshotCache: BillSnapshotCache
  integrationClient: IIntegrationClient | null
  tokenCache: TokenCache
  openPayments: IOpenPayments
  userService: IUserService
  productService: IProductService
  orderService: IOrderService
  productController: IProductController
  orderController: IOrderController
  paymentService: IPaymentService
  billService: IBillService
  billController: IBillController
  moneyService: IMoneyService
  moneyController: IMoneyController
  catalogSyncService: ICatalogSyncService
  settlementService: ISettlementService
}

export async function createContainer(
  env: Env
): Promise<AwilixContainer<Cradle>> {
  const container = createAwilixContainer<Cradle>({
    injectionMode: InjectionMode.CLASSIC
  })

  const logger = generateLogger(env)

  const client = await createAuthenticatedClient({
    keyId: env.KEY_ID,
    privateKey: Buffer.from(env.PRIVATE_KEY, 'base64'),
    walletAddressUrl: env.PAYMENT_POINTER,
    useHttp: env.USE_HTTP_FOR_OPEN_PAYMENTS || false
  })

  container.register({
    env: asValue(env),
    logger: asValue(logger),
    opClient: asValue(client),
    openPayments: asClassSingletonWithLogger(OpenPayments, logger),
    tokenCache: asClassSingletonWithLogger(TokenCache, logger),
    oneClickCache: asClass(InMemoryCache<OneClickCacheData>).singleton(),
    billSnapshotCache: asClass(InMemoryCache<BillSnapshot>).singleton(),
    integrationClient: asValue(
      env.INTEGRATION_API_URL
        ? new IntegrationClient(
            env.INTEGRATION_API_URL,
            env.INTEGRATION_API_KEY
          )
        : null
    ),
    knex: asFunction(generateKnex).singleton(),
    userService: asClass(UserService).singleton(),
    productService: asClassSingletonWithLogger(ProductService, logger),
    orderService: asClassSingletonWithLogger(OrderService, logger),
    productController: asClassSingletonWithLogger(ProductController, logger),
    orderController: asClassSingletonWithLogger(OrderController, logger),
    paymentService: asClassSingletonWithLogger(PaymentService, logger),
    billService: asClassSingletonWithLogger(BillService, logger),
    billController: asClassSingletonWithLogger(BillController, logger),
    moneyService: asClassSingletonWithLogger(MoneyService, logger),
    moneyController: asClassSingletonWithLogger(MoneyController, logger),
    catalogSyncService: asClassSingletonWithLogger(CatalogSyncService, logger),
    settlementService: asClassSingletonWithLogger(SettlementService, logger)
  })

  return container
}
