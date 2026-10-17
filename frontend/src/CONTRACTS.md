# Frontend stub contracts (package P0 Bootstrap)

Every file below exists, compiles and has minimal behaviour. The exported
names and prop/signature shapes are the contract: implement the body, do not
change the signature without recording it in your `openIssues`.

Packages: **P1** design-system, **P2** data-stores, **P3** servicios+home,
**P4** facturas, **P5** payment+confirmation.

## Types and helpers

| File               | Exports                                                                                                                                                                                                                                                  | Package |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `lib/api-types.ts` | `Category`, `CatalogProduct`, `CatalogResponse`, `BillLookupResult`, `OrderItemKind`, `OrderItemDetails`, `OrderItemInput`, `enum OrderStatus` (PROCESSING, FAILED, COMPLETED, REJECTED, SETTLED, SETTLEMENT_FAILED), `OrderReceipt`, `OrderReceiptItem` | P2      |
| `lib/money.ts`     | `money(n)` -> `$80.000`, `num(n)`, `digits(s)`, `formatDateTime(date?)` -> `dd/mm/yyyy H:mm`, `today()`                                                                                                                                                  | P2      |
| `lib/assets.ts`    | `resolveAssetUrl(logo)` (relative to `/images/`), `categoryIcon(icon)` (STUB: maps to `/assets/servicios/<icon>`)                                                                                                                                        | P2      |
| `lib/schemas.ts`   | `walletAddressUrlSchema` (re-export), `REF_REGEX`, `MIN_AMOUNT`, `MAX_FACTURA_AMOUNT`, `ref1Schema`, `emailSchema`, `confirmWalletSchema`                                                                                                                | P2      |

## Stores (valtio, persisted via `lib/valtio-persist.ts`)

| File                                                        | API                                                                                                                                                                                                                                                                                                     | Package            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `lib/stores/payment-draft-store.ts` (`payment-draft-store`) | `paymentDraftStore`, `setPaymentDraft(partial)`, `clearPaymentDraft()`; state `{productId, ref1, ref2, amount, email, kind, facturaId, returnTo}`                                                                                                                                                       | P2 shape, P5 usage |
| `lib/stores/facturas-store.ts` (key `mb-facturas`)          | Legacy local store, only read for the one-time import into the account: `facturasStore {items: FacturaItem[]}`, `clearLocalFacturas()`, `isFacturaAvailable`; `FacturaItem {id,name,cat,conv,productId,ref1,ref2,lastPay,amount}`; zod guard on load. With a session the source of truth is `/me/bills` | P2, cuenta         |
| `lib/stores/profile-store.ts`                               | `profileStore {email, walletAddressUrl}`, `setProfile(partial)`                                                                                                                                                                                                                                         | P2                 |
| `hooks/use-facturas-store.ts`, `hooks/use-profile-store.ts` | `useFacturasStore()` (`{items, isLoggedIn, isLoading, isError}` from `/me/bills`, runs the one-time import), `useFacturasWithAvailability()`, `useFacturaActions()` (async `addFactura`, `updateFactura`, `removeFactura`, `markPaid(id, amount, date?)` over `/me/bills`), `useProfileStore()`         | P2, cuenta         |

## Hooks

| File                                                                                        | Signature                                                                                                                                                                 | Package                                       |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `hooks/use-catalog-query.ts`                                                                | `useCatalogQuery(type='servicio')` -> `{categories, products}` in `data.result`; `searchProducts(products, query)`                                                        | P2                                            |
| `hooks/use-bill-lookup-mutation.ts`                                                         | `useBillLookupMutation(options?)`, params `{productId, ref1}` -> `BillLookupResult`; error keys `productId`, `ref1`                                                       | P2                                            |
| `hooks/use-create-order-mutation.ts`                                                        | params `{walletAddressUrl, products: [OrderItemInput]}` -> `{redirectUrl, orderId}`; error keys flat (`walletAddressUrl`, `amount`, `ref1`, `ref2`, `email`, `productId`) | P2 (done), P5 uses                            |
| `hooks/use-instant-buy-mutation.ts`                                                         | same params + `{accessToken, manageUrl}` -> `{accessToken, manageUrl, walletAddressUrl, orderId}`                                                                         | P2 (done), P5 uses (401/limit handling is P5) |
| `hooks/use-order-query.ts`                                                                  | `useOrderQuery(id)` -> `OrderReceipt`; polls 2 s while `PROCESSING`/`COMPLETED`; re-exports `OrderStatus`                                                                 | P2 (done), P5 uses                            |
| `use-setup-one-click-mutation`, `use-finish-setup-mutation`, `use-finish-checkout-mutation` | unchanged, import `@insieme/shared`                                                                                                                                       | -                                             |

