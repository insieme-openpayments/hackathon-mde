// Giro Efecty: beneficiary -> amount -> quote + confirmation.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Actions,
  BackButton,
  BrandFooter,
  FloatingInput,
  MoneyInput,
  Screen,
  StepTitle,
  TitleBox,
  type KvRow
} from '@/components/insieme'
import { SavedDestinationsPicker } from '@/components/account/saved-destinations-picker.tsx'
import { SaveDestinationCheckbox } from '@/components/account/save-destination-checkbox.tsx'
import { ConfirmPanel } from '@/components/payment/confirm-panel.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Shimmer } from '@/components/ui/shimmer.tsx'
import { useMoneyProduct } from '@/hooks/use-money-products-query.ts'
import { useEfectyQuoteMutation } from '@/hooks/use-efecty-quote-mutation.ts'
import { useSession } from '@/hooks/use-auth.ts'
import {
  useSavedDestinations,
  useSaveDestinationMutation,
  useUpdateDestinationMutation
} from '@/hooks/use-saved-destinations.ts'
import { useZodSearchParams } from '@/hooks/use-zod-search-params.ts'
import { destinoSearchParamsSchema } from '@/app/route-schemas.ts'
import { useProfileStore } from '@/hooks/use-profile-store.ts'
import { toast } from '@/hooks/use-toast.tsx'
import type { EfectyDetails, EfectyQuote } from '@/lib/api-types.ts'
import type { SavedDestination } from '@insieme/shared'
import { digits, money, num } from '@/lib/money.ts'
import { emailSchema } from '@/lib/schemas.ts'
import { cn } from '@/lib/utils.ts'
import { paymentDraftStore } from '@/lib/stores/payment-draft-store.ts'

const FALLBACK = { min: 10_000, max: 1_500_000 }
const CHIPS = [50_000, 100_000, 200_000, 500_000]
const PHONE_REGEX = /^3\d{9}$/

interface Errors {
  document?: string
  name?: string
  phone?: string
  email?: string
  amount?: string
}

// Mismo criterio que noControlChars de @insieme/shared (controles y formato, p. ej. U+200B).
const hasControl = (s: string) => /[\p{Cc}\p{Cf}]/u.test(s)

function validateBeneficiary(
  document: string,
  name: string,
  phone: string,
  email: string
): Errors {
  const errors: Errors = {}
  const d = digits(document)
  if (d.length < 6 || d.length > 15)
    errors.document = 'La cédula debe tener entre 6 y 15 dígitos'
  const n = name.trim()
  if (n.length < 1 || n.length > 80 || hasControl(n))
    errors.name = 'Escribe el nombre completo (máximo 80 caracteres)'
  if (phone && !PHONE_REGEX.test(digits(phone)))
    errors.phone = 'El celular debe tener 10 dígitos y empezar por 3'
  if (email && !emailSchema.safeParse(email.trim()).success)
    errors.email = 'Ingresa un correo válido'
  return errors
}

