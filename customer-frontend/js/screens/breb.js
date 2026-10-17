/* Flujo Transferencia Bre-B (consume integration-backend /v1/breb)
 *  breb          → Llave: se resuelve (POST /v1/breb/keys/resolve) y se muestra el titular enmascarado + banco
 *  breb-monto    → Monto y descripción (límites de GET /v1/products, con respaldo local)
 *  breb-confirm  → "Ver detalles" → 2º toque envía (POST /v1/breb/transfers)
 *  breb-pasarela → ui.pasarela mientras responde el POST real
 *  breb-ok       → Comprobante
 */
(function () {
  const { ui } = App;

  const limits = { min: 1000, max: 5000000, descMax: 100, keyMax: 64 }; // respaldo si el backend no responde
  if (App.api && App.api.products) {
    App.api.products().then((r) => {
      const p = ((r && r.products) || []).find(x => x.id === 'breb');
      if (!p) return;
      if (Number.isInteger(p.min_amount)) limits.min = p.min_amount;
      if (Number.isInteger(p.max_amount)) limits.max = p.max_amount;
      const d = (p.fields || []).find(f => f.name === 'description');
      if (d && d.max_length) limits.descMax = d.max_length;
      const k = (p.fields || []).find(f => f.name === 'key');
      if (k && k.max_length) limits.keyMax = k.max_length;
    }).catch(() => { /* se conservan los límites de respaldo */ });
  }

  const GENERIC = 'No pudimos completar la operación, intenta de nuevo';
  const KEY_TYPES = { phone: 'Celular', email: 'Correo electrónico', document: 'Documento', alphanumeric: 'Llave alfanumérica' };
  const keyType = (t) => KEY_TYPES[t] || 'Llave Bre-B';

  const CHECK = '<svg class="bb-step-ico" viewBox="0 0 16 16" fill="none" stroke="#3D4B66" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3.2L13 4.8"/></svg>';
  const steps = (active) => ui.stepper([
    { label: 'Llave', icon: '<img src="assets/icons/field-id.svg" alt="">', action: active > 0 ? 'toKey' : null },
    { label: 'Monto', icon: '<img src="assets/icons/peso.svg" alt="">', action: active > 1 ? 'toAmount' : null },
    { label: 'Confirmación', icon: CHECK },
  ], active).replace('class="stepper"', 'class="stepper bb-steps"');

  const keyOf = (f) => String(f.key || '').trim();
  const keyOk = (f) => keyOf(f).length > 0 && keyOf(f).length <= limits.keyMax;
  const amountOf = (f) => Number(ui.digits(f.amountText));
  const amountOk = (f) => { const a = amountOf(f); return Number.isInteger(a) && a >= limits.min && a <= limits.max; };
  const descOf = (f) => String(f.desc || '').trim();

  const summary = (f) => {
    const h = f.holder || {};
    const rows = [
      ['Llave Bre-B', ui.esc(keyOf(f))],
      ['Tipo de llave', ui.esc(keyType(h.key_type))],
      ['Titular', ui.esc(h.holder_name || '—')],
      ['Banco', ui.esc(h.bank || '—')],
      ['Valor a transferir', ui.money(amountOf(f))],
    ];
    if (descOf(f)) rows.push(['Descripción', ui.esc(descOf(f))]);
    return rows;
  };

  const fmtDate = (iso) => {
    const d = new Date(iso);
    if (!iso || isNaN(d)) return ui.now();
    const p = (x) => String(x).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${d.getHours()}:${p(d.getMinutes())}`;
  };

  /* ---------- 1. Llave ---------- */
  const resolveKey = async (ctx) => {
    const f = ctx.flow;
    if (!keyOk(f) || f.loading) return;
    const key = keyOf(f);
    f.loading = true; f.keyError = '';
    ctx.render();
    let res = null, err = '';
    try {
      res = await App.api.brebResolve(key);
    } catch (e) {
      err = App.api.errorMessage(e, GENERIC);
    }
    if (App.flow !== f) return; // el usuario abandonó el flujo
    f.loading = false;
    if (keyOf(f) !== key) { ctx.render(); return; } // la llave cambió mientras se consultaba
    if (!res || res.exists === false) {
      f.holder = null;
      f.keyError = err || (res && res.message) || 'La llave Bre-B no existe o no está activa';
      ctx.render();
      return;
    }
    f.holder = res;
    ctx.render();
  };

  App.register('breb', {
    render({ flow }) {
      const h = flow.holder;
      const ok = keyOk(flow) && !flow.loading;
      return `
      <div class="screen">
        <div class="content bb-form">
          ${ui.logo()}
          <p class="title-18">Transferencia Bre-B</p>
          ${steps(0)}
          ${ui.stepTitle(1, 'Llave del destinatario', 'Ingresa la llave Bre-B<br>de quien recibe el dinero')}
          <div class="bb-fields">
            ${ui.field({ key: 'key', icon: 'assets/icons/field-id.svg', placeholder: 'Ingresa la llave', value: flow.key || '', action: 'setKey', maxlength: limits.keyMax, last: true })
              .replace('class="item-list', `class="item-list${flow.keyError ? ' is-error' : ''}`)}
            <p class="bb-help">Celular, correo, documento o llave alfanumérica</p>
            ${flow.keyError ? `<p class="err">${ui.esc(flow.keyError)}</p>` : ''}
            ${h ? `
            <div class="bb-holder" role="status">
              <span class="bb-holder__tag">Llave encontrada</span>
              <span class="bb-holder__name">${ui.esc(h.holder_name || '')}</span>
              <span class="bb-holder__meta">${ui.esc(h.bank || '')}<br>${ui.esc(keyType(h.key_type))}: ${ui.esc(h.key || keyOf(flow))}</span>
            </div>` : ''}
          </div>
          <div class="sheet__actions bb-actions">
            ${ui.backBtn('home')}
            ${h
              ? '<button type="button" class="btn btn--active btn--grow" data-action="next">Continuar</button>'
              : `<button type="button" class="btn ${ok ? 'btn--active' : 'btn--disabled'} btn--grow" data-action="consult" ${ok ? '' : 'aria-disabled="true"'}>${flow.loading ? '<span class="bb-spin"></span>Consultando…' : 'Consultar llave'}</button>`}
          </div>
          <div class="footer">${ui.byPuntored()}</div>
        </div>
      </div>`;
    },
    mount(root, ctx) {
      const inp = root.querySelector('[data-key="key"]');
      if (inp) {
        inp.setAttribute('enterkeyhint', 'search');
        inp.setAttribute('autocomplete', 'off');
        inp.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const f = App.flow;
          if (f.holder) ctx.go('breb-monto'); else resolveKey(App.ctx());
        });
      }
    },
    actions: {
      setKey: (ctx, el) => {
        ctx.flow.key = el.value.slice(0, limits.keyMax);
        ctx.flow.holder = null; ctx.flow.keyError = '';
        ctx.render();
      },
      consult: (ctx) => resolveKey(ctx),
      next: (ctx) => { if (ctx.flow.holder) ctx.go('breb-monto'); },
    },
  });

  /* ---------- 2. Monto y descripción ---------- */
  App.register('breb-monto', {
    render({ flow }) {
      const h = flow.holder || {};
      const amtErr = flow.amountText && !amountOk(flow);
      return `
      <div class="screen">
        <div class="content content--sheet bb-form" data-scroll="main">
          ${ui.logo()}
          <p class="title-18">Transferencia Bre-B</p>
          ${steps(1)}
          <div class="bb-holder">
            <span class="bb-holder__tag">Enviar a</span>
            <span class="bb-holder__name">${ui.esc(h.holder_name || '')}</span>
            <span class="bb-holder__meta">${ui.esc(h.bank || '')}</span>
          </div>
          ${ui.stepTitle(2, 'Valor a transferir', 'Ingresa el valor y, si quieres,<br>una descripción').replace('<div class="step-title">', '<div class="step-title step-title--full">')}
          <div class="bb-fields">
            ${ui.field({ key: 'amount', icon: 'assets/icons/peso.svg', placeholder: '$ 150.000', value: flow.amountText ? '$ ' + flow.amountText : '', action: 'setAmount', inputmode: 'numeric', maxlength: 12, last: true })
              .replace('class="item-list', `class="item-list${amtErr ? ' is-error' : ''}`)}
            ${amtErr ? `<p class="err">El valor debe estar entre ${ui.money(limits.min)} y ${ui.money(limits.max)}</p>` : ''}
            ${ui.field({ key: 'desc', placeholder: 'Descripción (opcional)', value: flow.desc || '', action: 'setDesc', maxlength: limits.descMax, last: true })}
          </div>
          <div class="footer">${ui.byPuntored()}</div>
        </div>
        ${ui.sheet({
          rows: summary(flow),
          primary: { label: 'Continuar', enabled: amountOk(flow), action: 'next' },
          back: 'back', toggle: false,
        })}
      </div>`;
    },
    actions: {
      toKey: (ctx) => ctx.back(),
      setAmount: (ctx, el) => {
        const d = ui.digits(el.value).slice(0, 9);
        ctx.flow.amountText = d ? ui.num(d) : '';
        ctx.render();
      },
      setDesc: (ctx, el) => { ctx.flow.desc = el.value.slice(0, limits.descMax); ctx.render(); },
      next: (ctx) => { if (amountOk(ctx.flow)) { ctx.flow.sheetOpen = false; ctx.flow.error = ''; ctx.go('breb-confirm'); } },
    },
  });

  /* ---------- 3. Confirmación ---------- */
  App.register('breb-confirm', {
    render({ flow }) {
      return `
      <div class="screen">
        <div class="content content--sheet bb-form" data-scroll="main">
          ${ui.logo()}
          <p class="title-18">Transferencia Bre-B</p>
          ${steps(2)}
          ${ui.stepTitle(3, 'Confirma tu transferencia', 'Revisa los datos antes de enviar<br>el dinero')}
          <div class="bb-fields">
            <div class="bb-holder">
              <span class="bb-holder__tag">Vas a enviar</span>
              <span class="bb-holder__name">${ui.money(amountOf(flow))}</span>
              <span class="bb-holder__meta">A ${ui.esc((flow.holder || {}).holder_name || '')}<br>${ui.esc((flow.holder || {}).bank || '')}</span>
            </div>
            ${flow.error ? `<p class="err" role="alert">${ui.esc(flow.error)}</p>` : ''}
          </div>
          <div class="footer">${ui.byPuntored()}</div>
        </div>
        ${ui.sheet({
          open: !!flow.sheetOpen,
          rows: summary(flow),
          primary: { label: 'Confirmar', enabled: true, action: 'confirm' },
          back: 'back',
        })}
      </div>`;
    },
    actions: {
      toKey: (ctx) => { ctx.back(); ctx.back(); },
      toAmount: (ctx) => ctx.back(),
      confirm: (ctx) => {
        const f = ctx.flow;
        // 1er toque: despliega "Ver detalles"; 2do toque: envía
        if (!f.sheetOpen) { f.sheetOpen = true; ctx.render(); return; }
        if (f.result) { ctx.go('breb-ok', {}, { replace: true }); return; } // ya enviada: no duplicar
        f.error = '';
        ctx.go('breb-pasarela');
      },
    },
  });

  /* ---------- 4. Pasarela (envío real) ---------- */
  App.register('breb-pasarela', {
    render: () => ui.pasarela('assets/icons/cat-breb.svg'),
    async mount(root, ctx) {
      const f = ctx.flow;
      if (f.sending) return;
      f.sending = true;
      const body = { key: keyOf(f), amount: amountOf(f) };
      if (descOf(f)) body.description = descOf(f);
      const wait = new Promise(r => setTimeout(r, 2200));
      let res = null, err = '';
      try {
        res = await App.api.brebSend(body);
      } catch (e) {
        err = App.api.errorMessage(e, 'No pudimos confirmar la transferencia. Revisa el historial antes de volver a intentar');
      }
      await wait;
      if (App.flow !== f) return;
      f.sending = false;
      if (res) { f.result = res; App.go('breb-ok', {}, { replace: true }); return; }
      f.error = err;
      f.sheetOpen = false;
      App.back(); // vuelve a la confirmación con el error
    },
  });

  /* ---------- 5. Comprobante ---------- */
  App.register('breb-ok', {
    render({ flow }) {
      const r = flow.result || {};
      const done = !r.status || r.status === 'completed';
      const rows = [
        ['Fecha y hora', fmtDate(r.created_at)],
        ['Estado', done ? 'Completada' : ui.esc(r.status), done ? 'bb-ok' : ''],
        ['ID transacción', ui.esc(r.transfer_id || '')],
        ['Titular', ui.esc(r.holder_name || (flow.holder || {}).holder_name || '')],
        ['Banco', ui.esc(r.bank || (flow.holder || {}).bank || '')],
        ['Llave Bre-B', ui.esc(r.key || keyOf(flow))],
        ['Valor transferido', ui.money(r.amount != null ? r.amount : amountOf(flow))],
      ];
      if (r.description || descOf(flow)) rows.push(['Descripción', ui.esc(r.description || descOf(flow))]);
      return `
      <div class="screen screen--gray">
        <div class="content bb-receipt" data-scroll="main">
          ${ui.logo()}
          <p class="receipt-title">¡Transacción exitosa!</p>
          ${r.message ? `<p class="bb-msg">${ui.esc(r.message)}</p>` : ''}
          <div class="receipt-rows">${ui.rows(rows)}</div>
          ${ui.processedBy()}
          ${ui.finishLink()}
        </div>
      </div>`;
    },
  });
})();
