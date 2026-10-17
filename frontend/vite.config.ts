import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve, extname, join } from 'node:path'
import { existsSync, statSync, createReadStream } from 'node:fs'

const landingDir = resolve(__dirname, 'landing')
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
}

// Dev only: serves frontend/landing/ at "/" and leaves "/pay/" to Vite.
function serveLanding(): Plugin {
  return {
    name: 'insieme-serve-landing',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = decodeURIComponent((req.url ?? '/').split('?')[0])
        if (pathname === '/pay') {
          res.statusCode = 301
          res.setHeader('Location', '/pay/')
          return res.end()
        }
        if (pathname.startsWith('/pay/')) return next()
        const rel = pathname.endsWith('/') ? pathname + 'index.html' : pathname
        const file = join(landingDir, rel)
        if (!file.startsWith(landingDir) || !existsSync(file)) return next()
        if (!statSync(file).isFile()) return next()
        res.setHeader(
          'Content-Type',
          MIME[extname(file)] ?? 'application/octet-stream'
        )
        createReadStream(file).pipe(res)
      })
    }
  }
}

export default defineConfig({
  base: '/pay/',
  plugins: [react(), serveLanding()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['insieme.test'],
    port: 4004
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@insieme/shared': resolve(__dirname, '../shared/src')
    }
  }
})
