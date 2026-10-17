/* Flujo Recargas: Operadores (2025:17229) → Recargar/Valor/Número (2025:18119, 2170:6067, 2170:6206)
 * → Confirmación (2170:6473) → Pasarela (2177:6969) → Trx exitosa (2176:6760) */
(function () {
  const { ui } = App;

  /* Operadores compartidos con Paquetes. fit: cómo encaja el logo en la tarjeta (según Figma) */
  App.data = App.data || {};
  App.data.operators = [
    { id: 'claro', name: 'Claro', img: 'assets/img/op-claro.png', fit: 'contain' },
    { id: 'movil-exito', name: 'Móvil Éxito', img: 'assets/img/op-movil-exito.png', fit: 'contain' },
    { id: 'wom', name: 'WOM', img: 'assets/img/op-wom.png', fit: 'cover' },
    { id: 'tigo', name: 'Tigo', img: 'assets/img/op-tigo.png', fit: 'tigo' },
    { id: 'etb', name: 'ETB', img: 'assets/img/op-etb.png', fit: 'etb' },
    { id: 'kalley', name: 'Kalley Móvil', img: 'assets/img/op-kalley.png', fit: 'cover' },
    { id: 'movistar', name: 'Movistar', img: 'assets/img/op-movistar.svg', fit: 'h30' },
    { id: 'virgin', name: 'Virgin Mobile', img: 'assets/img/op-virgin.svg', fit: 'virgin' },
    { id: 'flash', name: 'Flash Mobile', img: 'assets/img/op-flash.png', fit: 'cover' },
  ];
  App.data.operatorById = (id) => App.data.operators.find(o => o.id === id);

  /** Grilla de operadores (Frame 2025:18018) */
  ui.operatorGrid = (selectedId, action = 'pickOperator') => `
    <div class="op-grid">
      ${App.data.operators.map(o => `
        <button type="button" class="op-card${o.id === selectedId ? ' is-selected' : ''}" data-action="${action}" data-id="${o.id}" aria-label="${o.name}">
          <span class="op-card__img op-fit--${o.fit}"><img src="${o.img}" alt="${o.name}"></span>
        </button>`).join('')}
    </div>`;

  const AMOUNTS = [2000, 4000, 6000, 8000, 10000, 20000];
  const MIN = 1000, MAX = 500000;

  const steps = (active) => ui.stepper([
    { label: 'Mi operador', icon: ui.iconOperador(), action: active === 1 ? 'toOperators' : null },
    { label: 'Recargar', icon: ui.iconRecargar() },
  ], active);

  App.register('recargas', {
    render({ flow }) {
      return `
      <div class="screen">
        <div class="content">
          ${ui.logo()}
          <p class="title-18">Recarga tu celular</p>
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
      // En el diseño el tooltip del paso 1 aparece abierto como guía
      const tip = root.querySelector('.step-title .tip');
      if (tip && !App.flow.tipShown) { App.flow.tipShown = true; tip.classList.add('is-open'); App.later(() => tip.classList.remove('is-open'), 3000); }
    },
    actions: {
      pickOperator: (ctx, el) => {
        ctx.flow.operator = el.dataset.id;
        ctx.render();
        App.later(() => ctx.go('recargas-valor'), 180);
      },
    },
  });

  const amountOf = (flow) => Number(ui.digits(flow.amountText));
  const amountOk = (flow) => amountOf(flow) >= MIN && amountOf(flow) <= MAX;
  const phoneOk = (flow) => /^3\d{9}$/.test(flow.phone || '');

  const summary = (flow) => [
    ['Operador', ui.esc(App.data.operatorById(flow.operator)?.name || '—')],
    ['Valor a recargar', amountOf(flow) ? ui.money(amountOf(flow)) : '—'],
    ['Número de recargar', ui.esc(flow.phone || '—')],
  ];

  App.register('recargas-valor', {
    render({ flow }) {
      const amt = amountOf(flow);
      const ready = amountOk(flow) && phoneOk(flow);
      const amtErr = flow.amountText && !amountOk(flow);
      const phoneErr = flow.phone && flow.phone.length === 10 && !phoneOk(flow);
      return `
      <div class="screen">
        <div class="content content--sheet" data-scroll="main">
          ${ui.logo()}
          <p class="title-18">Recarga tu celular</p>
          ${steps(1)}
          ${ui.stepTitle(2, 'Valor a recargar', 'Ingresa el valor de la recarga<br>o selecciona el valor<br>de tu preferencia')}
          <div class="rc-form">
            <div class="values">
              ${AMOUNTS.map(a => `<button type="button" class="value-chip${a === amt ? ' is-selected' : ''}" data-action="pickAmount" data-v="${a}">${ui.money(a)}</button>`).join('')}
            </div>
            ${ui.field({ key: 'amount', icon: 'assets/icons/peso.svg', placeholder: 'Ingresa otro valor', value: flow.amountText || '', action: 'setAmount', inputmode: 'numeric', maxlength: 7 }).replace('class="item-list', `class="item-list${amtErr ? ' is-error' : ''}`)}
            ${amtErr ? `<p class="err">El valor debe estar entre ${ui.money(MIN)} y ${ui.money(MAX)}</p>` : ''}
            ${ui.stepTitle(3, 'Número a recargar', 'Ingresa el número celular<br>al que llegará la recarga').replace('<div class="step-title">', '<div class="step-title step-title--full">')}
            ${ui.field({ key: 'phone', icon: 'assets/icons/phone-small.svg', placeholder: 'Ingresa tu número celular', value: flow.phone || '', action: 'setPhone', inputmode: 'numeric', maxlength: 10 }).replace('class="item-list', `class="item-list${phoneErr ? ' is-error' : ''}`)}
            ${phoneErr ? '<p class="err">Ingresa un celular válido (10 dígitos, inicia en 3)</p>' : ''}
          </div>
          <div class="footer rc-footer">${ui.byPuntored()}</div>
        </div>
        ${ui.sheet({
          open: !!flow.sheetOpen,
          rows: summary(flow),
          primary: { label: 'Continuar', enabled: ready, action: 'confirm' },
        })}
      </div>`;
    },
    actions: {
      toOperators: (ctx) => ctx.back(),
      pickAmount: (ctx, el) => { ctx.flow.amountText = ui.num(el.dataset.v); ctx.render(); },
      setAmount: (ctx, el) => {
        const d = ui.digits(el.value);
        ctx.flow.amountText = d ? ui.num(d) : '';
        ctx.render();
      },
      setPhone: (ctx, el) => { ctx.flow.phone = ui.digits(el.value).slice(0, 10); ctx.render(); },
      confirm: (ctx) => {
        if (!(amountOk(ctx.flow) && phoneOk(ctx.flow))) return;
        // 1er toque: despliega "Confirma la transacción"; 2do toque: procesa
        if (!ctx.flow.sheetOpen) { ctx.flow.sheetOpen = true; ctx.render(); return; }
        ctx.flow.receipt = { date: ui.now(), compra: ui.rand(10) };
        ctx.go('recargas-pasarela');
      },
    },
  });

  App.register('recargas-pasarela', {
    render: () => ui.pasarela('assets/icons/cat-recargas.svg'),
    mount: () => App.later(() => App.go('recargas-ok', {}, { replace: true }), 2200),
  });

  App.register('recargas-ok', {
    render({ flow }) {
      const op = App.data.operatorById(flow.operator)?.name || '';
      return `
      <div class="screen screen--gray">
        <div class="content content--center receipt">
          ${ui.logo()}
          <p class="receipt-title">¡Transacción exitosa!</p>
          <div class="receipt-rows">
            ${ui.rows([
              ['Operador', ui.esc(op)],
              ['Valor a recargar', ui.money(amountOf(flow))],
              ['Número de recargar', ui.esc(flow.phone)],
              ['Número de la compra', flow.receipt?.compra || ''],
              ['Fecha y hora', flow.receipt?.date || ''],
            ])}
          </div>
          <p class="fine">${ui.esc(op)} es el operador responsable de la prestación del servicio. El usuario/suscriptor acepta conocer el reglamento de usuario prepago, para más información www.${ui.esc(op.toLowerCase().replace(/\s|é/g, m => (m === 'é' ? 'e' : '')))}.co o llama en Bogotá al 4864710 o a 018000 486000</p>
          ${ui.processedBy()}
          ${ui.finishLink()}
        </div>
      </div>`;
    },
  });
})();