export function Component() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn } = useSession()
  const [{ destino }] = useZodSearchParams(destinoSearchParamsSchema)
  const savedDestinations = useSavedDestinations()
  const saveDestination = useSaveDestinationMutation()
  const updateDestination = useUpdateDestinationMutation()
  const profile = useProfileStore()
  const { product, limits, enabled, isLoading } = useMoneyProduct(
    'efecty',
    FALLBACK
  )

  const [step, setStep] = useState<1 | 2>(1)
  const [document, setDocument] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState(profile.email)
  const [amount, setAmount] = useState<number | null>(null)
  const [quote, setQuote] = useState<EfectyQuote | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [tried, setTried] = useState(false)
  const [saveIt, setSaveIt] = useState(true)
  const rehydrated = useRef(false)
  const appliedDestino = useRef<string | null>(null)

  const quoteMutation = useEfectyQuoteMutation()
  const loading = quoteMutation.isPending

  const amountRange = `Ingresa un valor entre ${money(limits.min)} y ${money(limits.max)}`
  const amountOk =
    amount != null && amount >= limits.min && amount <= limits.max

  const runQuote = (value: number, details?: EfectyDetails) => {
    const doc = digits(details?.recipientDocument ?? document)
    const recipientName = (details?.recipientName ?? name).trim()
    const recipientPhone = digits(details?.recipientPhone ?? phone)
    quoteMutation.mutate(
      {
        recipientDocument: doc,
        recipientName,
        ...(recipientPhone ? { recipientPhone } : {}),
        amount: value
      },
      {
        onSuccess: ({ result }) => {
          setQuote(result)
          setErrors({})
        },
        onError: (error) => {
          const e = error.errors
          const next: Errors = {
            document: e?.recipientDocument,
            name: e?.recipientName,
            phone: e?.recipientPhone,
            amount: e?.amount
          }
          if (next.document || next.name || next.phone) setStep(1)
          else setStep(2)
          if (Object.values(next).some(Boolean)) {
            setErrors(next)
          } else {
            toast({
              variant: 'error',
              title: 'No pudimos cotizar el giro',
              description: error.message
            })
          }
        }
      }
    )
  }

  // Back from the one-click setup round trip: restore the form and re-quote.
  useEffect(() => {
    if (rehydrated.current || !product) return
    rehydrated.current = true
    const draft = paymentDraftStore
    // With ?destino, only the draft of that very round trip wins (stale drafts don't).
    if (destino && draft.returnTo !== location.pathname + location.search)
      return
    if (
      draft.kind !== 'efecty' ||
      draft.productId !== product.id ||
      !draft.details ||
      draft.baseAmount == null
    )
      return
    try {
      const d = JSON.parse(draft.details) as EfectyDetails
      if (!d.recipientDocument || !d.recipientName) return
      setDocument(d.recipientDocument)
      setName(d.recipientName)
      setPhone(d.recipientPhone ?? '')
      setEmail(d.email ?? '')
      appliedDestino.current = destino ?? null
      setAmount(draft.baseAmount)
      setStep(2)
      runQuote(draft.baseAmount, d)
    } catch {
      // corrupt draft: start over
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product])

  const fromDestino =
    savedDestinations.data?.result.find(
      (d): d is Extract<SavedDestination, { kind: 'efecty' }> =>
        d.id === destino && d.kind === 'efecty'
    ) ?? null

  // "Enviar de nuevo": prefill from the saved destination and reuse the
  // rehydration path (re-quote with the last amount, or ask for the amount).
  useEffect(() => {
    if (!product || !fromDestino) return
    if (appliedDestino.current === fromDestino.id) return
    // Wait for the draft effect (same render pass) before deciding.
    if (!rehydrated.current) return
    appliedDestino.current = fromDestino.id
    const d = fromDestino.details
    setQuote(null)
    setErrors({})
    setDocument(d.recipientDocument)
    setName(d.recipientName)
    setPhone(d.recipientPhone ?? '')
    setEmail(profile.email)
    if (fromDestino.lastAmount) {
      setAmount(fromDestino.lastAmount)
      setStep(2)
      runQuote(fromDestino.lastAmount, {
        recipientDocument: d.recipientDocument,
        recipientName: d.recipientName,
        ...(d.recipientPhone ? { recipientPhone: d.recipientPhone } : {}),
        ...(profile.email ? { email: profile.email } : {})
      })
    } else {
      setAmount(null)
      setStep(2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, fromDestino])

  const onBeneficiary = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    const found = validateBeneficiary(document, name, phone, email)
    setErrors(found)
    if (Object.keys(found).length === 0) setStep(2)
  }

  const onQuote = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (!amountOk || amount == null) {
      setErrors({ amount: amountRange })
      return
    }
    if (!loading) runQuote(amount)
  }

  if (isLoading) {
    return (
      <Screen>
        <Shimmer className="h-12" />
        <Shimmer className="h-12" />
        <Shimmer className="h-12" />
      </Screen>
    )
  }

  if (!product || !enabled) {
    return (
      <Screen>
        <TitleBox>Giro Efecty</TitleBox>
        <p className="text-base text-neutral-darker">
          Los giros Efecty no están disponibles por ahora. Intenta más tarde.
        </p>
        <Button
          aria-label="Volver"
          variant="dark"
          onClick={() => navigate('/')}
        >
          Volver al inicio
        </Button>
      </Screen>
    )
  }

  const shownErrors = tried || Object.values(errors).some(Boolean) ? errors : {}
  const beneficiaryOk =
    Object.keys(validateBeneficiary(document, name, phone, email)).length === 0

  if (quote) {
    const details: EfectyDetails = {
      recipientDocument: digits(document),
      recipientName: name.trim(),
      ...(digits(phone) ? { recipientPhone: digits(phone) } : {}),
      ...(email.trim() ? { email: email.trim() } : {})
    }
    const rows: KvRow[] = [
      { label: 'Beneficiario', value: details.recipientName },
      { label: 'Cédula', value: num(details.recipientDocument) },
      ...(details.recipientPhone
        ? [{ label: 'Celular', value: details.recipientPhone }]
        : []),
      { label: 'Valor', value: money(quote.amount) },
      { label: 'Comisión', value: money(quote.fee) },
      { label: 'Total', value: money(quote.total) }
    ]
    const baseAmount = quote.amount
    const sameDest =
      fromDestino &&
      fromDestino.details.recipientDocument === details.recipientDocument
        ? fromDestino
        : null
    const onCreated = async () => {
      if (!isLoggedIn) return
      try {
        if (saveIt) {
          await saveDestination.mutateAsync({
            kind: 'efecty',
            label:
              sameDest?.label ??
              (details.recipientName.slice(0, 40) || 'Giro Efecty'),
            details: {
              recipientDocument: details.recipientDocument,
              recipientName: details.recipientName,
              ...(details.recipientPhone
                ? { recipientPhone: details.recipientPhone }
                : {})
            },
            lastAmount: baseAmount
          })
        } else if (sameDest) {
          await updateDestination.mutateAsync({
            id: sameDest.id,
            lastUsedAt: new Date().toISOString()
          })
        }
      } catch {
        // saving the destination is best-effort; the payment goes on
      }
    }
    return (
      <Screen>
        <TitleBox>Giro Efecty</TitleBox>
        <StepTitle n={3} text="Revisa la cotización y confirma" />
        <dl className="flex w-full flex-col gap-2 rounded-2xl border border-brand-soft-active bg-white p-4 text-sm">
          <QuoteRow label="Valor del giro" value={money(quote.amount)} />
          <QuoteRow label="Comisión" value={money(quote.fee)} />
          <div className="my-1 h-px bg-brand-soft-active" />
          <QuoteRow label="Total a pagar" value={money(quote.total)} strong />
        </dl>
        {quote.message ? (
          <p className="w-full text-2xs leading-snug text-neutral-normal [overflow-wrap:anywhere]">
            {quote.message}
          </p>
        ) : null}
        {isLoggedIn ? (
          <SaveDestinationCheckbox checked={saveIt} onChange={setSaveIt} />
        ) : null}
        <BrandFooter />
        <ConfirmPanel
          rows={rows}
          amount={quote.total}
          baseAmount={quote.amount}
          productId={product.id}
          kind="efecty"
          details={details}
          enabled
          onCreated={onCreated}
          onBack={() => setQuote(null)}
        />
      </Screen>
    )
  }

  return (
    <Screen>
      <TitleBox>Giro Efecty</TitleBox>
      {step === 1 ? (
        <form
          onSubmit={onBeneficiary}
          noValidate
          className="flex w-full flex-col gap-4"
        >
          <StepTitle
            n={1}
            text="¿Quién recibe el giro?"
            tip="Debe presentar su cédula para reclamarlo en Efecty."
          />
          <SavedDestinationsPicker kind="efecty" selectedId={destino} />
          <FloatingInput
            label="Cédula del beneficiario"
            name="recipientDocument"
            inputMode="numeric"
            autoComplete="off"
            maxLength={20}
            value={document}
            error={shownErrors.document}
            onChange={(e) => {
              setDocument(e.target.value.replace(/[^\d.\s]/g, ''))
              setErrors((x) => ({ ...x, document: undefined }))
            }}
          />
          <FloatingInput
            label="Nombre completo"
            name="recipientName"
            autoComplete="off"
            maxLength={80}
            value={name}
            error={shownErrors.name}
            onChange={(e) => {
              setName(e.target.value)
              setErrors((x) => ({ ...x, name: undefined }))
            }}
          />
          <FloatingInput
            label="Celular (opcional)"
            name="recipientPhone"
            inputMode="tel"
            autoComplete="off"
            maxLength={10}
            value={phone}
            error={shownErrors.phone}
            onChange={(e) => {
              setPhone(digits(e.target.value).slice(0, 10))
              setErrors((x) => ({ ...x, phone: undefined }))
            }}
          />
          <FloatingInput
            label="Tu correo para el comprobante (opcional)"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            error={shownErrors.email}
            onChange={(e) => {
              setEmail(e.target.value)
              setErrors((x) => ({ ...x, email: undefined }))
            }}
          />
          <Actions>
            <BackButton onClick={() => navigate(-1)} />
            <Button
              type="submit"
              aria-label="Continuar"
              variant={beneficiaryOk ? 'active' : 'disabled'}
              className="min-w-0 flex-1"
            >
              Continuar
            </Button>
          </Actions>
          <BrandFooter />
        </form>
      ) : (
        <form
          onSubmit={onQuote}
          noValidate
          className="flex w-full flex-col gap-4"
        >
          <StepTitle n={2} text="¿Cuánto quieres enviar?" />
          <p className="w-full text-2xs leading-snug text-neutral-normal [overflow-wrap:anywhere]">
            Para {name.trim()} · Cédula {num(digits(document))}
          </p>
          <div className="flex flex-wrap gap-2">
            {CHIPS.filter((c) => c >= limits.min && c <= limits.max).map(
              (c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setAmount(c)
                    setErrors((x) => ({ ...x, amount: undefined }))
                  }}
                  className={cn(
                    'rounded-pill border px-3 py-1.5 text-2xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                    amount === c
                      ? 'border-brand bg-brand text-white'
                      : 'border-brand-soft-active bg-white text-brand'
                  )}
                >
                  {money(c)}
                </button>
              )
            )}
          </div>
          <MoneyInput
            label="Valor del giro"
            name="amount"
            value={amount}
            error={
              errors.amount ??
              (tried && amount !== null && !amountOk ? amountRange : undefined)
            }
            onChange={(v) => {
              setAmount(v !== null ? Math.min(v, 999_999_999) : null)
              setErrors((x) => ({ ...x, amount: undefined }))
            }}
          />
          <p className="text-3xs text-neutral-normal">
            Mínimo {money(limits.min)} · máximo {money(limits.max)}
          </p>
          <Actions>
            <BackButton onClick={() => setStep(1)} />
            <Button
              type="submit"
              aria-label="Cotizar"
              variant={amountOk && !loading ? 'active' : 'disabled'}
              disabled={loading}
              className="min-w-0 flex-1"
            >
              {loading ? 'Cotizando…' : 'Cotizar'}
            </Button>
          </Actions>
          <BrandFooter />
        </form>
      )}
    </Screen>
  )
}

function QuoteRow({
  label,
  value,
  strong
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-neutral-normal">{label}</dt>
      <dd
        className={cn(
          'min-w-0 text-right [overflow-wrap:anywhere]',
          strong
            ? 'text-base font-bold text-brand'
            : 'font-semibold text-neutral-darker'
        )}
      >
        {value}
      </dd>
    </div>
  )
}
