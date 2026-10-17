import { AppShell } from '@/components/layouts/app-shell.tsx'
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
  type RouteObject
} from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './query-client.ts'
import { Toaster } from '@/components/ui/toaster.tsx'
import { homeRoutes } from './home/routes.tsx'
import { serviciosRoutes } from './servicios/routes.tsx'
import { facturasRoutes } from './facturas/routes.tsx'
import { checkoutRoutes } from './checkout/routes.tsx'
import { cartRoutes } from './cart/routes.tsx'
import { girosRoutes } from './giros/routes.tsx'
import { brebRoutes } from './breb/routes.tsx'

export const routes = [
  {
    element: <AppShell />,
    children: [
      {
        path: '/',
        children: homeRoutes
      },
      {
        path: '/servicios',
        children: serviciosRoutes
      },
      {
        path: '/giros',
        children: girosRoutes
      },
      {
        path: '/breb',
        children: brebRoutes
      },
      {
        path: '/facturas',
        children: facturasRoutes
      },
      {
        // Fixed by the backend return URL: /checkout/confirmation?orderId=
        path: '/checkout',
        children: checkoutRoutes
      },
      {
        // Fixed by the backend return URL: /cart/finish?identifier=
        path: '/cart',
        children: cartRoutes
      },
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
] satisfies RouteObject[]

const router = createBrowserRouter(routes, { basename: '/pay' })

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  )
}
