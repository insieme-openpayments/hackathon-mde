import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSnapshot } from 'valtio'
import {
  Actions,
  BackButton,
  BankBlock,
  ByPuntored,
  FloatingInput,
  MoneyInput,
  Screen,
  Tip,
  type KvRow
} from '@/components/insieme'
import { ConfirmPanel } from '@/components/payment/confirm-panel.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Shimmer } from '@/components/ui/shimmer.tsx'
import { useCatalogQuery } from '@/hooks/use-catalog-query.ts'
import { useBillLookupMutation } from '@/hooks/use-bill-lookup-mutation.ts'
import { useZodSearchParams } from '@/hooks/use-zod-search-params.ts'
import { toast } from '@/hooks/use-toast.tsx'
import {
  productParamsSchema,
  serviciosPagarSearchParamsSchema
} from '@/app/route-schemas.ts'
import type { BillLookupResult } from '@/lib/api-types.ts'
import { categoryIcon } from '@/lib/assets.ts'
import { digits, money } from '@/lib/money.ts'
import { MIN_AMOUNT, REF_REGEX } from '@/lib/schemas.ts'
import { paymentDraftStore } from '@/lib/stores/payment-draft-store.ts'

const REF_MAX = 20
const LOOKUP_ERROR = 'No pudimos validar la referencia, intenta de nuevo'

const formatDue = (value: string | null): string => {
  if (!value) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('es-CO')
}

