import { RouteObject } from 'react-router-dom'

export const brebRoutes: RouteObject[] = [
  {
    index: true,
    lazy: () => import('./index.tsx')
  }
]
