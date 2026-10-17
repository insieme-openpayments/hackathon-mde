/* Flujo Pago de servicios (fuente principal: fila 2402/2403; estados extra de la fila 2177)
 *  servicios            → Pago servicios (2402:21462) + búsqueda en vivo (2402:24811 / 2177:20526)
 *  servicios-empresas   → Categoría seleccionada + "Ordenar por" A-Z/Z-A (2403:25321, 2402:21524, 2402:25089)
 *  servicios-form       → Form-1 Referencia (2402:21602, 2402:21624, 2177:20716, 2177:27495)
 *                         Form-2 Valor/Correo + "Confirma la transacción" (2402:21646, 2402:21690, 2177:27585, 2177:27906)
 *  servicios-pasarela   → Pasarela (2402:21778)
 *  servicios-ok         → Comprobante (2402:21731)
 *
 * Reuso desde "Facturas guardadas":
 *   App.flow = { company: '<id de empresa>', ref1: '<referencia>', amount?: 12345, autoConsult?: true };
 *   App.go('servicios-form');
 *   - Con autoConsult:true la pantalla simula la consulta y abre directo el paso de Valor/Correo.
 *   - Sin autoConsult abre la Referencia precargada con "Consultar" activo.
 */
(function () {
  const { ui } = App;
  const A = 'assets/servicios/';

  /* ---------- Catálogo ---------- */
  const categories = [
    { id: 'agua', label: 'Agua', icon: A + 'cat-agua.svg', w: 27, h: 27 },
    { id: 'energia', label: 'Energía', icon: A + 'cat-energia.svg', w: 27, h: 27.4 },
    { id: 'gas', label: 'Gas', icon: A + 'cat-gas.svg', w: 23.438, h: 27, head: A + 'head-gas.svg' },
    { id: 'telefonia', label: 'Telefonía celular-Internet -tv', icon: A + 'cat-telefonia.svg', w: 27, h: 27 },
    { id: 'salud', label: 'Salud y seguridad social', icon: A + 'cat-salud.svg', w: 27, h: 27 },
    { id: 'catalogo', label: 'Ventas por catálogo', icon: A + 'cat-catalogo.svg', w: 27, h: 27 },
    { id: 'financieras', label: 'Pagos obligaciones financieras', icon: A + 'cat-financieras.svg', w: 27, h: 27 },
    { id: 'impuestos', label: 'Impuestos', icon: A + 'cat-impuestos.svg', w: 27, h: 27 },
    { id: 'educacion', label: 'Educación', icon: A + 'cat-educacion.svg', w: 27, h: 27 },
    { id: 'administracion', label: 'Pago administración conjuntos', icon: A + 'cat-administracion.svg', w: 27, h: 27 },
    { id: 'movilidad', label: 'Movilidad y transporte', icon: A + 'cat-movilidad.svg', w: 27, h: 27 },
    { id: 'otros', label: 'Otros', icon: A + 'cat-otros.svg', w: 27, h: 27 },
  ];

  /* logo: ruta o null (→ icono genérico receipt-2 del diseño). fit: recorte del logo según Figma.
   * partial: la factura permite pagos parciales. amount: valor fijo de la factura (si no, se deriva de la referencia). */
  const L = {
    afinia: [A + 'logo-afinia.png', 'cover'], cabify: [A + 'logo-cabify.png', 'cover'], icetex: [A + 'logo-icetex.png', 'icetex'],
    claro: [A + 'logo-claro.png', 'contain'], olivos: [A + 'logo-olivos.png', 'cover'], ricas: [A + 'logo-superricas.png', 'ricas'],
    compensar: [A + 'logo-compensar.png', 'cover'], vanti: [A + 'logo-vanti.png', 'vanti'], gasnatural: [A + 'logo-gasnatural.png', 'gasnatural'],
    movistar: ['assets/img/op-movistar.svg', 'contain'], etb: ['assets/img/op-etb.png', 'contain'],
  };
  const co = (id, name, category, logoKey, extra = {}) => ({
    id, name, category, logo: logoKey ? L[logoKey][0] : null, fit: logoKey ? L[logoKey][1] : 'generic', partial: false, ...extra,
  });
  const companies = [
    co('acueducto-bogota', 'Acueducto de Bogotá EAAB', 'agua', null),
    co('aguas-cartagena', 'Aguas de Cartagena', 'agua', null),
    co('epm-agua', 'EPM Aguas Medellín', 'agua', null, { partial: true }),
    co('aguas-kpital', 'Aguas Kpital Cúcuta', 'agua', null),
    co('afinia', 'Afinia', 'energia', 'afinia', { partial: true }),
    co('enel', 'Enel Colombia', 'energia', null),
    co('air-e', 'Air-e', 'energia', null),
    co('celsia', 'Celsia', 'energia', null),
    co('gas-natural', 'Gas Natural', 'gas', 'gasnatural'),
    co('gases-occidente', 'Gases de occidente', 'gas', 'vanti'),
    co('gas-natural-cundi', 'Gas natural cundiboyacense', 'gas', 'gasnatural', { partial: true, amount: 10000 }),
    co('vanti', 'Vanti S.A. ESP', 'gas', 'vanti', { partial: true }),
    co('efigas', 'Efigas', 'gas', null),
    co('claro-hogar', 'Claro soluciones Hogar - Pago Parcial', 'telefonia', 'claro', { partial: true }),
    co('claro-movil', 'Claro Móvil Postpago', 'telefonia', 'claro'),
    co('movistar-hogar', 'Movistar Hogar', 'telefonia', 'movistar'),
    co('etb', 'ETB Internet y TV', 'telefonia', 'etb'),
    co('compensar', 'Compensar medicina prepagada', 'salud', 'compensar'),
    co('los-olivos', 'Los olivos', 'salud', 'olivos', { partial: true }),
    co('colsanitas', 'Colsanitas', 'salud', null),
    co('superricas', 'Comestibles Ricos-superricas distribuidor', 'catalogo', 'ricas', { partial: true }),
    co('yanbal', 'Yanbal Colombia', 'catalogo', null, { partial: true }),
    co('natura', 'Natura Cosméticos', 'catalogo', null),
    co('banco-contactar', 'Banco Contactar', 'financieras', null, { partial: true }),
    co('bancamia', 'Bancamía', 'financieras', null, { partial: true }),
    co('crediservir', 'Crediservir', 'financieras', null),
    co('predial-bogota', 'Impuesto predial Bogotá', 'impuestos', null),
    co('vehicular-cundinamarca', 'Impuesto vehicular Cundinamarca', 'impuestos', null),
    co('icetex', 'Cartera ICETEX', 'educacion', 'icetex', { partial: true }),
    co('unal', 'Universidad Nacional de Colombia', 'educacion', null),
    co('conjunto-pinos', 'Conjunto residencial Los Pinos', 'administracion', null, { partial: true }),
    co('torres-parque', 'Edificio Torres del Parque', 'administracion', null),
    co('cabify', 'Cabify Transportes SAS', 'movilidad', 'cabify'),
    co('flypass', 'Flypass peajes', 'movilidad', null, { partial: true }),
    co('ceal', 'Ceal servicios SAS f/tativa', 'otros', null),
    co('fundacion-cardioinfantil', 'Fundación Cardioinfantil donaciones', 'otros', null, { partial: true }),
  ];

  const catById = (id) => categories.find(c => c.id === id);
  const companyById = (id) => companies.find(c => c.id === (id && id.id ? id.id : id));
  /** Valor verosímil de la factura según empresa + referencia (determinístico) */
  const billFor = (companyId, ref) => {
    const c = companyById(companyId);
    if (c && c.amount) return c.amount;
    const s = String(companyId) + String(ref || '');
    let h = 7;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100003;
    return 18000 + (h % 260) * 900; // $18.000 – $251.100, múltiplos de $100
  };

  App.data = App.data || {};
  App.data.servicios = { categories, companies, companyById, categoryById: catById, billFor };

  /* ---------- Helpers de vista ---------- */
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const sortBy = (list, dir) => list.slice().sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }) * (dir === 'za' ? -1 : 1));
  const search = (q, list = companies) => { const n = norm(q); return n ? list.filter(c => norm(c.name).includes(n)) : list; };
  const vline = (h = 20) => `<span class="sv-vline" style="height:${h}px"><img src="${A}divider${h === 30 ? '-30' : ''}.svg" alt="" width="${h}" height="1"></span>`;

  /** Logo de empresa en la fila de lista (40×16) */
  const logo = (c) => c.logo
    ? `<span class="sv-logo sv-logo--${c.fit}"><span class="sv-logo__box"><span class="sv-logo__in"><img src="${c.logo}" alt=""></span></span></span>`
    : `<span class="sv-logo sv-logo--generic"><img src="${A}receipt.svg" alt="" width="16" height="16"></span>`;

  const catIcon = (cat, { head = false } = {}) => `<span class="sv-cat-ico"><img src="${head && cat.head ? cat.head : cat.icon}" alt="" width="${cat.w}" height="${cat.h}"></span>`;

  /** Card servicios (categoría) */
  const catCard = (cat, { action = 'pickCat', plain = false } = {}) => `
    <button type="button" class="sv-cat${plain ? ' sv-cat--plain' : ''}" ${action ? `data-action="${action}" data-id="${cat.id}"` : 'tabindex="-1"'}>
      ${catIcon(cat)}${vline(20)}<span class="sv-cat__label">${ui.esc(cat.label)}</span>
    </button>`;

  const searchBox = (key, value) => `
    <label class="sv-search">
      <img src="${A}search.svg" alt="" width="20.489" height="20.488">
      <input class="sv-search__input" type="search" data-key="${key}" data-input="setQuery" placeholder="Busca por empresa o convenio" value="${ui.esc(value || '')}" autocomplete="off" aria-label="Busca por empresa o convenio">
    </label>`;

  const companyList = (list) => `
    <div class="sv-list" data-scroll="list" role="listbox">
      ${list.length ? list.map(c => `
        <button type="button" class="sv-row" data-action="pickCompany" data-id="${c.id}" role="option">
          ${logo(c)}<span class="sv-row__name">${ui.esc(c.name)}</span>
        </button>`).join('') : '<div class="sv-row sv-row--empty"><span class="sv-row__name">No encontramos empresas o convenios con ese nombre</span></div>'}
    </div>`;

  /** Ajusta el alto de la lista flotante hasta el borde inferior de la columna */
  const fitList = (root) => {
    const list = root.querySelector('.sv-list');
    const content = root.querySelector('.sv-scroll');
    if (!list || !content) return;
    const top = list.getBoundingClientRect().top - content.getBoundingClientRect().top;
    list.style.maxHeight = Math.max(120, content.clientHeight - top) + 'px';
  };

  const pickCompany = (ctx, el) => {
    const c = companyById(el.dataset.id);
    if (!c) return;
    const keep = { q: ctx.flow.q, cq: ctx.flow.cq, sort: ctx.flow.sort };
    App.flow = { ...keep, category: c.category, company: c.id };
    ctx.go('servicios-form');
  };

  const setQuery = (ctx, el) => { ctx.flow[el.dataset.key] = el.value; ctx.render(); };

  /* ---------- Pago servicios (inicio + búsqueda) ---------- */
  App.register('servicios', {
    render({ flow }) {
      const q = flow.q || '';
      const results = q.trim() ? sortBy(search(q), 'az') : null;
      return `
      <div class="screen">
        <div class="content sv-scroll" data-scroll="main">
          ${ui.logo()}
          <div class="sv-facturas">
            <p class="sv-facturas__title">Ponte al día con tus pagos pendientes, de manera rápida y segura</p>
            <p class="sv-facturas__sub">Visualiza y guarda tus facturas para próximos pagos</p>
            <div class="sv-facturas__row">
              <button type="button" class="sv-facturas__saved" data-action="toFacturas">
                <img src="${A}facturas-doc.svg" alt="" width="16.279" height="19.899"><span>Facturas guardadas</span>
              </button>
              <button type="button" class="sv-facturas__add" data-action="toFacturasAdd">+ Facturas</button>
            </div>
          </div>
          <p class="sv-text">Busca por empresa o selecciona la categoría del pago a realizar</p>
          <div class="sv-search-wrap">
            ${searchBox('q', q)}
            ${results ? companyList(results) : ''}
          </div>
          <div class="sv-grid">${categories.map(c => catCard(c)).join('')}</div>
          <div class="bottom sv-bottom">
            ${ui.btn('Volver', { variant: 'dark', action: 'home' })}
            <div class="footer">${ui.byPuntored()}</div>
          </div>
        </div>
      </div>`;
    },
    mount: (root) => fitList(root),
    actions: {
      setQuery,
      pickCompany,
      pickCat: (ctx, el) => { ctx.flow.category = el.dataset.id; ctx.flow.cq = ''; ctx.flow.sortOpen = false; ctx.go('servicios-empresas'); },
      toFacturas: () => App.go('facturas', {}, { resetFlow: true }),
      toFacturasAdd: () => App.go('facturas', { add: true }, { resetFlow: true }),
    },
  });

  /* ---------- Categoría seleccionada: lista de empresas + Ordenar por ---------- */
  const SORT = { az: 'Ordenar por A-Z', za: 'Ordenar por Z-A' };
  App.register('servicios-empresas', {
    render({ flow }) {
      const cat = catById(flow.category) || categories[2];
      const sort = flow.sort || 'az';
      const list = sortBy(search(flow.cq, companies.filter(c => c.category === cat.id)), sort);
      return `
      <div class="screen">
        <div class="content sv-scroll" data-scroll="main">
          ${ui.logo()}
          ${catCard(cat, { action: null, plain: true })}
          <div class="sv-filter">
            <p class="sv-filter__text">Selecciona o filtra la opción de empresa por el pago</p>
            <div class="sv-filter__row">
              <span class="sv-filter__label">Ordenar por:</span>
              <div class="sv-sort${flow.sortOpen ? ' is-open' : ''}">
                <button type="button" class="sv-sort__btn" data-action="toggleSort" aria-expanded="${!!flow.sortOpen}">
                  <span>${SORT[sort]}</span><img src="assets/icons/chevron-down.svg" alt="" width="16" height="16">
                </button>
                ${flow.sortOpen ? `<div class="sv-sort__menu" role="listbox">
                  ${Object.keys(SORT).map(k => `<button type="button" class="sv-sort__opt${k === sort ? ' is-selected' : ''}" data-action="setSort" data-v="${k}" role="option">${SORT[k]}</button>`).join('')}
                </div>` : ''}
              </div>
            </div>
          </div>
          <div class="sv-search-wrap">
            ${searchBox('cq', flow.cq)}
            ${companyList(list)}
          </div>
          <div class="sv-grid">${categories.map(c => catCard(c)).join('')}</div>
          <div class="bottom sv-bottom">
            ${ui.btn('Volver', { variant: 'dark', action: 'back' })}
            <div class="footer">${ui.byPuntored()}</div>
          </div>
        </div>
      </div>`;
    },
    mount: (root) => fitList(root),
    actions: {
      setQuery,
      pickCompany,
      toggleSort: (ctx) => { ctx.flow.sortOpen = !ctx.flow.sortOpen; ctx.render(); },
      setSort: (ctx, el) => { ctx.flow.sort = el.dataset.v; ctx.flow.sortOpen = false; ctx.render(); },
      pickCat: (ctx, el) => { ctx.flow.category = el.dataset.id; ctx.flow.cq = ''; ctx.flow.sortOpen = false; ctx.render({ scrollTop: true }); },
    },
  });

  /* ---------- Formulario: Referencia → Valor / Correo → Confirmación ---------- */
  const REF_MIN = 6, REF_MAX = 20, MIN_PAY = 1000;
  const refOk = (f) => { const d = ui.digits(f.ref1); return d.length >= REF_MIN && d.length <= REF_MAX; };
  const amountOf = (f) => Number(ui.digits(f.amountText));
  const amountOk = (f) => amountOf(f) >= MIN_PAY && amountOf(f) <= (f.bill || 0);
  const mailOk = (f) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email || '');
  const step2Ok = (f) => amountOk(f); // correo oculto (.sv-mail): no se exige
  const maskDoc = (d) => { d = ui.digits(d); return d ? (d.length > 4 ? d.slice(0, -4) + '****' : d) : '10265988****'; };

  /** Bloque "Banco procesador": colapsado (procesado / corresponsal / entidad) o abierto (gris) */
  const bank = (open, { center = false } = {}) => open ? `
    <div class="sv-bank sv-bank--open">
      <div class="sv-bank__head">
        <strong>Entidad financiera responsable:</strong>
        <span class="sv-scotia"><span class="sv-scotia__box"><img src="${A}banco-scotia-colpatria.png" alt="Scotiabank Colpatria"></span></span>
        <button type="button" class="sv-union" data-action="toggleBank" aria-label="Ocultar entidad"><img src="${A}union-minus.svg" alt="" width="7.94" height="7.977"></button>
      </div>
      <p class="sv-bank__fine">Línea de atención personalizada en Bogotá: 3487881 Resto del país: 01 8000 960 505</p>
    </div>` : `
    <div class="sv-bank${center ? ' sv-bank--center' : ''}">
      <div class="sv-bank__row">
        <div class="sv-bank__col">
          <strong>Transacción procesada por:</strong>
          <img src="assets/img/puntored-logo-lg.svg" alt="Insieme" width="60" height="15">
        </div>
        <span class="sv-bank__corr">Corresponsal de:</span>
        <div class="sv-bank__col">
          <strong>Entidad financiera responsable</strong>
          <div class="sv-bank__ent">
            <span class="sv-colpatria"><span class="sv-colpatria__box"><img src="${A}colpatria.png" alt="Scotiabank Colpatria"></span></span>
            <button type="button" class="sv-union" data-action="toggleBank" aria-label="Ver entidad"><img src="${A}union.svg" alt="" width="7.94" height="7.977"></button>
          </div>
        </div>
      </div>
      <p class="sv-bank__fine">Si se requiere soporte o ampliar información contáctenos a hola@oplat.co o al 3332822713</p>
    </div>`;

  /** Input-v2 con etiqueta flotante */
  const input2 = ({ label, key, value = '', placeholder = '', action, inputmode, maxlength, readonly, dim, error, leading = '', trailing = '', extra = '', type = 'text' }) => `
    <div class="sv-input${dim ? ' is-dim' : ''}${error ? ' is-error' : ''}">
      <label class="sv-input__box">
        ${leading}
        <input class="sv-input__field" ${ui.attrs({ 'data-key': key, 'data-input': action, type, inputmode, placeholder, maxlength, readonly })} value="${ui.esc(value)}">
        ${trailing}
      </label>
      <span class="sv-input__label">${ui.esc(label)}</span>
      ${extra}
    </div>`;

  const startConsult = (ctx) => {
    const f = ctx.flow;
    f.loading = true;
    ctx.render();
    App.later(() => {
      f.loading = false;
      if (/^0+$/.test(ui.digits(f.ref1))) { f.refError = 'No encontramos una factura pendiente con esta referencia'; ctx.render(); return; }
      f.bill = Number(f.amount) || billFor(f.company, ui.digits(f.ref1));
      f.amountText = ui.num(f.bill);
      if (f.email == null) f.email = (App.state.user && App.state.user.correo) || '';
      f.editMail = !mailOk(f);
      f.step = 2;
      f.tipOpen = !!(companyById(f.company) || {}).partial;
      f.sheetOpen = false;
      ctx.render({ scrollTop: true });
      if (f.tipOpen) App.later(() => { f.tipOpen = false; App.render(); }, 3500);
    }, 1100);
  };

  App.register('servicios-form', {
    render({ flow, state }) {
      const c = companyById(flow.company) || companyById('gas-natural-cundi');
      if (!flow.company) flow.company = c.id;
      const cat = catById(flow.category) || catById(c.category);
      const step = flow.step === 2 ? 2 : 1;
      const head = `
        <div class="sv-head">
          <span class="sv-head__ico">${catIcon(cat, { head: true })}</span>
          ${vline(30)}
          <div class="sv-head__txt"><p class="sv-head__cat">${ui.esc(cat.label)}</p><p class="sv-head__co">${ui.esc(c.name)}</p></div>
        </div>
        <p class="sv-text">Ingresa los siguientes datos</p>`;
      const ref = input2({
        label: 'Referencia de pago 1', key: 'ref1', value: flow.ref1 || '', placeholder: 'Referencia de pago', action: 'setRef',
        inputmode: 'numeric', maxlength: REF_MAX, readonly: step === 2, dim: step === 2, error: !!flow.refError,
      });

      if (step === 1) {
        const ok = refOk(flow) && !flow.loading;
        return `
        <div class="screen">
          <div class="content sv-form">
            ${ui.logo()}
            ${head}
            <div class="sv-fields">
              ${ref}
              ${flow.refError ? `<p class="err">${ui.esc(flow.refError)}</p>` : ''}
            </div>
            ${bank(!!flow.bankOpen)}
            <div class="sheet__actions sv-actions">
              ${ui.backBtn()}
              <button type="button" class="btn ${ok ? 'btn--active' : 'btn--disabled'} btn--grow${flow.loading ? ' sv-loading' : ''}" data-action="consult" ${ok ? '' : 'aria-disabled="true"'}>${flow.loading ? '<span class="sv-spin"></span>Consultando…' : 'Consultar'}</button>
            </div>
          </div>
        </div>`;
      }

      const partial = !!c.partial;
      const amtErr = flow.amountText !== undefined && !amountOk(flow);
      const mailErr = !!flow.email && !mailOk(flow) && !flow.editMail;
      const tip = partial ? `
        <span class="sv-tip${flow.tipOpen ? ' is-open' : ''}">
          <button type="button" class="sv-tip__icon" data-action="toggleTip2" aria-label="Información del valor"><img src="${A}alert-circle.svg" alt="" width="14" height="14"></button>
          <span class="sv-tip__bubble" role="tooltip">Tu factura permite<br>pagos parciales</span>
        </span>` : '';
      return `
      <div class="screen">
        <div class="content content--sheet sv-form sv-form--2" data-scroll="main">
          ${ui.logo()}
          ${head}
          <div class="sv-fields">
            ${ref}
            ${input2({
              label: 'Valor', key: 'amount', value: '$ ' + (flow.amountText || ''), action: 'setAmount', inputmode: 'numeric', maxlength: 12,
              readonly: !partial, error: amtErr, extra: tip,
            })}
            ${amtErr ? `<p class="err">Ingresa un valor entre ${ui.money(MIN_PAY)} y ${ui.money(flow.bill)}</p>` : ''}
            <div class="sv-mail">
              ${input2({
                label: 'Correo', key: 'email', value: flow.email || '', placeholder: 'Ingresa tu correo electrónico', action: 'setMail', inputmode: 'email',
                readonly: !flow.editMail, error: mailErr || (flow.editMail && flow.email && !mailOk(flow)),
                leading: '<span class="sv-input__ico"><img src="assets/icons/field-mail.svg" alt="" width="16" height="12.819"></span>',
                trailing: `<button type="button" class="sv-input__ico sv-edit" data-action="editMail" aria-label="Editar correo"><img src="${A}edit.svg" alt="" width="15.503" height="16"></button>`,
              })}
              <p class="sv-help">Valida tu información, enviaremos el comprobante<br>de la transacción a tu correo</p>
            </div>
          </div>
          ${bank(!!flow.bankOpen)}
          <div class="footer">${ui.byPuntored()}</div>
        </div>
        ${ui.sheet({
          open: !!flow.sheetOpen,
          rows: [
            ['Categoría', ui.esc(cat.label)],
            ['Empresa', ui.esc(c.name)],
            ['Número de documento', maskDoc(state.user && state.user.documento)],
            ['Referencia de pago', ui.esc(ui.digits(flow.ref1))],
            ['Valor', ui.money(amountOf(flow))],
          ],
          primary: { label: 'Confirmar', enabled: step2Ok(flow), action: 'confirm' },
          back: 'backStep',
        })}
      </div>`;
    },
    mount(root, ctx) {
      const f = ctx.flow;
      // Arranque desde "Facturas guardadas": referencia precargada y consulta automática
      if (f.autoConsult && f.step !== 2 && !f.loading && refOk(f)) { f.autoConsult = false; startConsult(ctx); }
      if (f.focusMail) { f.focusMail = false; const m = root.querySelector('[data-key="email"]'); if (m) { m.focus(); m.select(); } }
    },
    actions: {
      setRef: (ctx, el) => {
        const d = ui.digits(el.value).slice(0, REF_MAX);
        if (d !== el.value) el.value = d;
        ctx.flow.ref1 = d; ctx.flow.refError = ''; ctx.render();
      },
      consult: (ctx) => { if (refOk(ctx.flow) && !ctx.flow.loading) startConsult(ctx); },
      toggleBank: (ctx) => { ctx.flow.bankOpen = !ctx.flow.bankOpen; ctx.render(); },
      toggleTip2: (ctx) => { ctx.flow.tipOpen = !ctx.flow.tipOpen; ctx.render(); },
      setAmount: (ctx, el) => {
        const d = ui.digits(el.value).slice(0, 9);
        ctx.flow.amountText = d ? ui.num(d) : '';
        ctx.render();
      },
      setMail: (ctx, el) => { ctx.flow.email = el.value.trim(); ctx.render(); },
      editMail: (ctx) => { ctx.flow.editMail = true; ctx.flow.focusMail = true; ctx.render(); },
      backStep: (ctx) => {
        if (ctx.flow.sheetOpen) { ctx.flow.sheetOpen = false; ctx.render(); return; }
        ctx.flow.step = 1; ctx.render({ scrollTop: true });
      },
      confirm: (ctx) => {
        const f = ctx.flow;
        if (!step2Ok(f)) return;
        f.editMail = false;
        if (!f.sheetOpen) { f.sheetOpen = true; ctx.render(); return; }
        f.receipt = { date: ui.now(), auth: ui.rand(9), trx: ui.rand(9) };
        ctx.go('servicios-pasarela');
      },
    },
  });

  App.register('servicios-pasarela', {
    render: () => ui.pasarela('assets/icons/cat-pago-servicios.svg', 33.156, 31.985),
    mount: () => App.later(() => App.go('servicios-ok', {}, { replace: true }), 2200),
  });

  /* ---------- Comprobante ---------- */
  App.register('servicios-ok', {
    render({ flow }) {
      const c = companyById(flow.company) || {};
      const r = flow.receipt || {};
      const rows = [
        ['Fecha y hora', r.date || ui.now()],
        ['Estado', 'Aprobada', 'sv-kv--ok'],
        ['Operación', 'Pago de servicios'],
        ['Numero de autorización', r.auth || ''],
        ['ID transacción', r.trx || ''],
        ['Convenio', ui.esc(c.name || '')],
        ['Referencia de pago 1', ui.esc(ui.digits(flow.ref1))],
      ];
      if (flow.ref2) rows.push(['Referencia de pago 2', ui.esc(flow.ref2)]);
      rows.push(['Total', ui.money(amountOf(flow))]);
      return `
      <div class="screen screen--gray">
        <div class="content sv-receipt" data-scroll="main">
          ${ui.logo()}
          <p class="receipt-title">¡Transacción exitosa!</p>
          <div class="receipt-rows">${ui.rows(rows)}</div>
          <div class="sv-receipt__bank">
            ${bank(!!flow.bankOpen, { center: true })}
            <p class="sv-receipt__line">Línea de atención personalizada Davivienda en Bogotá: 3487881<br>Resto del Pais: 01 8000 960 505</p>
          </div>
          ${ui.finishLink()}
        </div>
      </div>`;
    },
    actions: {
      toggleBank: (ctx) => { ctx.flow.bankOpen = !ctx.flow.bankOpen; ctx.render(); },
    },
  });
})();