export function Component() {
  const { productId } = useParams<{ productId: string }>()
  productParamsSchema.parse({ productId })
  const navigate = useNavigate()
  const [{ ref1: refParam }] = useZodSearchParams(
    serviciosPagarSearchParamsSchema
  )
  const draft = useSnapshot(paymentDraftStore)
  const { data, isLoading: catalogLoading } = useCatalogQuery()

  const product = useMemo(
    () =>
      data?.result.products.find(
        (p) => p.id === productId || p.slug === productId
      ),
    [data, productId]
  )
  const category = useMemo(
    () => data?.result.categories.find((c) => c.id === product?.category),
    [data, product]
  )

  const draftMatches =
    !!product &&
    draft.productId === product.id &&
    draft.kind === 'servicio' &&
    !draft.facturaId &&
    !!draft.ref1

  const [ref1, setRef1] = useState(() => digits(refParam).slice(0, REF_MAX))
  const [bill, setBill] = useState<BillLookupResult | null>(null)
  const [amount, setAmount] = useState<number | null>(null)
  const [refError, setRefError] = useState('')
  const autoRan = useRef(false)

  const lookup = useBillLookupMutation()
  const refOk = REF_REGEX.test(ref1)
  const loading = lookup.isPending

  const runLookup = (ref: string, draftAmount: number | null = null) => {
    if (!product || loading) return
    setRefError('')
    lookup.mutate(
      { productId: product.id, ref1: ref },
      {
        onSuccess: ({ result }) => {
          setBill(result)
          setAmount(
            result.partial && draftAmount != null ? draftAmount : result.amount
          )
        },
        onError: (error) => {
          const message = error.errors?.ref1 ?? error.errors?.productId
          if (message) setRefError(message)
          else
            toast({
              variant: 'error',
              title: LOOKUP_ERROR,
              description: error.message
            })
        }
      }
    )
  }

  // ?ref1= or payment-draft rehydration: look the bill up automatically.
  useEffect(() => {
    if (autoRan.current || !product) return
    autoRan.current = true
    if (REF_REGEX.test(ref1)) {
      runLookup(ref1, draftMatches && draft.ref1 === ref1 ? draft.amount : null)
    } else if (draftMatches && REF_REGEX.test(draft.ref1)) {
      const ref = digits(draft.ref1).slice(0, REF_MAX)
      setRef1(ref)
      runLookup(ref, draft.amount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (refOk && !loading && !bill) runLookup(ref1)
  }

  if (catalogLoading) {
    return (
      <Screen>
        <Shimmer className="h-12" />
        <Shimmer className="h-12" />
        <Shimmer className="h-12" />
      </Screen>
    )
  }

  if (!product) {
    return (
      <Screen>
        <p className="text-sm text-neutral-darker">
          No encontramos la empresa seleccionada
        </p>
        <Button
          aria-label="Volver"
          variant="dark"
          onClick={() => navigate('/servicios')}
        >
          Volver
        </Button>
      </Screen>
    )
  }

  const step2 = bill !== null
  const partial = !!bill?.partial
  const amountOk =
    step2 && amount != null && amount >= MIN_AMOUNT && amount <= bill.amount
  const amountError =
    step2 && partial && amount !== null && !amountOk
      ? `Ingresa un valor entre ${money(MIN_AMOUNT)} y ${money(bill.amount)}`
      : step2 && partial && amount === null
        ? `Ingresa un valor entre ${money(MIN_AMOUNT)} y ${money(bill.amount)}`
        : undefined

  const categoryLabel = category?.label ?? product.category
  const rows: KvRow[] = [
    { label: 'Categoría', value: categoryLabel },
    { label: 'Empresa', value: product.name },
    { label: 'Referencia de pago', value: ref1 },
    { label: 'Valor', value: money(amount ?? 0) }
  ]

  return (
    <Screen className={step2 ? 'pb-72' : undefined}>
      <div className="flex w-full items-center gap-2">
        {category?.icon ? (
          <span className="flex h-[30px] flex-shrink-0 items-center justify-center rounded-[3px] p-[5px]">
            <img
              src={categoryIcon(category.icon)}
              alt=""
              className="h-full w-auto"
            />
          </span>
        ) : null}
        <span className="h-[30px] w-px bg-blue-normal" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm font-semibold leading-[1.2] text-blue-normal">
            {categoryLabel}
          </p>
          <p className="text-xs font-medium leading-[1.1] text-neutral-darker">
            {product.name}
          </p>
        </div>
      </div>

      <p className="w-full text-xs leading-[1.1] text-neutral-darker">
        Ingresa los siguientes datos
      </p>

      <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
        <FloatingInput
          label="Referencia de pago 1"
          name="ref1"
          inputMode="numeric"
          enterKeyHint="search"
          maxLength={REF_MAX}
          autoComplete="off"
          value={ref1}
          readOnly={step2}
          error={refError || undefined}
          className={step2 ? 'opacity-60' : undefined}
          onChange={(e) => {
            setRef1(digits(e.target.value).slice(0, REF_MAX))
            setRefError('')
          }}
        />

        {step2 ? (
          <>
            <dl className="flex w-full flex-col gap-1 rounded-lg bg-sheet p-3 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-darker">Titular</dt>
                <dd className="text-right font-medium text-black">
                  {bill.holder}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-darker">Concepto</dt>
                <dd className="text-right font-medium text-black">
                  {bill.concept}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-darker">Vence</dt>
                <dd className="text-right font-medium text-black">
                  {formatDue(bill.dueDate)}
                </dd>
              </div>
            </dl>

            <div className="relative w-full">
              <MoneyInput
                label="Valor"
                name="amount"
                value={amount}
                readOnly={!partial}
                error={amountError}
                onChange={(v) =>
                  setAmount(v !== null ? Math.min(v, 999_999_999) : null)
                }
              />
              {partial ? (
                <div className="absolute right-3 top-3">
                  <Tip defaultOpen>
                    <span>
                      Tu factura permite
                      <br />
                      pagos parciales
                    </span>
                  </Tip>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {step2 ? null : (
          <>
            <BankBlock />
            <Actions>
              <BackButton onClick={() => navigate(-1)} />
              <Button
                type="submit"
                aria-label="Consultar"
                variant={refOk && !loading ? 'active' : 'disabled'}
                disabled={!refOk || loading}
                className="flex-1"
              >
                {loading ? 'Consultando…' : 'Consultar'}
              </Button>
            </Actions>
          </>
        )}
      </form>

      {step2 ? (
        <>
          <BankBlock />
          <div className="flex justify-center">
            <ByPuntored />
          </div>
          <ConfirmPanel
            rows={rows}
            amount={amount ?? 0}
            productId={product.id}
            kind="servicio"
            details={{ ref1 }}
            source="servicios"
            enabled={amountOk}
            onBack={() => {
              setBill(null)
              setAmount(null)
            }}
          />
        </>
      ) : null}
    </Screen>
  )
}
