import { RouteObject } from 'react-router-dom'

export const homeRoutes: RouteObject[] = [
  {
    index: true,
    lazy: () => import('./index.tsx')
  }
]
