const $ = (id) => document.getElementById(id)
const api = async (url, body) => {
  const r = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined)
  const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Error'); return j
}
const cop = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maxFractionDigits: 0 }).format(n)
let biller, invoice
fetch('/api/config').then((r) => r.json()).then((c) => { $('sim').hidden = !c.simulatedOP })

async function loadBillers() {
  const list = await api('/api/billers?q=' + encodeURIComponent($('q').value))
  $('billers').innerHTML = ''
  list.forEach((b) => { const li = document.createElement('li'); li.textContent = b.name
    li.onclick = () => { biller = b; [...$('billers').children].forEach((x) => x.classList.remove('sel')); li.classList.add('sel'); $('refBox').hidden = false }
    $('billers').append(li) })
}
$('q').oninput = loadBillers; loadBillers()

$('lookup').onclick = async () => {
  $('err1').textContent = ''
  try {
    invoice = await api('/api/invoices/lookup', { billerId: biller.id, reference: $('ref').value })
    $('invoice').innerHTML = `<b>${invoice.billerName}</b><br>${invoice.holder} · ${invoice.concept}<br><big>${cop(invoice.amountCOP)}</big>` + (invoice.dueDate ? `<br>Vence ${invoice.dueDate}` : '')
    $('s2').hidden = false
  } catch (e) { $('err1').textContent = e.message }
}
$('pay').onclick = async () => {
  $('err2').textContent = ''
  try { const o = await api('/api/orders', { invoice, payerWallet: $('wallet').value.trim() }); location.href = o.redirect }
  catch (e) { $('err2').textContent = e.message }
}

const STEPS = [['awaiting_approval', 'Autoriza el pago en tu billetera'], ['paying', 'Moviendo el dinero (Open Payments)'], ['received', 'Fondos recibidos'], ['settled', 'Factura pagada en Colombia']]
async function track(id) {
  ['s1', 's2'].forEach((s) => ($(s).hidden = true)); $('s3').hidden = false
  const o = await api('/api/orders/' + id)
  const idx = STEPS.findIndex(([s]) => s === o.state)
  $('steps').innerHTML = STEPS.map(([, t], i) => `<li class="${o.state === 'settled' || i < idx ? 'done' : ''}">${t}</li>`).join('')
  $('events').innerHTML = o.events.map((e) => `<li>${e}</li>`).join('')
  if (o.state === 'settlement_failed') $('events').insertAdjacentHTML('beforeend', '<li class="err">No pudimos pagar la factura. Tu dinero queda registrado para reintento/reembolso.</li>')
  if (o.receipt) { $('receipt').hidden = false
    $('receipt').innerHTML = `<b>Recibo</b><br>${o.invoice.billerName} · ${o.invoice.reference}<br>${cop(o.receipt.amountCOP)} · Autorización ${o.receipt.authCode}<br>${new Date(o.receipt.paidAt).toLocaleString('es-CO')}` }
  if (!['settled', 'settlement_failed'].includes(o.state)) setTimeout(() => track(id), 1500)
}
const m = location.hash.match(/order=([\w-]+)/); if (m) track(m[1])
