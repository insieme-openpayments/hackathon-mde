import { useNavigate } from 'react-router-dom'
import {
  Actions,
  BackButton,
  ByPuntored,
  DialogCard,
  Screen
} from '@/components/insieme'

export function Component() {
  const navigate = useNavigate()
  return (
    <Screen>
      <DialogCard
        icon="/assets/facturas/check-circle.svg"
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
      </Actions>
      <ByPuntored />
    </Screen>
  )
}
