import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { listBillers, lookupInvoice } from './src/providers/index.js'
import { createOrder, onRedirect, reconcile, orders, publicView } from './src/orders.js'
import { isSimulated } from './src/openpayments.js'

const PORT = Number(process.env.PORT || 3000)
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`
const PUB = path.resolve('public')
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' }
const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)) }
const readBody = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => r(d ? JSON.parse(d) : {})) })

export const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, BASE_URL)
  try {
    if (u.pathname === '/api/config') return json(res, 200, { simulatedOP: isSimulated })
    if (u.pathname === '/api/billers') return json(res, 200, listBillers(u.searchParams.get('q') || ''))
    if (u.pathname === '/api/invoices/lookup' && req.method === 'POST') {
      const { billerId, reference } = await readBody(req)
      const inv = await lookupInvoice(billerId, String(reference || '').trim())
      return inv ? json(res, 200, inv) : json(res, 404, { error: 'No encontramos esa factura' })
    }
    if (u.pathname === '/api/orders' && req.method === 'POST') {
      const { invoice, payerWallet } = await readBody(req)
      const fresh = await lookupInvoice(invoice?.billerId, invoice?.reference) // nunca confiar en el monto del cliente
      if (!fresh) return json(res, 404, { error: 'Factura no encontrada' })
      return json(res, 201, publicView(await createOrder({ invoice: fresh, payerWallet, baseUrl: BASE_URL })))
    }
    const m = u.pathname.match(/^\/api\/orders\/([\w-]+)$/)
    if (m) {
      const o = orders.get(m[1]); if (!o) return json(res, 404, { error: 'no existe' })
      await reconcile(o); return json(res, 200, publicView(o))
    }
    if (u.pathname === '/api/admin/orders') // vista interna: aquí sí se ve el proveedor que ejecutó
      return json(res, 200, [...orders.values()].map((o) => ({ id: o.id, state: o.state, routedVia: o.receipt?.provider, events: o.events })))
    if (u.pathname === '/finish') { // redirect GNAP
      const id = u.searchParams.get('order')
      try { await onRedirect(id, { interactRef: u.searchParams.get('interact_ref'), hash: u.searchParams.get('hash') }) }
      catch (e) { res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end(`No se pudo completar: ${e.message}`) }
      res.writeHead(302, { Location: `/#order=${id}` }); return res.end()
    }
    const file = path.join(PUB, u.pathname === '/' ? 'index.html' : u.pathname)
    if (file.startsWith(PUB) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); return res.end(fs.readFileSync(file))
    }
    json(res, 404, { error: 'not found' })
  } catch (e) { console.error(e); json(res, 500, { error: 'error interno' }) }
})

if (process.argv[1].endsWith('server.js')) server.listen(PORT, () => console.log(`Insieme en ${BASE_URL}${isSimulated ? '  [OPEN PAYMENTS SIMULADO]' : ''}`))
