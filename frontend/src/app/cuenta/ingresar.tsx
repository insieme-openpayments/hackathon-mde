import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { loginSchema } from '@insieme/shared'
import { Actions, FloatingInput, Screen, TitleBox } from '@/components/insieme'
import { Button } from '@/components/ui/button.tsx'
import { useSession } from '@/hooks/use-auth.ts'
import { useLoginMutation } from '@/hooks/use-login-mutation.ts'
import { useZodSearchParams } from '@/hooks/use-zod-search-params.ts'
import { setSession } from '@/lib/stores/auth-store.ts'
import { nextSearchParamsSchema } from '../route-schemas.ts'
import { applyApiErrors, safeNext } from './utils.ts'

type FormValues = z.input<typeof loginSchema>

export function Component() {
  const navigate = useNavigate()
  const { isLoggedIn } = useSession()
  const [{ next }] = useZodSearchParams(nextSearchParamsSchema)
  const target = safeNext(next)
  const form = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  })
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = form

  const mutation = useLoginMutation({
    onSuccess: ({ result }) => {
      setSession(result)
      navigate(target)
    },
    onError: (error) => applyApiErrors(form, error)
  })

  if (isLoggedIn && !mutation.isSuccess) return <Navigate to={target} replace />

  return (
    <Screen className="gap-5">
      <TitleBox>Ingresa a tu cuenta</TitleBox>
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="flex flex-col gap-5"
      >
        <FloatingInput
          label="Correo"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FloatingInput
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {errors.root?.message ? (
          <p role="alert" className="text-2xs text-magenta">
            {errors.root.message}
          </p>
        ) : null}
        <Actions>
          <Button
            type="submit"
            aria-label="Ingresar"
            fullWidth
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </Actions>
      </form>
      <p className="text-center text-2xs text-neutral-normal">
        <Link
          to={`/cuenta/registro${next ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-medium text-brand underline underline-offset-2"
        >
          Crear cuenta
        </Link>
      </p>
    </Screen>
  )
}
