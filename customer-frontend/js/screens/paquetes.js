/* Flujo Paquetes: Operadores (2177:7048) → Paquetes/Número (2177:7079, 2177:8202, 2177:8409)
 * → Confirmación (2177:8602) → Pasarela (2177:7260) → Comprobante (2177:7223) */
(function () {
  const { ui } = App;

  /* Iconos de app del paquete (Wifi 2177:7785, Whatsapp 2177:7783, Min 2177:7784) */
  const ICONS = {
    wifi: 'assets/paquetes/wifi.svg',
    whatsapp: 'assets/paquetes/whatsapp.svg',
    min: 'assets/paquetes/min.svg',
  };

  /* Catálogo base (los 3 primeros son los del Figma). "\n" = salto de línea en confirmación/comprobante */
  const BASE = [
    { name: '100 MB de Full Internet', icons: ['wifi'], days: 30, price: 25000 },
    { name: 'Chat de whatsapp ilimitado', icons: ['whatsapp'], days: 20, price: 20000 },
    { name: '5 Minutos + Datos\n+ WhatsApp ilimitado', icons: ['wifi', 'min', 'whatsapp'], days: 30, price: 25000 },
    { name: '1 GB de Full Internet', icons: ['wifi'], days: 7, price: 10000 },
    { name: '50 Minutos a todo destino', icons: ['min'], days: 15, price: 12000 },
    { name: '3 GB + WhatsApp ilimitado', icons: ['wifi', 'whatsapp'], days: 15, price: 18000 },
    { name: '6 GB + 100 Minutos', icons: ['wifi', 'min'], days: 30, price: 35000 },
    { name: 'Minutos ilimitados + 2 GB', icons: ['min', 'wifi'], days: 30, price: 30000 },
    { name: '10 GB + Minutos\n+ WhatsApp ilimitado', icons: ['wifi', 'min', 'whatsapp'], days: 30, price: 45000 },
  ];
  /* Por operador: factor de precio y qué paquetes ofrece (6–9) */
  const OFFER = {
    claro: { f: 1, pick: 'all' },
    movistar: { f: 1.04, pick: 'all' },
    tigo: { f: 1, pick: 'all' },
    wom: { f: 0.92, pick: [0, 1, 2, 3, 5, 6, 7] },
    'movil-exito': { f: 0.96, pick: [0, 1, 2, 3, 5, 6] },
    etb: { f: 0.96, pick: [0, 1, 2, 3, 4, 6] },
    kalley: { f: 0.9, pick: [0, 1, 2, 3, 5, 7] },
    virgin: { f: 0.92, pick: [0, 1, 2, 3, 5, 6, 8] },
    flash: { f: 0.88, pick: [0, 1, 2, 3, 4, 5] },
  };
  const PER_PAGE = 3;

  const catalog = (opId) => {
    const o = OFFER[opId] || OFFER.claro;
    const idx = o.pick === 'all' ? BASE.map((_, i) => i) : o.pick;
    return idx.map(i => ({ id: String(i), ...BASE[i], price: Math.round((BASE[i].price * o.f) / 1000) * 1000 }));
  };
  App.data = App.data || {};
  App.data.packagesFor = catalog;

  const pkgOf = (flow) => catalog(flow.operator).find(p => p.id === flow.pkg);
  const phoneOk = (flow) => /^3\d{9}$/.test(flow.phone || '');
  const nameHtml = (p) => ui.esc(p.name).replace(/\n/g, '<br>');

  const steps = (active) => ui.stepper([
    { label: 'Mi operador', icon: ui.iconOperador(), action: active === 1 ? 'toOperators' : null },
    { label: 'Paquetes', icon: ui.iconRecargar() },
  ], active);

  /* Paso 1 · Operadores (2177:7048) */
  App.register('paquetes', {
    render({ flow }) {
      return `
      <div class="screen">
        <div class="content">
          ${ui.logo()}
          <p class="title-18">Paquetes para tu celular</p>
          ${steps(0)}
          ${ui.stepTitle(1, 'Selecciona tu operador', 'Selecciona el operador<br>de tu preferencia')}
          ${ui.operatorGrid(flow.operator)}
          <div class="bottom">
            ${ui.btn('Volver', { variant: 'dark', action: 'home' })}
            <div class="footer">${ui.byPuntored()}</div>
          </div>
        </div>
      </div>`;
    },
    mount(root) {
      const tip = root.querySelector('.step-title .tip');
      if (tip && !App.flow.tipShown) { App.flow.tipShown = true; tip.classList.add('is-open'); App.later(() => tip.classList.remove('is-open'), 3000); }
    },
    actions: {
      pickOperator: (ctx, el) => {
        if (ctx.flow.operator !== el.dataset.id) { ctx.flow.pkg = null; ctx.flow.page = 0; ctx.flow.sheetOpen = false; }
        ctx.flow.operator = el.dataset.id;
        ctx.render();
        App.later(() => ctx.go('paquetes-elegir'), 180);
      },
    },
  });

  /* Tarjeta de paquete (Paquetes 2177:7802) */
  const card = (p, selected) => `
    <button type="button" class="pq-card${selected ? ' is-selected' : ''}" data-action="pickPkg" data-id="${p.id}" aria-pressed="${selected}">
      <span class="pq-card__main">
        <span class="pq-card__icons">${p.icons.map(i => `<img src="${ICONS[i]}" alt="" width="16" height="16">`).join('')}</span>
        <span class="pq-card__name">${nameHtml(p)}</span>
      </span>
      <span class="pq-card__side">
        <span class="pq-card__days">${p.days} Días</span>
        <span class="pq-card__price">${ui.money(p.price)}</span>
      </span>
    </button>`;

  /* Slider (2177:8379): ‹ ● ○ ○ › */
  const slider = (page, pages) => `
    <div class="pq-slider">
      <button type="button" class="pq-slider__arrow pq-slider__arrow--prev" data-action="pagePrev" aria-label="Anterior" ${page === 0 ? 'aria-disabled="true"' : ''}><img src="assets/icons/chevron-up.svg" alt="" width="16" height="16"></button>
      <span class="pq-slider__dots">${Array.from({ length: pages }, (_, i) => `<button type="button" class="pq-dot${i === page ? ' is-active' : ''}" data-action="pageGo" data-page="${i}" aria-label="Página ${i + 1}"></button>`).join('')}</span>
      <button type="button" class="pq-slider__arrow pq-slider__arrow--next" data-action="pageNext" aria-label="Siguiente" ${page >= pages - 1 ? 'aria-disabled="true"' : ''}><img src="assets/icons/chevron-up.svg" alt="" width="16" height="16"></button>
    </div>`;

  const summary = (flow) => {
    const p = pkgOf(flow);
    return [
      ['Operador', ui.esc(App.data.operatorById(flow.operator)?.name || '—')],
      ['Valor a recargar', p ? ui.money(p.price) : '—'],
      ['Número celular', ui.esc(flow.phone || '—')],
      ['Paquete', p ? nameHtml(p) : '—'],
    ];
  };

  /* Paso 2 y 3 · Paquetes + Número (2177:7079 / 2177:8202 / 2177:8409) + Confirmación (2177:8602) */
  App.register('paquetes-elegir', {
    render({ flow }) {
      const list = catalog(flow.operator);
      const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
      const page = Math.min(flow.page || 0, pages - 1);
      const shown = list.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
      const ready = !!pkgOf(flow) && phoneOk(flow);
      const phoneErr = flow.phone && flow.phone.length === 10 && !phoneOk(flow);
      return `
      <div class="screen">
        <div class="content content--sheet" data-scroll="main">
          ${ui.logo()}
          <p class="title-18">Paquetes para tu celular</p>
          ${steps(1)}
          <div class="step-title pq-step2">
            <span class="step-num">2</span><span class="step-title__text">Paquetes</span>
            <span class="pq-step2__tip">${ui.tip('Selecciona el paquete de tu preferencia')}</span>
          </div>
          <div class="pq-form">
            <div class="pq-packs">
              <div class="pq-list" data-page="${page}">${shown.map(p => card(p, p.id === flow.pkg)).join('')}</div>
              ${pages > 1 ? slider(page, pages) : ''}
            </div>
            <div class="pq-num">
              <div class="step-title step-title--full"><span class="step-num">3</span><span class="step-title__text">Número a recargar</span>${ui.tip('Ingresa el número celular<br>al que llegará el paquete', { icon: 'alert' })}</div>
              ${ui.field({ key: 'phone', icon: 'assets/icons/phone-small.svg', placeholder: 'Ingresa tu número celular', value: flow.phone || '', action: 'setPhone', inputmode: 'numeric', maxlength: 10 }).replace('class="item-list', `class="item-list${phoneErr ? ' is-error' : ''}`)}
              ${phoneErr ? '<p class="err">Ingresa un celular válido (10 dígitos, inicia en 3)</p>' : ''}
            </div>
          </div>
          <div class="footer pq-footer">${ui.byPuntored()}</div>
        </div>
        ${ui.sheet({
          open: !!flow.sheetOpen,
          rows: summary(flow),
          primary: { label: 'Continuar', enabled: ready, action: 'confirm' },
        })}
      </div>`;
    },
    mount(root) {
      const tip = root.querySelector('.pq-step2 .tip');
      if (tip && !App.flow.tip2Shown) { App.flow.tip2Shown = true; tip.classList.add('is-open'); App.later(() => tip.classList.remove('is-open'), 3000); }
    },
    actions: {
      toOperators: (ctx) => ctx.back(),
      pickPkg: (ctx, el) => {
        const was = ctx.flow.pkg === el.dataset.id;
        ctx.flow.pkg = was ? null : el.dataset.id;
        ctx.render();
        // Tras elegir, lleva la vista al paso 3 si el número aún no está completo
        if (!was && !phoneOk(ctx.flow)) {
          const num = document.querySelector('.pq-num');
          if (num) num.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      },
      pagePrev: (ctx) => { ctx.flow.page = Math.max(0, (ctx.flow.page || 0) - 1); ctx.render(); },
      pageNext: (ctx) => {
        const pages = Math.ceil(catalog(ctx.flow.operator).length / PER_PAGE);
        ctx.flow.page = Math.min(pages - 1, (ctx.flow.page || 0) + 1); ctx.render();
      },
      pageGo: (ctx, el) => { ctx.flow.page = Number(el.dataset.page); ctx.render(); },
      setPhone: (ctx, el) => { ctx.flow.phone = ui.digits(el.value).slice(0, 10); ctx.render(); },
      confirm: (ctx) => {
        if (!(pkgOf(ctx.flow) && phoneOk(ctx.flow))) return;
        // 1er toque: despliega "Confirma la transacción"; 2do toque: procesa
        if (!ctx.flow.sheetOpen) { ctx.flow.sheetOpen = true; ctx.render(); return; }
        ctx.flow.receipt = { date: ui.now(), compra: ui.rand(10) };
        ctx.go('paquetes-pasarela');
      },
    },
  });

  /* Pasarela (2177:7260) */
  App.register('paquetes-pasarela', {
    render: () => ui.pasarela('assets/icons/cat-paquetes.svg', 33.156, 36.84),
    mount: () => App.later(() => App.go('paquetes-ok', {}, { replace: true }), 2200),
  });

  /* Comprobante (2177:7223) */
  App.register('paquetes-ok', {
    render({ flow }) {
      const op = App.data.operatorById(flow.operator)?.name || '';
      const p = pkgOf(flow);
      const site = op.toLowerCase().replace(/é/g, 'e').replace(/\s/g, '');
      return `
      <div class="screen screen--gray">
        <div class="content content--center receipt">
          ${ui.logo()}
          <p class="receipt-title">¡Transacción exitosa!</p>
          <div class="receipt-rows">
            ${ui.rows([
              ['Operador', ui.esc(op)],
              ['Valor a recargar', p ? ui.money(p.price) : ''],
              ['Número de recargar', ui.esc(flow.phone)],
              ['Paquete', p ? nameHtml(p) : ''],
              ['Fecha y hora', flow.receipt?.date || ''],
            ])}
          </div>
          <p class="fine">${ui.esc(op)} es el operador responsable de la prestación del servicio. El usuario/suscriptor acepta conocer el reglamento de usuario prepago, para más información www.${ui.esc(site)}.co o llama en Bogotá al 4864710 o a 018000 486000</p>
          ${ui.processedBy()}
          ${ui.finishLink()}
        </div>
      </div>`;
    },
  });
})();
