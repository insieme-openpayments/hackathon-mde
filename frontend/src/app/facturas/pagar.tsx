import { publicUrl } from '@/lib/assets.ts'
import { useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { useNavigate } from 'react-router-dom'
import {
  BrandFooter,
  FloatingInput,
  MoneyInput,
  Screen,
  Tip
} from '@/components/insieme'
import { ConfirmPanel } from '@/components/payment/confirm-panel.tsx'
import { useBillLookupMutation } from '@/hooks/use-bill-lookup-mutation.ts'
import { useCatalogQuery } from '@/hooks/use-catalog-query.ts'
import { useFacturasStore } from '@/hooks/use-facturas-store.ts'
import { useProfileStore } from '@/hooks/use-profile-store.ts'
import { useZodRouteParams } from '@/hooks/use-zod-params.ts'
import { facturaParamsSchema } from '@/app/route-schemas.ts'
import { categoryIcon } from '@/lib/assets.ts'
import { paymentDraftStore } from '@/lib/stores/payment-draft-store.ts'
import { money } from '@/lib/money.ts'
import { MAX_FACTURA_AMOUNT, MIN_AMOUNT, emailSchema } from '@/lib/schemas.ts'
import { ActionButton } from './components/buttons.tsx'

export function Component() {
  const { id } = useZodRouteParams(facturaParamsSchema)
  const navigate = useNavigate()
  const { items, isLoading: loadingBills } = useFacturasStore()
  const profile = useProfileStore()
  const { data } = useCatalogQuery()
  const factura = items.find((i) => i.id === id)

  const draft = useSnapshot(paymentDraftStore)
  // Returning from the one-click setup: restore what the user confirmed.
  const draftMatches =
    !!factura && draft.kind === 'factura' && draft.facturaId === factura.id

  const [amount, setAmount] = useState<number | null>(
    draftMatches && draft.amount != null
      ? draft.amount
      : (factura?.amount ?? null)
  )
  const [email, setEmail] = useState(
    draftMatches && draft.email ? draft.email : profile.email
  )
  const [emailTouched, setEmailTouched] = useState(false)
  const [amountTouched, setAmountTouched] = useState(false)
  const amountEdited = useRef(draftMatches && draft.amount != null)
  const emailRef = useRef<HTMLInputElement>(null)
  const lookup = useBillLookupMutation()
  const { mutate } = lookup
  const productId = factura?.productId
  const ref1 = factura?.ref1

  // Prefill the amount from the bill lookup; on failure the user types it.
  useEffect(() => {
    if (!productId || !ref1) return
    mutate(
      { productId, ref1 },
      {
        onSuccess: ({ result }) => {
          if (!amountEdited.current) setAmount(result.amount)
        }
      }
    )
  }, [mutate, productId, ref1])

  if (loadingBills) {
    return (
      <Screen>
        <div className="h-28 w-full animate-pulse rounded-2xl bg-brand-soft" />
      </Screen>
    )
  }

  if (!factura) {
    return (
      <Screen>
        <p className="text-base text-neutral-darker">
          La factura ya no existe.
        </p>
        <ActionButton tone="dark" onClick={() => navigate('/facturas')}>
          Volver
        </ActionButton>
      </Screen>
    )
  }

  const category = data?.result.categories.find((c) => c.id === factura.cat)
  const product = data?.result.products.find((p) => p.id === factura.productId)
  const catLabel = category?.label ?? factura.cat
  const convName = product?.name ?? factura.conv

  const amountOk =
    amount != null && amount >= MIN_AMOUNT && amount <= MAX_FACTURA_AMOUNT
  const emailOk = emailSchema.safeParse(email).success
  const amountErr =
    (amount != null || amountTouched) && !amountOk
      ? `El valor debe estar entre ${money(MIN_AMOUNT)} y ${money(MAX_FACTURA_AMOUNT)}`
      : undefined
  const mailErr =
    !emailOk && emailTouched ? 'Ingresa un correo válido' : undefined

  return (
    <Screen>
      <div className="flex w-full items-center gap-3 rounded-2xl bg-brand-soft p-3">
        {category?.icon ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
            <img
              src={categoryIcon(category.icon)}
              alt=""
              className="h-6 w-auto"
            />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-2xs font-semibold uppercase tracking-wide text-brand">
            {catLabel}
          </p>
          <h1 className="text-base font-bold leading-tight text-neutral-darker [overflow-wrap:anywhere]">
            {convName}
          </h1>
        </div>
      </div>
      <p className="w-full text-sm leading-snug text-neutral-darker">
        Confirma el valor y el correo al que enviaremos el comprobante.
      </p>
      <div className="flex w-full flex-col gap-3">
        <FloatingInput
          label="Nombre de la factura"
          value={factura.name}
          disabled
          dim
          readOnly
        />
        <FloatingInput
          label="Referencia de pago 1"
          value={factura.ref1}
          disabled
          dim
          readOnly
        />
        <div className="relative w-full">
          <MoneyInput
            label="Valor"
            placeholder="$ 0"
            value={amount}
            onChange={(v) => {
              amountEdited.current = true
              setAmount(v)
            }}
            error={amountErr}
          />
          {(product ? product.requiresManualAmount : true) ? (
            <div className="absolute right-3.5 top-3.5">
              <Tip defaultOpen icon="alert">
                Tu factura permite pagos parciales: puedes cambiar el valor.
              </Tip>
            </div>
          ) : null}
        </div>
        <div className="relative w-full">
          <FloatingInput
            ref={emailRef}
            label="Correo"
            type="email"
            autoComplete="email"
            placeholder="Digita tu correo electrónico"
            leading={
              <img
                src={publicUrl('assets/icons/field-mail.svg')}
                alt=""
                width={16}
                height={13}
                className="pointer-events-none"
              />
            }
            value={email}
            onChange={(e) => {
              setEmail(e.target.value.trim())
              setEmailTouched(true)
            }}
            error={mailErr}
            trailing={
              <button
                type="button"
                aria-label="Editar correo"
                onClick={() => {
                  emailRef.current?.focus()
                  emailRef.current?.select()
                }}
              >
                <img
                  src={publicUrl('assets/facturas/edit.svg')}
                  alt=""
                  width={16}
                  height={16}
                />
              </button>
            }
          />
        </div>
        {mailErr ? null : (
          <p className="text-center text-2xs leading-snug text-neutral-normal">
            Enviaremos el comprobante de la transacción a este correo.
          </p>
        )}
      </div>
      <BrandFooter />
      <ConfirmPanel
        rows={[
          { label: 'Categoría', value: catLabel },
          { label: 'Empresa', value: convName },
          { label: 'Referencia de pago', value: factura.ref1 },
          { label: 'Valor', value: amountOk ? money(amount) : '—' }
        ]}
        amount={amount ?? 0}
        productId={factura.productId}
        kind="factura"
        details={{
          ref1: factura.ref1,
          ...(factura.ref2 ? { ref2: factura.ref2 } : {}),
          email
        }}
        facturaId={factura.id}
        enabled={amountOk && emailOk}
        onInvalid={() => {
          setAmountTouched(true)
          setEmailTouched(true)
        }}
        onBack={() => navigate(-1)}
      />
    </Screen>
  )
}
