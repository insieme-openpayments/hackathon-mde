import { RouteObject } from 'react-router-dom'

export const serviciosRoutes: RouteObject[] = [
  {
    index: true,
    lazy: () => import('./index.tsx')
  },
  {
    path: 'categoria/:categoryId',
    lazy: () => import('./categoria.tsx')
  },
  {
    path: 'pagar/:productId',
    lazy: () => import('./pagar.tsx')
  }
]
