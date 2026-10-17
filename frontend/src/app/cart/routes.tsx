import { RouteObject } from 'react-router-dom'

export const cartRoutes: RouteObject[] = [
  {
    path: 'finish',
    lazy: () => import('./finish.tsx')
  }
]
