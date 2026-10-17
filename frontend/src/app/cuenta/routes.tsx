import { RouteObject } from 'react-router-dom'

export const cuentaRoutes: RouteObject[] = [
  {
    index: true,
    lazy: () => import('./index.tsx')
  },
  {
    path: 'registro',
    lazy: () => import('./registro.tsx')
  },
  {
    path: 'ingresar',
    lazy: () => import('./ingresar.tsx')
  }
]
