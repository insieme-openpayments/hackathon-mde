/* Flujo Pines y entretenimiento:
 * Pines (2177:8860) → Categoría-select / Pin select (2177:9071, 2177:9637)
 * → Form-1 / Form-2 / Form-3 (2177:9732, 2177:9994, 2177:10080) → Pasarela (2177:10214) → Comprobante (2177:10177) */
(function () {
  const { ui } = App;
  const A = 'assets/pines/';

  /* Pestañas (Categories 2177:8853) con sus iconos (streaming 2177:8841, Juegos 2177:9013, Licencias 2177:9014) */
  const TABS = [
    { id: 'streaming', label: 'Streaming', icon: () => `<span class="pn-ico pn-ico--streaming"><img src="${A}tab-streaming.svg" alt="" width="13.254" height="13.254"></span>` },
    { id: 'juegos', label: 'Juegos', icon: () => `<span class="pn-ico pn-ico--juegos"><span class="pn-ico__mask"><img src="${A}tab-juegos.svg" alt="" width="13.998" height="7.698"></span></span>` },
    { id: 'licencias', label: 'Licencias', icon: () => `<span class="pn-ico"><img src="${A}tab-licencias.svg" alt="" width="14" height="14"></span>` },
  ];

  /* Catálogo. card: ajuste del logo en Produc_card; mini: ajuste dentro del círculo Proveedor (2177:9193) */
  const desc = (name, extra) => `Este producto ofrece acceso al catálogo de ${name}${extra}. El pin se activa ingresándolo en la app o en el sitio web oficial de ${name}.`;
  const PROVIDERS = [
    { id: 'netflix', name: 'Netflix', img: `${A}netflix.png`, mini: `${A}netflix-n.png`, card: 'cover', miniFit: 'netflix', products: [
      { name: 'Básico', price: 26900, desc: desc('Netflix', ' en 1 dispositivo a la vez, calidad HD y sin anuncios') },
      { name: 'Estándar', price: 38900, desc: desc('Netflix', ' en 2 dispositivos al mismo tiempo, calidad Full HD y descargas') },
      { name: 'Premium', price: 49900, desc: desc('Netflix', ' en 4 dispositivos al mismo tiempo, calidad 4K + HDR y audio espacial') },
    ] },
    { id: 'prime', name: 'Prime Video', img: `${A}prime-video.jpg`, card: 'prime', products: [
      { name: 'Mensual', price: 14900, desc: desc('Prime Video', ' durante 30 días, con películas, series y Amazon Originals') },
      { name: 'Trimestral', price: 42900, desc: desc('Prime Video', ' durante 90 días, con películas, series y Amazon Originals') },
    ] },
    { id: 'disney', name: 'Disney+', img: `${A}disney.png`, card: 'disney', products: [
      { name: 'Estándar', price: 29900, desc: desc('Disney+', ' con Disney, Pixar, Marvel, Star Wars y National Geographic en 2 dispositivos') },
      { name: 'Premium', price: 39900, desc: desc('Disney+', ' en 4 dispositivos al mismo tiempo, calidad 4K UHD y ESPN') },
    ] },
    { id: 'hbo', name: 'HBO', img: `${A}hbo.jpg`, card: 'hbo', products: [
      { name: 'Básico', price: 19900, desc: desc('HBO Max', ' con anuncios, en 2 dispositivos al mismo tiempo') },
      { name: 'Estándar', price: 29900, desc: desc('HBO Max', ' sin anuncios, en 2 dispositivos y 30 descargas') },
      { name: 'Platino', price: 39900, desc: desc('HBO Max', ' sin anuncios, en 4 dispositivos, calidad 4K y 100 descargas') },
    ] },
    { id: 'paramount', name: 'Paramount+', img: `${A}paramount.png`, card: 'paramount', products: [
      { name: 'Mensual', price: 19900, desc: desc('Paramount+', ' durante 30 días, en 3 dispositivos al mismo tiempo') },
      { name: 'Anual', price: 199900, desc: desc('Paramount+', ' durante 12 meses, en 3 dispositivos al mismo tiempo') },
    ] },
    { id: 'spotify', name: 'Spotify', img: `${A}spotify.png`, card: 'spotify', products: [
      { name: 'Individual', price: 16900, desc: desc('Spotify Premium', ' para 1 cuenta, música sin anuncios y descargas') },
      { name: 'Duo', price: 22900, desc: desc('Spotify Premium', ' para 2 cuentas que viven en el mismo hogar') },
      { name: 'Familiar', price: 27900, desc: desc('Spotify Premium', ' para hasta 6 cuentas que viven en el mismo hogar') },
    ] },
    { id: 'win', name: 'Win Sports', img: `${A}win-sports.png`, card: 'win', products: [
      { name: 'Mensual', price: 39900, desc: desc('Win+', ' con todos los partidos de la Liga colombiana en vivo durante 30 días') },
      { name: 'Anual', price: 399900, desc: desc('Win+', ' con todos los partidos de la Liga colombiana en vivo durante 12 meses') },
    ] },
    { id: 'noggin', name: 'Noggin', img: `${A}noggin.png`, card: 'noggin', products: [
      { name: 'Mensual', price: 9900, desc: desc('Noggin', ' con juegos y videos educativos para niños durante 30 días') },
      { name: 'Anual', price: 89900, desc: desc('Noggin', ' con juegos y videos educativos para niños durante 12 meses') },
    ] },
    { id: 'crunchyroll', name: 'Crunchyroll', img: `${A}crunchyroll.jpg`, card: 'crunchy', miniFit: 'crunchy', products: [
      { name: 'Fan', price: 13900, desc: 'Este producto ofrece acceso ilimitado al catálogo de Crunchyroll, sin publicidad, nuevos episodios una hora luego de Japón, disponible en 1 dispositivo a la vez' },
      { name: 'Mega Fan', price: 17900, desc: 'Este producto ofrece acceso ilimitado al catálogo de Crunchyroll, sin publicidad, nuevos episodios una hora luego de Japón, disponible en 4 dispositivos al mismo tiempo, visionado Sin Conexión' },
      { name: 'Ultimate Fan', price: 23900, desc: 'Este producto ofrece acceso ilimitado al catálogo de Crunchyroll, sin publicidad, disponible en 6 dispositivos al mismo tiempo, visionado Sin Conexión y envío gratis en la tienda' },
    ] },
  ];
  const provById = (id) => PROVIDERS.find(p => p.id === id) || PROVIDERS[PROVIDERS.length - 1];
  const tabOf = (flow) => TABS.find(t => t.id === flow.tab) || TABS[0];
  const productOf = (flow) => provById(flow.provider).products[flow.product];
  const phoneOk = (flow) => /^3\d{9}$/.test(flow.phone || '');

  /* Logo del proveedor dentro de un círculo (Proveedor 2177:9193 / Proveedor/Variant3 2177:9710) */
  const mini = (p, cls = '') => {
    const fit = p.miniFit || p.card;
    return `<span class="pn-mini${cls}"><span class="pn-mini__box pn-fit--${fit}"><img src="${p.mini || p.img}" alt=""></span></span>`;
  };

  /* ---------- 1. Pines: pestañas + grilla de proveedores ---------- */
  App.register('pines', {
    render({ flow }) {
      const tab = tabOf(flow);
      const grid = tab.id === 'streaming'
        ? `<div class="op-grid pn-grid">
            ${PROVIDERS.map(p => `
              <button type="button" class="op-card pn-card${p.id === flow.provider ? ' is-selected' : ''}" data-action="pickProvider" data-id="${p.id}" aria-label="${ui.esc(p.name)}">
                <span class="pn-card__img pn-fit--${p.card}"><img src="${p.img}" alt="${ui.esc(p.name)}"></span>
              </button>`).join('')}
          </div>`
        : `<div class="pn-empty">
            <span class="pn-empty__icon">${tab.icon()}</span>
            <p class="pn-empty__title">Pronto tendremos pines de ${tab.label.toLowerCase()}</p>
            <p class="pn-empty__text">Por ahora puedes comprar pines de streaming de nuestros proveedores disponibles.</p>
            <button type="button" class="pn-empty__link" data-action="pickTab" data-id="streaming">Ver proveedores de Streaming</button>
          </div>`;
      return `
      <div class="screen">
        <div class="content">
          ${ui.logo()}
          <div class="pn-tabs" role="tablist">
            ${TABS.map(t => `
              <button type="button" role="tab" aria-selected="${t.id === tab.id}" class="pn-tab${t.id === tab.id ? ' is-active' : ''}" data-action="pickTab" data-id="${t.id}">
                ${t.icon()}<span>${t.label}</span>
              </button>`).join('')}
          </div>
          ${tab.id === 'streaming' ? '<p class="pn-hint">Selecciona el producto de tu preferencia</p>' : ''}
          ${grid}
          <div class="bottom">
            ${ui.btn('Volver', { variant: 'dark', action: 'home' })}
            <div class="footer">${ui.byPuntored()}</div>
          </div>
        </div>
      </div>`;
    },
    actions: {
      pickTab: (ctx, el) => { ctx.flow.tab = el.dataset.id; ctx.render(); },
      pickProvider: (ctx, el) => {
        ctx.flow.provider = el.dataset.id;
        ctx.flow.product = null;
        ctx.render();
        App.later(() => ctx.go('pines-producto'), 180);
      },
    },
  });

  /* ---------- 2. Categoría-select / Pin select: carrusel + productos ---------- */
  const shift = (ctx, d) => {
    const i = PROVIDERS.findIndex(p => p.id === provById(ctx.flow.provider).id);
    ctx.flow.provider = PROVIDERS[(i + d + PROVIDERS.length) % PROVIDERS.length].id;
    ctx.flow.product = null;
    ctx.flow.sheetOpen = false;
    ctx.render();
  };

  App.register('pines-producto', {
    render({ flow }) {
      const p = provById(flow.provider);
      const i = PROVIDERS.indexOf(p);
      const n = PROVIDERS.length;
      // Ventana de 4 proveedores: anterior, seleccionado, siguiente y uno más (como en Slider pines 2177:9259)
      const win = [-1, 0, 1, 2].map(d => PROVIDERS[(i + d + n) % n]);
      const ready = flow.product != null && !!productOf(flow);
      return `
      <div class="screen">
        <div class="content">
          ${ui.logo()}
          <div class="pn-slider">
            <button type="button" class="pn-slider__arrow" data-action="prevProvider" aria-label="Proveedor anterior"><img src="${A}chevron-left.svg" alt="" width="32" height="32"></button>
            <div class="pn-slider__track">
              ${win.map(q => `<button type="button" class="pn-slider__item" data-action="pickProvider" data-id="${q.id}" aria-label="${ui.esc(q.name)}"${q === p ? ' aria-current="true"' : ''}>${mini(q, q === p ? ' is-selected' : '')}</button>`).join('')}
            </div>
            <button type="button" class="pn-slider__arrow pn-slider__arrow--next" data-action="nextProvider" aria-label="Proveedor siguiente"><img src="${A}chevron-up-m.svg" alt="" width="32" height="32"></button>
          </div>
          <div class="pn-head">
            <p class="pn-head__title">${ui.esc(p.name)} - Streaming</p>
            <p class="pn-head__sub">Selecciona el producto de tu preferencia</p>
          </div>
          <div class="pn-list">
            ${p.products.map((pr, k) => `
              <button type="button" class="pn-pin${flow.product === k ? ' is-selected' : ''}" data-action="pickProduct" data-k="${k}" aria-pressed="${flow.product === k}">
                <span class="pn-pin__name">${ui.esc(pr.name)}</span>
                <span class="pn-pin__price">${ui.money(pr.price)}</span>
              </button>`).join('')}
          </div>
          <div class="bottom">
            <div class="sheet__actions">
              ${ui.backBtn()}
              <button type="button" class="btn btn--grow ${ready ? 'btn--active' : 'btn--disabled'}" data-action="continue" ${ready ? '' : 'aria-disabled="true"'}>Continuar</button>
            </div>
            <div class="footer">${ui.byPuntored()}</div>
          </div>
        </div>
      </div>`;
    },
    actions: {
      prevProvider: (ctx) => shift(ctx, -1),
      nextProvider: (ctx) => shift(ctx, 1),
      pickProvider: (ctx, el) => {
        if (ctx.flow.provider === el.dataset.id) return;
        ctx.flow.provider = el.dataset.id; ctx.flow.product = null; ctx.render();
      },
      pickProduct: (ctx, el) => { ctx.flow.product = Number(el.dataset.k); ctx.render(); },
      continue: (ctx) => {
        if (ctx.flow.product == null) return;
        ctx.flow.sheetOpen = false;
        ctx.go('pines-form');
      },
    },
  });

  /* ---------- 3. Form-1/2/3: detalle del pin + número celular ---------- */
  const pinName = (flow) => `${provById(flow.provider).name} ${productOf(flow)?.name || ''}`;
  const summary = (flow) => [
    ['Categoría', 'Streaming'],
    ['Pin virtual', ui.esc(pinName(flow))],
    ['Valor', ui.money(productOf(flow)?.price)],
    ['Número de teléfono', ui.esc(flow.phone || '—')],
  ];

  App.register('pines-form', {
    render({ flow }) {
      const p = provById(flow.provider);
      const pr = productOf(flow) || p.products[0];
      const ready = phoneOk(flow);
      const phoneErr = flow.phone && flow.phone.length === 10 && !ready;
      return `
      <div class="screen pn-screen">
        <div class="content content--sheet" data-scroll="main">
          ${ui.logo()}
          <div class="pn-desc">
            <div class="pn-desc__card">
              <div class="pn-desc__head">
                <p>${ui.esc(pr.name)}</p>
                <p>${ui.money(pr.price)}</p>
              </div>
              <div class="pn-desc__text">
                <p>Descripción del pin:</p>
                <p>${ui.esc(pr.desc)}</p>
                <p>Condiciones y Restricciones:<br>Consulta los términos y condiciones<br>en <a href="#" data-action="noop">www.posa.com.co/terminos</a></p>
              </div>
            </div>
            ${mini(p, ' pn-mini--lg')}
          </div>
          <label class="pn-input${phoneErr ? ' is-error' : ''}">
            <span class="pn-input__icon"><img src="assets/icons/field-phone.svg" alt="" width="16" height="18"></span>
            <input data-key="phone" data-input="setPhone" type="text" inputmode="numeric" maxlength="10" placeholder="Ingresa el número celular" value="${ui.esc(flow.phone || '')}">
            <span class="pn-input__label">Número celular</span>
          </label>
          ${phoneErr ? '<p class="err pn-err">Ingresa un celular válido (10 dígitos, inicia en 3)</p>' : ''}
          <div class="footer">${ui.byPuntored()}</div>
        </div>
        ${ui.sheet({
          open: !!flow.sheetOpen,
          rows: summary(flow),
          primary: { label: 'Confirmar', enabled: ready, action: 'confirm' },
        })}
      </div>`;
    },
    actions: {
      noop: () => {},
      setPhone: (ctx, el) => { ctx.flow.phone = ui.digits(el.value).slice(0, 10); ctx.render(); },
      confirm: (ctx) => {
        if (!phoneOk(ctx.flow)) return;
        // 1er toque: despliega "Confirma la transacción"; 2do toque: procesa
        if (!ctx.flow.sheetOpen) { ctx.flow.sheetOpen = true; ctx.render(); return; }
        ctx.flow.receipt = { date: ui.today(), id: ui.rand(14) };
        ctx.go('pines-pasarela');
      },
    },
  });

  /* ---------- 4. Pasarela (2177:10214) ---------- */
  App.register('pines-pasarela', {
    render: () => ui.pasarela(`${A}pines.svg`, 33.156, 55.26),
    mount: () => App.later(() => App.go('pines-ok', {}, { replace: true }), 2200),
  });

  /* ---------- 5. Comprobante (2177:10177) ---------- */
  App.register('pines-ok', {
    render({ flow }) {
      const price = productOf(flow)?.price;
      return `
      <div class="screen screen--gray pn-screen">
        <div class="content content--center receipt pn-receipt" data-scroll="receipt">
          ${ui.logo()}
          <p class="receipt-title">¡Transacción exitosa!</p>
          <div class="receipt-rows">
            ${ui.rows([
              ['Fecha transacción', flow.receipt?.date || ui.today()],
              ['Estado', 'Aprobada', 'pn-ok'],
              ['Pin virtual', ui.esc(pinName(flow))],
              ['Valor', ui.money(price)],
              ['Número de celular', ui.esc(flow.phone || '')],
              ['ID transacción', flow.receipt?.id || ''],
              ['Total', ui.money(price)],
            ])}
          </div>
          ${ui.processedBy()}
          ${ui.finishLink()}
        </div>
      </div>`;
    },
  });
})();
