import { RouteObject } from 'react-router-dom'

export const facturasRoutes: RouteObject[] = [
  {
    lazy: () => import('./layout.tsx'),
    children: [
      {
        index: true,
        lazy: () => import('./index.tsx')
      },
      {
        path: 'nueva',
        lazy: () => import('./nueva.tsx')
      },
      {
        path: 'guardada',
        lazy: () => import('./guardada.tsx')
      },
      {
        path: ':id/editar',
        lazy: () => import('./editar.tsx')
      },
      {
        path: ':id/pagar',
        lazy: () => import('./pagar.tsx')
      }
    ]
  }
]