## Design system (`components/insieme`, barrel `index.ts`; prop types in `types.ts`)

All implemented as stubs in `layout.tsx`, `tip.tsx`, `inputs.tsx`, `catalog.tsx`,
`display.tsx`. **Decision:** `SupportNote`, `Receipt`, `Pasarela`, `StatusTracker`
live in `components/insieme/display.tsx` (NOT `components/payment`).
P1 restyles all of them to match the prototype (keep prop types); P5 may refine
`StatusTracker` / `Receipt` behaviour (steps derived from `status` / `events`).

`Logo`, `BrandFooter`, `BackButton{onClick,label?}`, `StepTitle{n,text,tip?}`,
`Tip{children,defaultOpen?,autoCloseMs?,icon?}`, `FloatingInput` (forwardRef, RHF
`register` compatible, `label`, `error`, `trailing`), `MoneyInput{value:number|null,onChange,label,error?}`,
`SearchInput{value,onChange,placeholder?}`, `CategoryGrid{categories,onSelect(id)}` /
`CategoryCard`, `CompanyList{products,onSelect(product),empty?}` / `CompanyRow` /
`CompanyLogo{name,logo}`, `SortSelect{value:'asc'|'desc',onChange}`, `KvRows{rows: KvRow[]}`
(`KvRow {label, value: ReactNode, className?}`), `SupportNote` (correo y WhatsApp de soporte),
`Receipt{title,tone?,subtitle?,rows,children?}`, `Pasarela{icon?,message?}`,
`StatusTracker{status,events}` (+ `TRACKER_STEPS`), `DialogCard{icon?,text,large?,children}`,
`TitleBox`, `Actions`, `Screen{gray?}`.

Other P1 work: rewrite `components/ui/button.tsx` (variants active/disabled/dark/solid/outline/secondary/link),
restyle `ui/tabs.tsx`, toasts, fix nonexistent classes in `ui/form/*`, `loader.tsx`, `sheet.tsx`
(they still use removed tokens: `green-dark`, `pink-neon`, `dark:` ...). `components/icons.tsx` `Logo`
is a placeholder SVG; P1 restyles it.

## Payment (`components/payment`)

| File                         | Contract                                                                                                                                                                                                       | Package |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `confirm-panel.tsx`          | `ConfirmPanel({rows: KvRow[], amount, productId, kind, details: OrderItemDetails, source: 'servicios'\|'facturas', facturaId?, enabled, onBack})` (STUB, renders a static panel)                               | P5      |
| `one-click-setup-dialog.tsx` | moved from `app/cart/components/one-click-setup.tsx`; still English copy, still self-contained trigger button (`OneClickSetupDialog({buttonClassName?})`) - P5 translates and adapts opening from ConfirmPanel | P5      |

## Routes (`app/index.tsx`, all children of `components/layouts/app-shell.tsx`)

`/` (home/index) P3 · `/servicios` (servicios/index) P3 · `/servicios/categoria/:categoryId` (categoria) P3 ·
`/servicios/pagar/:productId?ref1=` (pagar) P3 · `/facturas` (index), `/facturas/nueva`, `/facturas/guardada`,
`/facturas/:id/editar`, `/facturas/:id/pagar` P4 · `/checkout/confirmation` (fixed by backend; `errorElement` -> `/`)
P5 · `/cart/finish` (fixed by backend; already uses Spanish copy and `paymentDraftStore.returnTo`) P5 · `*` -> `/`.
Each screen file is a placeholder exporting `Component`; replace the file contents only.
`app/route-schemas.ts` has `categoryParamsSchema`, `productParamsSchema`, `facturaParamsSchema`,
`serviciosPagarSearchParamsSchema`, `checkoutConfirmationSearchParamsSchema`, `oneClickConfirmationSearchParamsSchema`.
