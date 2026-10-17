import { publicUrl } from '@/lib/assets.ts'
import { useNavigate } from 'react-router-dom'
import {
  Actions,
  BackButton,
  BrandFooter,
  DialogCard,
  Screen
} from '@/components/insieme'
import { ActionButton } from './components/buttons.tsx'

export function Component() {
  const navigate = useNavigate()
  return (
    <Screen>
      <DialogCard
        icon={publicUrl('assets/facturas/check-circle.svg')}
        large
        text={
          <>
            Factura guardada
            <br />
            exitosamente
          </>
        }
      />
      <Actions>
        <BackButton onClick={() => navigate('/facturas', { replace: true })} />
        <ActionButton
          tone="active"
          grow
          onClick={() => navigate('/facturas', { replace: true })}
        >
          Ver mis facturas
        </ActionButton>
      </Actions>
      <BrandFooter />
    </Screen>
  )
}
