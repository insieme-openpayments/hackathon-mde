/* Núcleo del prototipo: router, estado, delegación de eventos y componentes compartidos.
 * Cada pantalla se registra con App.register(nombre, { render(ctx), actions, mount(root, ctx) }).
 *  - render devuelve un string HTML (se pinta dentro del dispositivo de 320×568).
 *  - actions: mapa nombre → fn(ctx, el, event). Se dispara con data-action="nombre" (click)
 *    o data-input="nombre" (input/change en campos).
 *  - ctx = { params, flow, state, go, back, render, ui }
 */
(function () {
  const screens = {};
  const history = [];
  let current = null; // { name, params }
  const root = () => document.getElementById('app');

  const App = {
    state: { user: {} }, // datos globales (registro TyC)
    flow: {},            // estado del flujo activo; se reinicia al iniciar un flujo
    timers: [],

    register(name, def) { screens[name] = def; },

    /** Navega a una pantalla. opts.replace no apila historial; opts.resetFlow limpia App.flow */
    go(name, params = {}, opts = {}) {
      if (!screens[name]) { console.warn('Pantalla no registrada:', name); return; }
      if (opts.resetFlow) App.flow = {};
      if (current && !opts.replace) history.push(current);
      current = { name, params };
      App.clearTimers();
      App.render({ scrollTop: true });
      try { location.hash = name; } catch (e) { /* sin hash */ }
    },

    back() {
      const prev = history.pop();
      if (!prev) return App.go('home', {}, { replace: true });
      current = prev;
      App.clearTimers();
      App.render({ scrollTop: true });
      try { location.hash = prev.name; } catch (e) { /* sin hash */ }
    },

    /** Vuelve al inicio de un flujo (limpia historial) */
    reset(name, params = {}) {
      history.length = 0;
      current = null;
      App.go(name, params, { resetFlow: true });
    },

    ctx() {
      return {
        params: current ? current.params : {},
        flow: App.flow,
        state: App.state,
        go: App.go, back: App.back, render: App.render, ui: App.ui,
      };
    },

    /** Repinta la pantalla actual conservando foco/caret y scroll de contenedores */
    render(opts = {}) {
      const el = root();
      if (!current) return;
      const def = screens[current.name];
      const active = document.activeElement;
      const focusKey = active && el.contains(active) ? active.getAttribute('data-key') : null;
      const sel = focusKey && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
      const scrolls = {};
      if (!opts.scrollTop) el.querySelectorAll('[data-scroll]').forEach(s => { scrolls[s.dataset.scroll] = s.scrollTop; });

      el.innerHTML = def.render(App.ctx());
      el.dataset.screen = current.name;

      el.querySelectorAll('[data-scroll]').forEach(s => { if (scrolls[s.dataset.scroll] != null) s.scrollTop = scrolls[s.dataset.scroll]; });
      if (focusKey) {
        const f = el.querySelector(`[data-key="${focusKey}"]`);
        if (f) { f.focus(); if (sel && f.setSelectionRange) { try { f.setSelectionRange(sel[0], sel[1]); } catch (e) { /* tipo sin selección */ } } }
      }
      if (def.mount) def.mount(el, App.ctx());
    },

    /** Temporizadores que se cancelan al cambiar de pantalla */
    later(fn, ms) { const t = setTimeout(fn, ms); App.timers.push(t); return t; },
    clearTimers() { App.timers.forEach(clearTimeout); App.timers = []; },

    dispatch(kind, e) {
      if (!current) return;
      const attr = kind === 'click' ? 'data-action' : 'data-input';
      const target = e.target.closest(`[${attr}]`);
      if (!target || !root().contains(target)) return;
      if (target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') return;
      const name = target.getAttribute(attr);
      const def = screens[current.name];
      const fn = (def.actions && def.actions[name]) || App.globalActions[name];
      if (fn) {
        if (kind === 'click' && target.tagName === 'A') e.preventDefault();
        fn(App.ctx(), target, e);
      }
    },

    globalActions: {
      back: (ctx) => ctx.back(),
      home: () => App.reset('home'),
      toggleTip: (ctx, el) => {
        const tip = el.closest('.tip');
        const open = tip.classList.toggle('is-open');
        root().querySelectorAll('.tip.is-open').forEach(t => { if (t !== tip) t.classList.remove('is-open'); });
        if (open) App.later(() => tip.classList.remove('is-open'), 3500);
      },
      toggleSheet: (ctx) => { ctx.flow.sheetOpen = !ctx.flow.sheetOpen; ctx.render(); },
    },

    start() {
      document.addEventListener('click', e => App.dispatch('click', e));
      document.addEventListener('input', e => App.dispatch('input', e));
      document.addEventListener('change', e => { if (e.target.matches('select,input[type=checkbox],input[type=radio]')) App.dispatch('input', e); });
      document.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.matches('[data-action]:not(button):not(a)')) App.dispatch('click', e);
      });
      document.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => {
        const to = b.dataset.demo;
        App.reset(to === 'tyc' ? 'tyc' : to);
      }));
      window.addEventListener('resize', App.fit);
      App.fit();
      // Depuración: index.html?go=pantalla&flow={"json":1} abre cualquier pantalla con estado
      const qs = new URLSearchParams(location.search);
      if (qs.get('go') && screens[qs.get('go')]) {
        try { App.flow = JSON.parse(qs.get('flow') || '{}'); } catch (e) { App.flow = {}; }
        current = null;
        App.go(qs.get('go'));
        return;
      }
      const start = (location.hash || '').slice(1);
      App.reset(screens[start] && App.isEntry(start) ? start : 'home');
    },

    entries: ['tyc', 'home', 'recargas', 'paquetes', 'pines', 'servicios', 'facturas', 'efecty', 'breb'],
    isEntry(n) { return App.entries.includes(n); },

    /** Escala el dispositivo 320×568 para llenar la ventana */
    fit() {
      const wrap = document.getElementById('deviceWrap');
      const mobile = window.innerWidth <= 520;
      const availW = mobile ? window.innerWidth : window.innerWidth - 48;
      const availH = mobile ? window.innerHeight : window.innerHeight - 140;
      const s = Math.max(0.5, Math.min(availW / 320, availH / 568, mobile ? 4 : 1.6));
      wrap.style.setProperty('--scale', s);
      document.body.classList.toggle('is-mobile', mobile);
    },
  };

  /* ---------- Utilidades ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
  const num = (n) => Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const now = () => {
    const d = new Date();
    const p = (x) => String(x).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${d.getHours()}:${p(d.getMinutes())}`;
  };
  const today = () => now().split(' ')[0];
  const rand = (len) => Array.from({ length: len }, (_, i) => (i === 0 ? 1 + Math.floor(Math.random() * 9) : Math.floor(Math.random() * 10))).join('');
  const attrs = (o = {}) => Object.entries(o).filter(([, v]) => v !== false && v != null).map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`)).join(' ');

  /* ---------- Componentes compartidos (fieles al Figma) ---------- */
  const ui = {
    esc, money, num, digits, now, today, rand, attrs,

    /** Logo de marca "Insieme Payments" (Logo 2023:16231) */
    logo: () => `<div class="logo">Insieme Payments</div>`,

    /** "By puntored" (21:113) */
    byPuntored: () => `<div class="footer-brand"><span>By</span><img src="assets/img/puntored-logo.svg" alt="Insieme" width="60" height="15"></div>`,

    /** Botón (2020:4850). variant: disabled (azul #344061), active (lima), outline, solid */
    btn: (label, { variant = 'active', action, block = true, attr = {} } = {}) =>
      `<button type="button" class="btn btn--${variant}${block ? ' btn--block' : ''}" ${attrs({ 'data-action': action, ...attr })}>${esc(label)}</button>`,

    /** BackButton (2170:5880) */
    backBtn: (action = 'back') => `<button type="button" class="back-btn" data-action="${action}" aria-label="Volver"><img src="assets/icons/back-button.svg" alt="" width="36" height="36"><span>Volver</span></button>`,

    /** StepNúmero (2025:17727) + texto + tooltip opcional */
    stepTitle: (n, text, tip) => `<div class="step-title"><span class="step-num">${n}</span><span class="step-title__text">${esc(text)}</span>${tip ? ui.tip(tip) : ''}</div>`,

    /** Tooltip (190:15880): icono "!" que abre una burbuja */
    tip: (text, { open = false, icon = 'exclamation' } = {}) => `<span class="tip${open ? ' is-open' : ''}">
        <button type="button" class="tip__icon tip__icon--${icon}" data-action="toggleTip" aria-label="Más información">${icon === 'alert' ? '<img src="assets/icons/alert-circle.svg" alt="" width="18" height="18">' : '<img src="assets/icons/exclamation.svg" alt="" width="10" height="10">'}</button>
        <span class="tip__bubble" role="tooltip">${text}</span>
      </span>`,

    /** Ítem de lista con icono e input (Item-list 2018:4584) */
    field: ({ key, icon, placeholder, value = '', type = 'text', inputmode, action, maxlength, last = false, trailing = '', readonly = false }) =>
      `<label class="item-list${last ? ' item-list--last' : ''}">
        ${icon ? `<img class="item-list__icon" src="${icon}" alt="" width="16" height="16">` : ''}
        <input class="item-list__input" ${attrs({ 'data-key': key, 'data-input': action, type, inputmode, placeholder, maxlength, readonly })} value="${esc(value)}">
        ${trailing}
      </label>`,

    /** Filas label/valor (Confirma la transacción / comprobante) */
    rows: (rows) => rows.map(([k, v, cls]) => `<div class="kv${cls ? ' ' + cls : ''}"><span class="kv__k">${esc(k)}</span><span class="kv__v">${v}</span></div>`).join(''),

    /** Stepper superior de 2 pasos (Mi operador → Recargar/Paquetes) */
    stepper: (steps, activeIndex) => `<div class="stepper">${steps.map((s, i) => `
        ${i > 0 ? '<img class="stepper__line" src="assets/icons/step-line.svg" alt="" width="60" height="1">' : ''}
        <button type="button" class="stepper__step${i === activeIndex ? ' is-active' : ''}" ${s.action ? `data-action="${s.action}"` : 'tabindex="-1"'}>
          <span class="stepper__circle">${s.icon}</span>
          <span class="stepper__label">${esc(s.label)}</span>
        </button>`).join('')}</div>`,

    /** Icono compuesto "Operador" (2025:17559) */
    iconOperador: () => `<span class="ico-operador">
        <img class="ico-operador__a" src="assets/icons/step-operador-rect.svg" alt="">
        <img class="ico-operador__b" src="assets/icons/step-operador-rect.svg" alt="">
        <span class="ico-operador__c"><img src="assets/icons/step-operador-rect107.svg" alt=""></span>
      </span>`,

    /** Icono compuesto "Recargas" del stepper */
    iconRecargar: () => `<span class="ico-recargar">
        <img class="ico-recargar__a" src="assets/icons/step-phone.svg" alt="">
        <img class="ico-recargar__b" src="assets/icons/step-phone-badge.svg" alt="">
      </span>`,

    /**
     * Contenedor inferior (Container 2170:5988): "Ver/Ocultar detalles", resumen y botones.
     * opts: { open, title, rows, primary: {label, enabled, action}, back: action|false, extra }
     */
    sheet: ({ open = false, title = 'Confirma la transacción', rows = [], primary, back = 'back', extra = '', toggle = true }) => `
      <section class="sheet${open ? ' is-open' : ''}">
        ${toggle ? `<button type="button" class="sheet__toggle" data-action="toggleSheet">${open ? 'Ocultar detalles' : 'Ver detalles'}<img src="assets/icons/${open ? 'chevron-down-dark' : 'chevron-up'}.svg" alt="" width="16" height="16"></button>` : ''}
        ${open ? `<div class="sheet__body"><h3 class="sheet__title">${esc(title)}</h3><div class="kv-list">${ui.rows(rows)}</div></div>` : ''}
        ${extra}
        <div class="sheet__actions">
          ${back ? ui.backBtn(back) : ''}
          ${primary ? `<button type="button" class="btn ${primary.enabled ? 'btn--active' : 'btn--disabled'}${open || primary.block ? ' btn--grow' : ''}" data-action="${primary.action}" ${primary.enabled ? '' : 'aria-disabled="true"'}>${esc(primary.label)}</button>` : ''}
        </div>
      </section>`,

    /** Pantalla "Confirma el estado de tu transacción en el historial" (Pasarela) */
    pasarela: (icon, iconW = 33, iconH = 37) => `
      <div class="screen">
        <div class="content content--center">
          <div class="pasarela">
            <img src="${icon}" alt="" width="${iconW}" height="${iconH}">
            <p>Confirma el estado<br>de tu transacción en el historial</p>
            <div class="loader" aria-label="Procesando"></div>
          </div>
          <div class="footer">${ui.byPuntored()}</div>
        </div>
      </div>`,

    /** Bloque "Transacción procesada por: puntored" + soporte */
    processedBy: () => `
      <div class="processed"><strong>Transacción procesada por:</strong><img src="assets/img/puntored-logo-lg.svg" alt="Insieme" width="60" height="15"></div>
      <p class="fine">Si se requiere soporte o ampliar información contáctenos<br>a hola@oplat.co o al Whatsapp 3332822713</p>`,

    /** Botón final del comprobante para volver al inicio (no está en el Figma; necesario para la demo) */
    finishLink: () => `<button type="button" class="link-finish" data-action="home">Volver al inicio</button>`,
  };

  App.ui = ui;
  window.App = App;
})();
