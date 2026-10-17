// Transferencia Bre-B: key lookup -> amount -> confirmation.
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
import { useBrebResolveMutation } from '@/hooks/use-breb-resolve-mutation.ts'
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
import type {
  BrebDetails,
  BrebKeyResolution,
  BrebKeyType
} from '@/lib/api-types.ts'
import type { SavedDestination } from '@insieme/shared'
import { money } from '@/lib/money.ts'
import { emailSchema } from '@/lib/schemas.ts'
import { paymentDraftStore } from '@/lib/stores/payment-draft-store.ts'

const FALLBACK = { min: 1_000, max: 5_000_000 }
const DESCRIPTION_MAX = 100
const KEY_MAX = 64
// Mismo criterio que noControlChars de @insieme/shared (controles y formato, p. ej. U+200B).
const hasControl = (s: string) => /[\p{Cc}\p{Cf}]/u.test(s)

const KEY_TYPE_LABEL: Record<BrebKeyType, string> = {
  phone: 'Celular',
  email: 'Correo',
  document: 'Documento',
  alphanumeric: 'Llave'
}

/** "MARIA PEREZ" -> "Ma*** Pe***": the payer sees enough to recognise them. */
export function maskHolder(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => (w.length <= 2 ? w : w.slice(0, 2) + '***'))
    .join(' ')
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
    'breb',
    FALLBACK
  )

  const [key, setKey] = useState('')
  const [resolution, setResolution] = useState<BrebKeyResolution | null>(null)
  const [keyError, setKeyError] = useState('')
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [amount, setAmount] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState(profile.email)
  const [tried, setTried] = useState(false)
  const [saveIt, setSaveIt] = useState(true)
  const rehydrated = useRef(false)
  const appliedDestino = useRef<string | null>(null)

  const resolve = useBrebResolveMutation()
  const loading = resolve.isPending
  const keyOk = key.trim().length >= 1 && !hasControl(key)

  const runResolve = (value: string, onOk?: (r: BrebKeyResolution) => void) => {
    setKeyError('')
    resolve.mutate(
      { key: value.trim() },
      {
        onSuccess: ({ result }) => {
          setResolution(result)
          onOk?.(result)
        },
        onError: (error) => {
          const msg = error.errors?.key
          if (msg) setKeyError(msg)
          else
            toast({
              variant: 'error',
              title: 'No pudimos consultar la llave',
              description: error.message
            })
        }
      }
    )
  }

  // Back from the one-click setup round trip: restore the form.
  useEffect(() => {
    if (rehydrated.current || !product) return
    rehydrated.current = true
    const draft = paymentDraftStore
    // With ?destino, only the draft of that very round trip wins (stale drafts don't).
    if (destino && draft.returnTo !== location.pathname + location.search)
      return
    if (
      draft.kind !== 'breb' ||
      draft.productId !== product.id ||
      !draft.details ||
      draft.baseAmount == null
    )
      return
    try {
      const d = JSON.parse(draft.details) as BrebDetails
      if (!d.key) return
      setKey(d.key)
      setDescription(d.description ?? '')
      setEmail(d.email ?? '')
      appliedDestino.current = destino ?? null
      setAmount(draft.baseAmount)
      setStep(2)
      runResolve(d.key, () => setStep(3))
    } catch {
      // corrupt draft: start over
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product])

  const fromDestino =
    savedDestinations.data?.result.find(
      (d): d is Extract<SavedDestination, { kind: 'breb' }> =>
        d.id === destino && d.kind === 'breb'
    ) ?? null

  // "Enviar de nuevo": prefill from the saved destination and reuse the
  // rehydration path (re-resolve the key: holder/bank may have changed).
  useEffect(() => {
    if (!product || !fromDestino) return
    if (appliedDestino.current === fromDestino.id) return
    if (!rehydrated.current) return
    appliedDestino.current = fromDestino.id
    const k = fromDestino.details.key
    setResolution(null)
    setKey(k)
    setDescription('')
    setEmail(profile.email)
    if (fromDestino.lastAmount) {
      setAmount(fromDestino.lastAmount)
      setStep(2)
      runResolve(k, () => setStep(3))
    } else {
      setAmount(null)
      setStep(1)
      runResolve(k, () => setStep(2))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, fromDestino])

  const onKey = (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (resolution) {
      setStep(2)
      return
    }
    if (!keyOk) {
      setKeyError('Escribe la llave Bre-B')
      return
    }
    runResolve(key)
  }

  const amountOk =
    amount != null && amount >= limits.min && amount <= limits.max
  const amountError =
    tried && !amountOk
      ? `Ingresa un valor entre ${money(limits.min)} y ${money(limits.max)}`
      : undefined
  const emailError =
    email.trim() && !emailSchema.safeParse(email.trim()).success
      ? 'Ingresa un correo válido'
      : undefined
  const descriptionOk = description.trim().length <= DESCRIPTION_MAX

  const onAmount = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (amountOk && !emailError && descriptionOk) setStep(3)
  }

  if (isLoading) {
    return (
      <Screen>
        <Shimmer className="h-12" />
        <Shimmer className="h-12" />
      </Screen>
    )
  }

  if (!product || !enabled) {
    return (
      <Screen>
        <TitleBox>Transferencia Bre-B</TitleBox>
        <p className="text-base text-neutral-darker">
          Las transferencias Bre-B no están disponibles por ahora. Intenta más
          tarde.
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

  if (step === 3 && resolution) {
    const details: BrebDetails = {
      key: key.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(email.trim() ? { email: email.trim() } : {})
    }
    const rows: KvRow[] = [
      { label: 'Llave', value: details.key },
      { label: 'Titular', value: maskHolder(resolution.holderName) },
      { label: 'Banco', value: resolution.bank },
      { label: 'Valor', value: money(amount ?? 0) },
      ...(details.description
        ? [{ label: 'Descripción', value: details.description }]
        : [])
    ]
    const sameDest =
      fromDestino &&
      fromDestino.details.key.trim().toLowerCase() === details.key.toLowerCase()
        ? fromDestino
        : null
    const baseAmount = amount ?? 0
    const onCreated = async () => {
      if (!isLoggedIn) return
      try {
        if (saveIt) {
          await saveDestination.mutateAsync({
            kind: 'breb',
            label:
              sameDest?.label ??
              (maskHolder(resolution.holderName).slice(0, 40) ||
                details.key.slice(0, 40)),
            details: {
              key: details.key,
              keyType: resolution.keyType,
              holderName: maskHolder(resolution.holderName),
              bank: resolution.bank
            },
            lastAmount: baseAmount > 0 ? baseAmount : undefined
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
        <TitleBox>Transferencia Bre-B</TitleBox>
        <StepTitle n={3} text="Revisa y confirma" />
        <KeyCard resolution={resolution} />
        {isLoggedIn ? (
          <SaveDestinationCheckbox checked={saveIt} onChange={setSaveIt} />
        ) : null}
        <BrandFooter />
        <ConfirmPanel
          rows={rows}
          amount={amount ?? 0}
          productId={product.id}
          kind="breb"
          details={details}
          enabled={amountOk}
          onCreated={onCreated}
          onBack={() => setStep(2)}
        />
      </Screen>
    )
  }

  if (step === 2 && resolution) {
    return (
      <Screen>
        <TitleBox>Transferencia Bre-B</TitleBox>
        <StepTitle n={2} text="¿Cuánto quieres enviar?" />
        <KeyCard resolution={resolution} />
        <form
          onSubmit={onAmount}
          noValidate
          className="flex w-full flex-col gap-4"
        >
          <MoneyInput
            label="Valor a enviar"
            name="amount"
            value={amount}
            error={amountError}
            onChange={(v) =>
              setAmount(v !== null ? Math.min(v, 999_999_999) : null)
            }
          />
          <p className="-mt-2 text-3xs text-neutral-normal">
            Mínimo {money(limits.min)} · máximo {money(limits.max)}
          </p>
          <FloatingInput
            label="Descripción (opcional)"
            name="description"
            autoComplete="off"
            maxLength={DESCRIPTION_MAX}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <FloatingInput
            label="Tu correo para el comprobante (opcional)"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            error={tried ? emailError : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Actions>
            <BackButton onClick={() => setStep(1)} />
            <Button
              type="submit"
              aria-label="Continuar"
              variant={amountOk && !emailError ? 'active' : 'disabled'}
              className="min-w-0 flex-1"
            >
              Continuar
            </Button>
          </Actions>
          <BrandFooter />
        </form>
      </Screen>
    )
  }

  return (
    <Screen>
      <TitleBox>Transferencia Bre-B</TitleBox>
      <form onSubmit={onKey} noValidate className="flex w-full flex-col gap-4">
        <StepTitle
          n={1}
          text="¿A qué llave Bre-B envías?"
          tip="La llave puede ser un celular, un correo, un documento o una llave alfanumérica."
        />
        <SavedDestinationsPicker kind="breb" selectedId={destino} />
        <FloatingInput
          label="Llave Bre-B"
          name="key"
          autoComplete="off"
          autoCapitalize="none"
          enterKeyHint="search"
          maxLength={KEY_MAX}
          value={key}
          error={keyError || undefined}
          onChange={(e) => {
            setKey(e.target.value)
            setKeyError('')
            setResolution(null)
          }}
        />
        {resolution ? <KeyCard resolution={resolution} /> : null}
        <Actions>
          <BackButton onClick={() => navigate(-1)} />
          <Button
            type="submit"
            aria-label={resolution ? 'Continuar' : 'Consultar llave'}
            variant={resolution || (keyOk && !loading) ? 'active' : 'disabled'}
            disabled={loading}
            className="min-w-0 flex-1"
          >
            {loading
              ? 'Consultando…'
              : resolution
                ? 'Continuar'
                : 'Consultar llave'}
          </Button>
        </Actions>
        <BrandFooter />
      </form>
    </Screen>
  )
}

function KeyCard({ resolution }: { resolution: BrebKeyResolution }) {
  const rows: Array<[string, string]> = [
    ['Titular', maskHolder(resolution.holderName)],
    ['Banco', resolution.bank],
    ['Tipo de llave', KEY_TYPE_LABEL[resolution.keyType] ?? 'Llave']
  ]
  return (
    <div className="flex w-full flex-col gap-2 rounded-2xl border border-allies/40 bg-white p-4 text-sm">
      <p className="text-2xs font-semibold uppercase tracking-wide text-allies">
        Llave encontrada
      </p>
      <dl className="flex flex-col gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="shrink-0 text-neutral-normal">{label}</dt>
            <dd className="min-w-0 text-right font-semibold text-neutral-darker [overflow-wrap:anywhere]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
