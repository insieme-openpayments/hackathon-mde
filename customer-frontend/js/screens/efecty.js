/* Flujo Giro Efecty (integration-backend /v1/efecty)
 *  efecty           → Beneficiario: cédula (acepta puntos), nombre, celular opcional (paso 1)
 *  efecty-monto     → Monto: chips + teclado "$ 250.000"; límites de GET /v1/products (paso 2)
 *  efecty-confirm   → Cotización (POST /quote) + "Ver detalles"; 2º toque envía (paso 3)
 *  efecty-pasarela  → Espera la respuesta real de POST /transfers (sin temporizador fijo)
 *  efecty-ok        → Comprobante "Disponible para reclamar"
 */
(function () {
  const { ui } = App;
  const FALLBACK = { min: 10000, max: 1500000 };
  const CHIPS = [50000, 100000, 250000, 500000, 1000000, 1500000];
  const ERR_SEND = 'No pudimos procesar el giro, intenta de nuevo';
  const ERR_QUOTE = 'No pudimos cotizar el giro, intenta de nuevo';

  const limits = (f) => f.limits || FALLBACK;
  const doc = (f) => ui.digits(f.doc);
  const docOk = (f) => doc(f).length >= 6 && doc(f).length <= 15;
  const nameOk = (f) => (f.name || '').trim().length >= 1 && (f.name || '').trim().length <= 80;
  const phoneOk = (f) => !f.phone || /^3\d{9}$/.test(f.phone);
  const amountOf = (f) => Number(ui.digits(f.amountText));
  const amountOk = (f) => { const a = amountOf(f), l = limits(f); return Number.isInteger(a) && a >= l.min && a <= l.max; };
  const body = (f) => {
    const b = { recipient_document: doc(f), recipient_name: f.name.trim(), amount: amountOf(f) };
    if (f.phone) b.recipient_phone = f.phone;
    return b;
  };
  const sig = (f) => JSON.stringify(body(f));
  const fmtDate = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const p = (x) => String(x).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  };
  const fmtDateTime = (iso) => {
    const d = new Date(iso);
    if (!iso || isNaN(d)) return ui.now();
    const p = (x) => String(x).padStart(2, '0');
    return `${fmtDate(iso)} ${d.getHours()}:${p(d.getMinutes())}`;
  };

  /* Límites del producto (una vez por flujo; respaldo local si el backend no responde) */
  const loadLimits = (f) => {
    if (f.limits || f.limitsLoading || !App.api) return;
    f.limitsLoading = true;
    App.api.products().then((r) => {
      const p = ((r && r.products) || []).find(x => x.id === 'efecty');
      if (p && Number.isFinite(p.min_amount) && Number.isFinite(p.max_amount)) f.limits = { min: p.min_amount, max: p.max_amount };
      if (p && p.enabled === false) f.disabled = true;
    }).catch(() => {}).then(() => {
      f.limitsLoading = false;
      if (App.flow === f && /^efecty-monto$/.test(document.getElementById('app').dataset.screen || '')) App.render();
    });
  };

  const steps = (active) => ui.stepper([
    { label: 'Beneficiario', icon: '<img src="assets/icons/user.svg" alt="">', action: active > 0 ? 'toStep1' : null },
    { label: 'Monto', icon: '<img src="assets/icons/peso.svg" alt="">', action: active > 1 ? 'toStep2' : null },
    { label: 'Confirmación', icon: '<img src="assets/icons/alert-circle.svg" alt="">' },
  ], active).replace('class="stepper"', 'class="stepper ef-steps"');

  const nav = {
    toStep1: () => App.go('efecty', {}, { replace: true }),
    toStep2: () => App.go('efecty-monto', {}, { replace: true }),
  };

  /* ---------- 1. Beneficiario ---------- */
  App.register('efecty', {
    render({ flow }) {
      const dErr = flow.doc && !docOk(flow) && doc(flow).length > 0 && flow.touched;
      const pErr = flow.phone && flow.phone.length === 10 && !phoneOk(flow);
      const ready = docOk(flow) && nameOk(flow) && phoneOk(flow);
      return `
      <div class="screen">
        <div class="content" data-scroll="main">
          ${ui.logo()}
          <p class="title-18">Giro Efecty</p>
          ${steps(0)}
          ${ui.stepTitle(1, 'Datos del beneficiario', 'Quien recibe el giro lo reclama<br>en un punto Efecty con su cédula')}
          <div class="ef-form">
            ${ui.field({ key: 'doc', icon: 'assets/icons/field-id.svg', placeholder: 'Cédula del beneficiario', value: flow.doc || '', action: 'setDoc', inputmode: 'numeric', maxlength: 18 }).replace('class="item-list', `class="item-list${dErr ? ' is-error' : ''}`)}
            ${dErr ? '<p class="err">La cédula debe tener entre 6 y 15 dígitos</p>' : ''}
            ${ui.field({ key: 'name', icon: 'assets/icons/field-user.svg', placeholder: 'Nombre del beneficiario', value: flow.name || '', action: 'setName', maxlength: 80 })}
            ${ui.field({ key: 'phone', icon: 'assets/icons/field-phone.svg', placeholder: 'Celular para notificar (opcional)', value: flow.phone || '', action: 'setPhone', inputmode: 'numeric', maxlength: 10, last: true }).replace('class="item-list', `class="item-list${pErr ? ' is-error' : ''}`)}
            ${pErr ? '<p class="err">Ingresa un celular válido (10 dígitos, inicia en 3)</p>' : ''}
          </div>
          <div class="ef-actions">
            ${ui.backBtn('home')}
            <button type="button" class="btn ${ready ? 'btn--active' : 'btn--disabled'}" data-action="next" ${ready ? '' : 'aria-disabled="true"'}>Continuar</button>
          </div>
          <div class="footer">${ui.byPuntored()}</div>
        </div>
      </div>`;
    },
    mount: () => loadLimits(App.flow),
    actions: {
      setDoc: (ctx, el) => { ctx.flow.doc = el.value.replace(/[^\d.\s]/g, ''); ctx.flow.touched = doc(ctx.flow).length >= 6; ctx.render(); },
      setName: (ctx, el) => { ctx.flow.name = el.value; ctx.render(); },
      setPhone: (ctx, el) => { ctx.flow.phone = ui.digits(el.value).slice(0, 10); ctx.render(); },
      next: (ctx) => { const f = ctx.flow; if (docOk(f) && nameOk(f) && phoneOk(f)) { f.quote = null; ctx.go('efecty-monto'); } },
    },
  });

  /* ---------- 2. Monto ---------- */
  App.register('efecty-monto', {
    render({ flow }) {
      const l = limits(flow), amt = amountOf(flow);
      const local = flow.amountText && !amountOk(flow) ? `El valor debe estar entre ${ui.money(l.min)} y ${ui.money(l.max)}` : '';
      const errMsg = flow.amountError || local;
      const err = !!errMsg;
      const can = amountOf(flow) > 0 && !flow.checking;
      return `
      <div class="screen">
        <div class="content" data-scroll="main">
          ${ui.logo()}
          <p class="title-18">Giro Efecty</p>
          ${steps(1)}
          ${ui.stepTitle(2, 'Monto del giro', `Ingresa el valor o selecciona uno.<br>Entre ${ui.money(l.min)} y ${ui.money(l.max)}`)}
          <div class="ef-form">
            <div class="values">
              ${CHIPS.filter(a => a >= l.min && a <= l.max).map(a => `<button type="button" class="value-chip${a === amt ? ' is-selected' : ''}" data-action="pickAmount" data-v="${a}">${ui.money(a)}</button>`).join('')}
            </div>
            ${ui.field({ key: 'amount', icon: 'assets/icons/peso.svg', placeholder: 'Ingresa otro valor', value: flow.amountText ? '$ ' + flow.amountText : '', action: 'setAmount', inputmode: 'numeric', maxlength: 11, last: true }).replace('class="item-list', `class="item-list${err ? ' is-error' : ''}`)}
            ${err ? `<p class="err" role="alert">${ui.esc(errMsg)}</p>` : ''}
          </div>
          <div class="ef-actions">
            ${ui.backBtn()}
            <button type="button" class="btn ${can ? 'btn--active' : 'btn--disabled'}" data-action="next" ${can ? '' : 'aria-disabled="true"'}>Continuar</button>
          </div>
          <div class="footer">${ui.byPuntored()}</div>
        </div>
      </div>`;
    },
    mount: () => loadLimits(App.flow),
    actions: {
      ...nav,
      pickAmount: (ctx, el) => { ctx.flow.amountText = ui.num(el.dataset.v); ctx.flow.amountError = ''; ctx.render(); },
      setAmount: (ctx, el) => { const d = ui.digits(el.value).slice(0, 8); ctx.flow.amountText = d ? ui.num(d) : ''; ctx.flow.amountError = ''; ctx.render(); },
      next: async (ctx) => {
        const f = ctx.flow;
        if (amountOk(f)) { f.error = ''; f.amountError = ''; ctx.go('efecty-confirm'); return; }
        if (!(amountOf(f) > 0) || f.checking) return;
        // Fuera de rango: el backend da el mensaje oficial (p. ej. "El giro máximo es $1.500.000 COP"); no se avanza
        const l = limits(f), s = sig(f);
        const local = `El valor debe estar entre ${ui.money(l.min)} y ${ui.money(l.max)}`;
        f.checking = true; ctx.render();
        let msg = local;
        try { await App.api.efectyQuote(body(f)); } catch (e) { msg = App.api.errorMessage(e, local); }
        f.checking = false;
        if (App.flow !== f || sig(f) !== s) return;
        f.amountError = msg;
        if (document.getElementById('app').dataset.screen === 'efecty-monto') App.render();
      },
    },
  });

  /* ---------- 3. Confirmación (cotización) ---------- */
  const startQuote = async (f) => {
    const s = sig(f);
    f.quoteSig = s; f.quote = null; f.quoteLoading = true; f.error = '';
    App.render();
    try {
      const q = await App.api.efectyQuote(body(f));
      if (App.flow !== f || f.quoteSig !== s) return;
      f.quote = q;
    } catch (e) {
      if (App.flow !== f || f.quoteSig !== s) return;
      f.error = App.api.errorMessage(e, ERR_QUOTE);
    }
    f.quoteLoading = false;
    if (document.getElementById('app').dataset.screen === 'efecty-confirm') App.render();
  };

  App.register('efecty-confirm', {
    render({ flow }) {
      const q = flow.quote;
      const ready = !!q && !flow.quoteLoading;
      const rows = q ? [
        ['Beneficiario', ui.esc(q.recipient_name)],
        ['Cédula', ui.esc(q.recipient_document)],
        ...(flow.phone ? [['Celular', ui.esc(flow.phone)]] : []),
        ['Valor del giro', ui.money(q.amount)],
        ['Comisión', ui.money(q.fee)],
        ['Total a pagar', ui.money(q.total)],
      ] : [];
      return `
      <div class="screen">
        <div class="content content--sheet" data-scroll="main">
          ${ui.logo()}
          <p class="title-18">Giro Efecty</p>
          ${steps(2)}
          ${ui.stepTitle(3, 'Confirma tu giro')}
          ${flow.quoteLoading ? '<p class="ef-state">Calculando tu giro…</p>' : ''}
          ${q ? `<div class="ef-total">${ui.rows(rows.filter(r => /Valor|Comisi|Total/.test(r[0])).map(r => r[0] === 'Total a pagar' ? [...r, 'kv--total'] : r))}</div>
          <p class="ef-hint">${ui.esc(q.message || 'El beneficiario podrá reclamar el giro con su cédula en un punto Efecty.')}</p>` : ''}
          ${flow.error ? `<p class="err">${ui.esc(flow.error)}</p>` : ''}
          ${!q && !flow.quoteLoading ? `<button type="button" class="btn btn--outline btn--block" data-action="retry">Reintentar</button>` : ''}
          <div class="footer">${ui.byPuntored()}</div>
        </div>
        ${ui.sheet({
          open: !!flow.sheetOpen && !!q,
          rows,
          primary: { label: 'Enviar giro', enabled: ready, action: 'confirm', block: true },
        })}
      </div>`;
    },
    mount(root, ctx) {
      const f = ctx.flow;
      if (!f.quoteLoading && (!f.quote || f.quoteSig !== sig(f)) && !(f.error && f.quoteSig === sig(f))) startQuote(f);
    },
    actions: {
      ...nav,
      retry: (ctx) => startQuote(ctx.flow),
      confirm: (ctx) => {
        const f = ctx.flow;
        if (!f.quote || f.quoteLoading) return;
        // 1er toque: despliega "Confirma la transacción"; 2do toque: envía
        if (!f.sheetOpen) { f.sheetOpen = true; ctx.render(); return; }
        f.error = '';
        ctx.go('efecty-pasarela');
      },
    },
  });

  /* ---------- Pasarela: espera la respuesta real ---------- */
  App.register('efecty-pasarela', {
    render: () => ui.pasarela('assets/icons/cat-efecty.svg', 33.156, 36.84),
    mount: async (root, ctx) => {
      const f = ctx.flow;
      if (f.sending) return;
      f.sending = true;
      const t0 = Date.now();
      let res, err;
      try { res = await App.api.efectySend(body(f)); } catch (e) { err = e; }
      const wait = Math.max(0, 900 - (Date.now() - t0)); // evita un parpadeo
      await new Promise(r => setTimeout(r, wait));
      f.sending = false;
      if (App.flow !== f || document.getElementById('app').dataset.screen !== 'efecty-pasarela') return;
      if (res) {
        f.result = res;
        App.go('efecty-ok', {}, { replace: true });
        return;
      }
      // Sin avanzar: vuelve a la confirmación con el error visible
      f.error = App.api.errorMessage(err, ERR_SEND);
      f.sheetOpen = false;
      App.back();
    },
  });

  /* ---------- Comprobante ---------- */
  const STATUS = { available: 'Disponible para reclamar', claimed: 'Reclamado', expired: 'Vencido' };
  App.register('efecty-ok', {
    render({ flow }) {
      const r = flow.result || {};
      const claim = r.claim || {};
      const rows = [
        ['Estado', ui.esc(STATUS[r.status] || r.status || ''), 'ef-ok'],
        ['ID del giro', ui.esc(r.transfer_id)],
        ['Beneficiario', ui.esc(r.recipient_name)],
        ['Cédula', ui.esc(r.recipient_document)],
        ['Valor del giro', ui.money(r.amount)],
        ['Comisión', ui.money(r.fee)],
        ['Total', ui.money(r.total)],
        ['Fecha y hora', fmtDateTime(r.created_at)],
        ['Vence el', fmtDate(r.expires_at)],
      ];
      return `
      <div class="screen screen--gray">
        <div class="content receipt ef-receipt" data-scroll="main">
          ${ui.logo()}
          <p class="receipt-title">¡Giro creado!</p>
          ${r.message ? `<p class="ef-msg">${ui.esc(r.message)}</p>` : ''}
          <div class="receipt-rows">${ui.rows(rows)}</div>
          ${claim.instructions ? `<p class="ef-claim">${ui.esc(claim.instructions)}</p>` : ''}
          <p class="fine">Si se requiere soporte o ampliar información contáctenos<br>a hola@oplat.co o al Whatsapp 3332822713</p>
          ${ui.finishLink()}
        </div>
      </div>`;
    },
  });
})();
