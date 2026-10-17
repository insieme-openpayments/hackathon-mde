import { useState, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form/form'
import { InputField } from '@/components/ui/form/input-field'
import { Button } from '@/components/ui/button'
import { useZodForm } from '@/hooks/use-zod-form'
import { getObjectKeys } from '@/lib/utils'
import { useSetupOneClickMutation } from '@/hooks/use-setup-one-click-mutation'
import { oneClickSetupSchema } from '@insieme/shared'

export interface OneClickSetupDialogProps {
  /** Classes for the default trigger button. */
  buttonClassName?: string
  /** Custom trigger element (rendered with `asChild`). */
  trigger?: ReactNode
  /** Prefills the "Billetera" field. */
  defaultWalletAddressUrl?: string
  /** Runs right before redirecting to the wallet (write the payment draft). */
  onBeforeRedirect?: () => void
}

export const OneClickSetupDialog = ({
  buttonClassName,
  trigger,
  defaultWalletAddressUrl,
  onBeforeRedirect
}: OneClickSetupDialogProps) => {
  const [redirecting, setRedirecting] = useState(false)
  const form = useZodForm({
    schema: oneClickSetupSchema,
    defaultValues: { walletAddressUrl: defaultWalletAddressUrl ?? '' }
  })

  const { mutate, isPending } = useSetupOneClickMutation({
    onSuccess: function ({ result }) {
      setRedirecting(true)
      onBeforeRedirect?.()
      window.location.href = result.redirectUrl
    },
    onError: function ({ message, errors }) {
      if (errors) {
        getObjectKeys(errors).map((field) =>
          form.setError(field, {
            message: errors[field]
          })
        )
      } else {
        form.setError('root', { message })
      }
    }
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            aria-label="Configurar pago en un clic"
            className={buttonClassName}
          >
            Configurar pago en un clic
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pago en un clic</DialogTitle>
          <Form
            form={form}
            disabled={form.formState.isSubmitting || isPending || redirecting}
            onSubmit={form.handleSubmit(({ walletAddressUrl, amount }) => {
              mutate({
                walletAddressUrl,
                amount
              })
            })}
            className="py-4"
          >
            <InputField
              label="Billetera"
              {...form.register('walletAddressUrl')}
              className="w-full"
            />
            <InputField
              inputMode="numeric"
              label="Monto máximo"
              step="any"
              type="number"
              {...form.register('amount')}
              placeholder="0"
            />
            <Button
              aria-label="Configurar"
              className="mt-5 w-full"
              disabled={isPending || redirecting}
            >
              Configurar
            </Button>
          </Form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
