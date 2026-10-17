import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { registerSchema } from '@insieme/shared'
import { Actions, FloatingInput, Screen, TitleBox } from '@/components/insieme'
import { Button } from '@/components/ui/button.tsx'
import { useSession } from '@/hooks/use-auth.ts'
import { useRegisterMutation } from '@/hooks/use-register-mutation.ts'
import { useZodSearchParams } from '@/hooks/use-zod-search-params.ts'
import { setSession } from '@/lib/stores/auth-store.ts'
import { nextSearchParamsSchema } from '../route-schemas.ts'
import { applyApiErrors, safeNext } from './utils.ts'

type FormValues = z.input<typeof registerSchema>

export function Component() {
  const navigate = useNavigate()
  const { isLoggedIn } = useSession()
  const [{ next }] = useZodSearchParams(nextSearchParamsSchema)
  const target = safeNext(next)
  const form = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      document: '',
      email: '',
      phone: '',
      password: '',
      passwordConfirm: ''
    }
  })
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = form

  const mutation = useRegisterMutation({
    onSuccess: ({ result }) => {
      setSession(result)
      navigate(target)
    },
    onError: (error) => applyApiErrors(form, error)
  })

  if (isLoggedIn && !mutation.isSuccess) return <Navigate to={target} replace />

  return (
    <Screen className="gap-5">
      <TitleBox>Crea tu cuenta</TitleBox>
      <p
        role="note"
        className="rounded-xl bg-brand-soft p-3 text-2xs leading-relaxed text-brand"
      >
        Versión de prueba sobre la testnet de Interledger: no verificamos
        correo, celular ni identidad
      </p>
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="flex flex-col gap-5"
      >
        <FloatingInput
          label="Nombre completo"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <FloatingInput
          label="Documento de identidad (cédula o pasaporte)"
          autoComplete="off"
          error={errors.document?.message}
          {...register('document')}
        />
        <FloatingInput
          label="Correo"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FloatingInput
          label="Celular"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <FloatingInput
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <FloatingInput
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.passwordConfirm?.message}
          {...register('passwordConfirm')}
        />
        {errors.root?.message ? (
          <p role="alert" className="text-2xs text-magenta">
            {errors.root.message}
          </p>
        ) : null}
        <Actions>
          <Button
            type="submit"
            aria-label="Crear mi cuenta"
            fullWidth
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creando…' : 'Crear mi cuenta'}
          </Button>
        </Actions>
      </form>
      <p className="text-center text-2xs text-neutral-normal">
        <Link
          to={`/cuenta/ingresar${next ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-medium text-brand underline underline-offset-2"
        >
          Ya tengo cuenta
        </Link>
      </p>
    </Screen>
  )
}
