import { RouteObject } from 'react-router-dom'

export const girosRoutes: RouteObject[] = [
  {
    index: true,
    lazy: () => import('./index.tsx')
  }
]
