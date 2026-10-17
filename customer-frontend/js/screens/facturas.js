/* Flujo Facturas guardadas
 *  facturas            Lista "Facturas guardadas" con tabs Disponible / No disponible (2406:31099, 2408:61043, 2408:61374)
 *                      + confirmación de borrado (2408:61490) y "Factura eliminada" (2408:61540)
 *  facturas-nueva      Form "Guardar facturas" (2404:3045, 2405:3409, 2405:10546, 2405:10744)
 *  facturas-categorias Grilla "Servicios" (2405:3501)
 *  facturas-guardada   "Factura guardada exitosamente" (2405:10863)
 *  facturas-editar     Editar factura: sólo el nombre (2408:61204, 2408:61300)
 *  facturas-pagar      Pagar factura guardada (Form-2 2408:61642 / 2408:61686)
 *  facturas-pasarela   Pasarela (2408:61774) → facturas-ok Comprobante (2408:61727)
 */
(function () {
  const { ui } = App;
  const A = 'assets/facturas/';
  const STORE_KEY = 'mb-facturas';

  /* ---------- Catálogo local (fallback si App.data.servicios no existe) ---------- */
  const CATS = [
    { id: 'agua', label: 'Agua' },
    { id: 'energia', label: 'Energía' },
    { id: 'gas', label: 'Gas' },
    { id: 'telefonia', label: 'Telefonía celular-Internet -tv' },
    { id: 'salud', label: 'Salud y seguridad social' },
    { id: 'catalogo', label: 'Ventas por catálogo' },
    { id: 'financieras', label: 'Pagos obligaciones financieras' },
    { id: 'impuestos', label: 'Impuestos' },
    { id: 'educacion', label: 'Educación' },
    { id: 'administracion', label: 'Pago administración conjuntos' },
    { id: 'movilidad', label: 'Movilidad y transporte' },
    { id: 'otros', label: 'Otros' },
  ];
  const LOCAL_COMPANIES = {
    gas: ['Gas Natural Cundiboyacense', 'Vanti', 'Gases del Caribe', 'Efigas', 'Surtigas', 'Alcanos de Colombia', 'Gases de Occidente', 'Madigas Ingenieros'],
    agua: ['Acueducto de Bogotá', 'EPM Aguas', 'Aguas de Manizales', 'Triple A'],
    energia: ['Enel Codensa', 'Afinia', 'Air-e', 'EPM Energía', 'Celsia'],
    telefonia: ['Claro', 'Movistar', 'Tigo', 'ETB', 'WOM'],
    salud: ['Compensar', 'Sura EPS', 'Sanitas', 'Colsubsidio'],
    catalogo: ['Yanbal', 'Avon', 'Natura', 'Ésika'],
    financieras: ['Icetex', 'Banco de Bogotá', 'Bancolombia', 'Davivienda'],
    impuestos: ['Secretaría de Hacienda Bogotá', 'DIAN'],
    educacion: ['Universidad Nacional', 'Colegio Los Olivos', 'SENA'],
    administracion: ['Conjunto Los Olivos', 'Edificio Torres del Parque'],
    movilidad: ['Cabify', 'Peajes Colombia', 'TransMilenio'],
    otros: ['Super Ricas', 'Recaudo general'],
  };

  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const catById = (id) => CATS.find(c => c.id === id) || { id, label: id || '' };
  const catIcon = (id) => `${A}cat-${CATS.some(c => c.id === id) ? id : 'otros'}.svg`;

  /** Convenios de una categoría: usa App.data.servicios si existe (flujo Pago de servicios), si no el fallback local */
  const companiesFor = (catId) => {
    const local = LOCAL_COMPANIES[catId] || [];
    const sv = App.data && App.data.servicios;
    if (!sv || !Array.isArray(sv.companies)) return local;
    const cat = catById(catId);
    const svCat = (sv.categories || []).find(c => c.id === catId || norm(c.label || c.name) === norm(cat.label));
    const keys = [catId, svCat && svCat.id].filter(Boolean);
    const names = sv.companies
      .filter(co => keys.includes(co.cat || co.category || co.categoryId) || norm(co.cat || co.category) === norm(cat.label))
      .map(co => co.name || co.label)
      .filter(Boolean);
    return names.length ? Array.from(new Set(names)) : local;
  };

  /** Convenio de App.data.servicios con ese nombre (para saber si permite pagos parciales / valor) */
  const svCompany = (name) => {
    const sv = App.data && App.data.servicios;
    return sv && Array.isArray(sv.companies) ? sv.companies.find(co => norm(co.name) === norm(name)) : null;
  };

  /* ---------- Estado persistente ---------- */
  const SEED = [
    { id: 'f1', name: 'Factura Gas Natural', cat: 'gas', conv: 'Gas Natural Cundiboyacense', ref1: '00000001', ref2: '', available: true, lastPay: '27/03/2023', amount: 10000 },
    { id: 'f2', name: 'Factura Gas Casa', cat: 'gas', conv: 'Gas Natural Cundiboyacense', ref1: '00000001', ref2: '', available: false, lastPay: '27/03/2023', amount: 10000 },
  ];
  const load = () => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw != null) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
    } catch (e) { /* sin storage */ }
    return SEED.map(f => ({ ...f }));
  };
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(App.state.facturas)); } catch (e) { /* sin storage */ } };
  if (!Array.isArray(App.state.facturas)) App.state.facturas = load();
  const bills = () => App.state.facturas;
  const billById = (id) => bills().find(b => b.id === id);

  /* ---------- Piezas de UI ---------- */
  const titleBox = (t) => `<div class="fc-title">${ui.esc(t)}</div>`;
  const footer = () => `<div class="footer">${ui.byPuntored()}</div>`;

  /** Input-v2 con etiqueta flotante */
  const input = ({ label, key, value = '', placeholder = '', action, inputmode, maxlength, disabled = false, trailing = '', leading = '', extraCls = '', type = 'text', err = '', hint = '' }) => `
    <div class="fc-input${disabled ? ' is-disabled' : ''}${err ? ' is-error' : ''} ${extraCls}">
      <label class="fc-input__box">
        ${leading}
        <input class="fc-input__field" ${ui.attrs({ 'data-key': key, 'data-input': action, type, inputmode, placeholder, maxlength, disabled, autocomplete: 'off' })} value="${ui.esc(value)}">
        ${trailing}
      </label>
      <span class="fc-input__label">${ui.esc(label)}</span>
      ${hint}
      ${err ? `<p class="err fc-err">${ui.esc(err)}</p>` : ''}
    </div>`;

  /** Selector de categoría (Seleccionar categorias 2404:3158) */
  const catSelector = (catId, { locked = false } = {}) => {
    if (!catId) {
      return `<button type="button" class="fc-cat-sel" data-action="fcOpenCats">
        <span>Categoría | Servicio</span><img src="${A}chevron-right.svg" alt="" width="16" height="16"></button>`;
    }
    const cat = catById(catId);
    const icon = catId === 'gas' ? `<img class="fc-pill__icon" src="${A}cat-gas-white.svg" alt="" width="23" height="27">`
      : `<img class="fc-pill__icon fc-invert" src="${catIcon(catId)}" alt="" width="27" height="27">`;
    const pill = `<span class="fc-pill">${icon}<span class="fc-pill__div"></span><span class="fc-pill__label">${ui.esc(cat.label)}</span></span>`;
    return locked
      ? `<div class="fc-cat-sel fc-cat-sel--on fc-cat-sel--locked">${pill}</div>`
      : `<button type="button" class="fc-cat-sel fc-cat-sel--on" data-action="fcOpenCats">${pill}<span class="fc-cat-sel__other">Otro<img src="${A}chevron-right.svg" alt="" width="16" height="16"></span></button>`;
  };

  /** Ícono de categoría dentro del círculo de la tarjeta */
  const cardIcon = (catId) => catId === 'gas'
    ? `<img src="${A}fire-white-sm.svg" alt="" width="17" height="20">`
    : `<img class="fc-invert fc-card__cat-img" src="${catIcon(catId)}" alt="" width="16" height="16">`;

  /** Card-savedbills (2407:60942) */
  const card = (b) => {
    const off = !b.available;
    return `
    <article class="fc-card${off ? ' is-off' : ''}">
      <div class="fc-card__main">
        <div class="fc-card__head">
          <span class="fc-card__icon">${cardIcon(b.cat)}</span>
          <span class="fc-card__name">${ui.esc(b.name)}</span>
        </div>
        <div class="fc-card__info">
          <p>${ui.esc(catById(b.cat).label)}</p>
          <p>${ui.esc(b.conv)}</p>
          <p>Referencia de pago: ${ui.esc(b.ref1)}</p>
        </div>
        <div class="fc-card__foot">
          <p class="fc-card__last"><strong>Último pago:</strong> ${ui.esc(b.lastPay || '—')}</p>
          ${off ? '' : `<button type="button" class="fc-card__pay" data-action="fcPay" data-id="${b.id}">Ir a pagar</button>`}
        </div>
      </div>
      <div class="fc-card__tools">
        <button type="button" class="fc-tool" data-action="fcAskDelete" data-id="${b.id}" aria-label="Eliminar factura"><img src="${A}trash.svg" alt="" width="16" height="16"></button>
        <button type="button" class="fc-tool" data-action="fcEdit" data-id="${b.id}" aria-label="Editar factura"><img src="${A}pencil.svg" alt="" width="11" height="11"></button>
      </div>
    </article>`;
  };

  /** Carderror (190:16861): tarjeta centrada con icono + texto (+ botones) */
  const dialogPage = ({ icon, text, buttons = '', back = false, textCls = '' }) => `
    <div class="screen">
      <div class="content fc-col">
        ${ui.logo()}
        <div class="fc-dialog-wrap">
          <div class="fc-dialog" role="dialog" aria-modal="true">
            <img src="${icon}" alt="" width="34" height="34">
            <p class="fc-dialog__text ${textCls}">${text}</p>
            ${buttons}
          </div>
        </div>
        <div class="bottom fc-bottom">
          ${back ? `<div class="fc-actions">${ui.backBtn(back)}</div>` : '<div class="fc-actions-spacer"></div>'}
          ${footer()}
        </div>
      </div>
    </div>`;

  /** Banco procesador (190:13112) */
  const bancoProcesador = ({ center = false } = {}) => `
    <div class="fc-banco${center ? ' fc-banco--center' : ''}">
      <div class="fc-banco__row">
        <div class="fc-banco__col">
          <p class="fc-banco__b">Transacción procesada por:</p>
          <img src="${A}puntored-sm.svg" alt="Insieme" width="60" height="15">
        </div>
        <p class="fc-banco__corr">Corresponsal de:</p>
        <div class="fc-banco__col">
          <p class="fc-banco__b">Entidad financiera responsable</p>
          <div class="fc-banco__ent">
            <span class="fc-banco__logo"><span><img src="${A}colpatria.png" alt="Scotiabank Colpatria"></span></span>
            <img class="fc-banco__union" src="${A}union.svg" alt="" width="8" height="8">
          </div>
        </div>
      </div>
      <p class="fc-banco__fine">Si se requiere soporte o ampliar información contáctenos a hola@oplat.co o al 3332822713</p>
    </div>`;

  /* =====================================================================
   * Lista "Facturas guardadas"
   * ===================================================================== */
  App.register('facturas', {
    render({ flow }) {
      if (flow.delDone) {
        return dialogPage({ icon: `${A}trash-lg.svg`, text: 'Factura eliminada', back: 'fcDelDone' });
      }
      if (flow.delId && billById(flow.delId)) {
        return dialogPage({
          icon: `${A}trash-lg.svg`,
          text: '¿Estás seguro de que deseas<br>eliminar esta factura?',
          buttons: `<div class="fc-dialog__btns">
              <button type="button" class="btn fc-btn-yes" data-action="fcDelete">Si</button>
              <button type="button" class="btn fc-btn-no" data-action="fcCancelDelete">No</button>
            </div>`,
        });
      }
      const all = bills();
      const tab = flow.tab === 'off' ? 'off' : 'on';
      const list = all.filter(b => (tab === 'on' ? b.available : !b.available));
      const empty = all.length === 0;
      return `
      <div class="screen">
        <div class="content fc-col">
          ${ui.logo()}
          ${titleBox('Facturas guardadas')}
          ${empty ? `
            <div class="fc-empty">
              <img src="assets/icons/cat-pago-servicios.svg" alt="" width="33" height="32">
              <p class="fc-empty__title">Aún no tienes facturas guardadas</p>
              <p class="fc-empty__text">Guarda tus facturas de servicios para pagarlas más rápido la próxima vez.</p>
            </div>
            <div class="bottom fc-bottom">
              <div class="fc-actions">${ui.backBtn('home')}<button type="button" class="btn btn--active btn--grow" data-action="fcNew">Guardar facturas</button></div>
              ${footer()}
            </div>` : `
            <div class="fc-tabs" role="tablist">
              <div class="fc-tabs__labels">
                <button type="button" role="tab" aria-selected="${tab === 'on'}" class="${tab === 'on' ? 'is-active' : ''}" data-action="fcTab" data-tab="on">Disponible para pago</button>
                <button type="button" role="tab" aria-selected="${tab === 'off'}" class="${tab === 'off' ? 'is-active' : ''}" data-action="fcTab" data-tab="off">No disponible</button>
              </div>
              <div class="fc-tabs__track"><span class="fc-tabs__bar${tab === 'off' ? ' is-right' : ''}"></span></div>
            </div>
            <div class="fc-list" data-scroll="fc-list">
              ${list.length ? list.map(card).join('') : `<p class="fc-list__empty">${tab === 'on' ? 'No tienes facturas disponibles para pago.' : 'No tienes facturas en esta sección.'}</p>`}
            </div>
            <div class="bottom fc-bottom">
              <div class="fc-actions">${ui.backBtn('home')}<button type="button" class="btn fc-btn-secondary btn--grow" data-action="fcNew">Guardar otra factura</button></div>
              ${footer()}
            </div>`}
        </div>
      </div>`;
    },
    mount(root, ctx) {
      // App.go('facturas', {add:true}) desde Pago de servicios ("+ Facturas") abre directamente "Guardar facturas"
      if (ctx.params.add && !ctx.flow.addHandled) {
        ctx.flow.addHandled = true;
        ctx.flow.draft = {};
        App.later(() => App.go('facturas-nueva'), 0);
      }
    },
    actions: {
      fcTab: (ctx, el) => { ctx.flow.tab = el.dataset.tab; ctx.render(); },
      fcNew: (ctx) => { ctx.flow.draft = {}; ctx.go('facturas-nueva'); },
      fcAskDelete: (ctx, el) => { ctx.flow.delId = el.dataset.id; ctx.render(); },
      fcCancelDelete: (ctx) => { ctx.flow.delId = null; ctx.render(); },
      fcDelete: (ctx) => {
        App.state.facturas = bills().filter(b => b.id !== ctx.flow.delId);
        save();
        ctx.flow.delId = null;
        ctx.flow.delDone = true;
        ctx.render();
      },
      fcDelDone: (ctx) => { ctx.flow.delDone = false; ctx.render(); },
      fcEdit: (ctx, el) => {
        const b = billById(el.dataset.id);
        if (!b) return;
        ctx.flow.edit = { id: b.id, name: b.name };
        ctx.go('facturas-editar');
      },
      fcPay: (ctx, el) => {
        const b = billById(el.dataset.id);
        if (!b) return;
        ctx.flow.pay = { id: b.id, amountText: ui.num(b.amount || (svCompany(b.conv) || {}).amount || 10000), email: ctx.state.user.correo || '' };
        ctx.flow.sheetOpen = false;
        ctx.flow.hintShown = false;
        ctx.go('facturas-pagar');
      },
    },
  });

  /* =====================================================================
   * Guardar facturas (form)
   * ===================================================================== */
  const draftValid = (d) => ({
    cat: !!d.cat,
    name: (d.name || '').trim().length >= 3,
    conv: !!d.conv,
    ref1: /^\d{6,}$/.test(d.ref1 || ''),
  });
  const allOk = (v) => Object.values(v).every(Boolean);

  const convDropdown = (d) => {
    if (!d.convOpen) return '';
    if (!d.cat) {
      return `<div class="fc-drop"><button type="button" class="fc-drop__item fc-drop__item--hint" data-action="fcOpenCats">Primero selecciona la categoría o servicio ›</button></div>`;
    }
    const q = norm(d.convQuery);
    const items = companiesFor(d.cat).filter(n => !q || norm(n).includes(q));
    return `<div class="fc-drop" data-scroll="fc-drop" role="listbox">
      ${items.length ? items.map(n => `<button type="button" role="option" class="fc-drop__item" data-action="fcPickConv" data-name="${ui.esc(n)}">${ui.esc(n)}</button>`).join('')
        : '<p class="fc-drop__none">No encontramos convenios con ese nombre</p>'}
    </div>`;
  };

  App.register('facturas-nueva', {
    render({ flow }) {
      const d = flow.draft = flow.draft || {};
      const v = draftValid(d);
      const ok = allOk(v);
      const nameErr = d.name && !v.name ? 'El nombre debe tener al menos 3 caracteres' : '';
      const refErr = d.ref1 && !v.ref1 ? 'La referencia debe tener mínimo 6 dígitos' : '';
      const convErr = d.tried && !v.conv ? 'Selecciona un convenio o proveedor' : '';
      return `
      <div class="screen">
        <div class="content fc-col">
          ${ui.logo()}
          ${titleBox('Guardar facturas')}
          <p class="fc-label">Selecciona la categoría o servicio:</p>
          ${catSelector(d.cat)}
          ${d.tried && !v.cat ? '<p class="err fc-err fc-err--cat">Selecciona una categoría</p>' : ''}
          <div class="fc-fields">
            ${input({ label: 'Nombre de la factura', key: 'fc-name', value: d.name || '', placeholder: 'Digita el sobrenombre para la factura', action: 'fcSet', maxlength: 30, err: nameErr || (d.tried && !v.name ? 'Digita un nombre de mínimo 3 caracteres' : '') })}
            <div class="fc-conv">
              ${d.conv ? `<button type="button" class="fc-clear" data-action="fcClearConv"><span>Borrar selección</span><img src="${A}eraser.svg" alt="" width="13" height="13"></button>` : ''}
              ${input({
                label: 'Convenio o proveedor', key: 'fc-conv', value: d.conv || d.convQuery || '', placeholder: 'Selecciona el proveedor de tu servicio', action: 'fcConvQuery', err: convErr,
                trailing: `<button type="button" class="fc-input__icon" data-action="fcToggleConv" aria-label="Buscar convenio"><img src="${A}search.svg" alt="" width="24" height="24"></button>`,
                hint: convDropdown(d),
              })}
            </div>
            ${input({ label: 'Referencia No.1', key: 'fc-ref1', value: d.ref1 || '', placeholder: 'Digita el número de referencia 1', action: 'fcSet', inputmode: 'numeric', maxlength: 20, err: refErr || (d.tried && !v.ref1 ? 'Digita una referencia numérica de mínimo 6 dígitos' : '') })}
            ${input({ label: 'Referencia No.2', key: 'fc-ref2', value: d.ref2 || '', placeholder: 'Digita el número de referencia 2', action: 'fcSet', inputmode: 'numeric', maxlength: 20 })}
          </div>
          <div class="bottom fc-bottom">
            <div class="fc-actions">${ui.backBtn()}<button type="button" class="btn ${ok ? 'btn--active' : 'btn--disabled'} btn--grow" data-action="fcSave">Continuar</button></div>
            ${footer()}
          </div>
        </div>
      </div>`;
    },
    actions: {
      fcOpenCats: (ctx) => { ctx.flow.draft.convOpen = false; ctx.go('facturas-categorias'); },
      fcSet: (ctx, el) => {
        const d = ctx.flow.draft;
        const k = el.dataset.key.replace('fc-', '');
        d[k] = k === 'name' ? el.value.replace(/^\s+/, '') : ui.digits(el.value);
        ctx.render();
      },
      fcConvQuery: (ctx, el) => {
        const d = ctx.flow.draft;
        d.conv = null;
        d.convQuery = el.value;
        d.convOpen = true;
        ctx.render();
      },
      fcToggleConv: (ctx, el, e) => {
        e.preventDefault();
        const d = ctx.flow.draft;
        d.convOpen = !d.convOpen;
        ctx.render();
        if (d.convOpen) { const f = document.querySelector('[data-key="fc-conv"]'); if (f && !d.conv) f.focus(); }
      },
      fcPickConv: (ctx, el) => {
        const d = ctx.flow.draft;
        d.conv = el.dataset.name;
        d.convQuery = '';
        d.convOpen = false;
        ctx.render();
      },
      fcClearConv: (ctx) => {
        const d = ctx.flow.draft;
        d.conv = null; d.convQuery = ''; d.convOpen = false;
        ctx.render();
      },
      fcSave: (ctx) => {
        const d = ctx.flow.draft;
        if (!allOk(draftValid(d))) { d.tried = true; ctx.render(); return; }
        App.state.facturas = bills().concat({
          id: 'f' + Date.now(), name: d.name.trim(), cat: d.cat, conv: d.conv, ref1: d.ref1, ref2: d.ref2 || '',
          available: true, lastPay: '—', amount: 10000,
        });
        save();
        ctx.flow.tab = 'on';
        ctx.go('facturas-guardada', {}, { replace: true });
      },
    },
  });

  /* ---------- Grilla de categorías "Servicios" ---------- */
  App.register('facturas-categorias', {
    render({ flow }) {
      const sel = flow.draft && flow.draft.cat;
      return `
      <div class="screen">
        <div class="content fc-col">
          ${ui.logo()}
          ${titleBox('Servicios')}
          <div class="fc-cats">
            ${CATS.map(c => `
              <button type="button" class="fc-cat${c.id === sel ? ' is-selected' : ''}" data-action="fcPickCat" data-id="${c.id}">
                <span class="fc-cat__icon"><img src="${catIcon(c.id)}" alt="" height="27"></span>
                <span class="fc-cat__div"></span>
                <span class="fc-cat__label">${ui.esc(c.label)}</span>
              </button>`).join('')}
          </div>
          <div class="bottom fc-bottom">
            <div class="fc-actions">${ui.backBtn()}</div>
            ${footer()}
          </div>
        </div>
      </div>`;
    },
    actions: {
      fcPickCat: (ctx, el) => {
        const d = ctx.flow.draft = ctx.flow.draft || {};
        if (d.cat !== el.dataset.id) { d.conv = null; d.convQuery = ''; }
        d.cat = el.dataset.id;
        d.convOpen = false;
        ctx.render();
        App.later(() => ctx.back(), 160);
      },
    },
  });

  /* ---------- Factura guardada exitosamente ---------- */
  App.register('facturas-guardada', {
    render: () => dialogPage({ icon: `${A}check-circle.svg`, text: 'Factura guardada<br>exitosamente', back: 'fcToList', textCls: 'fc-dialog__text--lg' }),
    actions: { fcToList: () => App.reset('facturas') },
  });

  /* =====================================================================
   * Editar factura (sólo nombre)
   * ===================================================================== */
  App.register('facturas-editar', {
    render({ flow }) {
      const e = flow.edit || {};
      const b = billById(e.id);
      if (!b) return `<div class="screen"><div class="content">${ui.logo()}<p class="fc-label">La factura ya no existe.</p>${ui.btn('Volver', { variant: 'dark', action: 'back' })}</div></div>`;
      const name = e.name ?? b.name;
      const valid = name.trim().length >= 3;
      const ok = valid && name.trim() !== b.name;
      return `
      <div class="screen">
        <div class="content fc-col">
          ${ui.logo()}
          ${titleBox('Guardar facturas')}
          <p class="fc-label">Selecciona la categoría o servicio:</p>
          ${catSelector(b.cat, { locked: true })}
          <div class="fc-fields fc-fields--edit">
            ${input({ label: 'Nombre de la factura', key: 'fc-ename', value: name, placeholder: 'Digita el sobrenombre para la factura', action: 'fcEditName', maxlength: 30, err: name && !valid ? 'El nombre debe tener al menos 3 caracteres' : '' })}
            ${input({ label: 'Convenio o proveedor', key: 'fc-econv', value: b.conv, disabled: true })}
            ${input({ label: 'Referencia No.1', key: 'fc-eref', value: b.ref1, disabled: true, extraCls: 'is-disabled-2' })}
          </div>
          <div class="bottom fc-bottom">
            <div class="fc-actions">${ui.backBtn()}<button type="button" class="btn ${ok ? 'btn--active' : 'btn--disabled'} btn--grow" data-action="fcEditSave" ${ok ? '' : 'aria-disabled="true"'}>Guardar</button></div>
            ${footer()}
          </div>
        </div>
      </div>`;
    },
    actions: {
      fcEditName: (ctx, el) => { ctx.flow.edit.name = el.value.replace(/^\s+/, ''); ctx.render(); },
      fcEditSave: (ctx) => {
        const b = billById(ctx.flow.edit.id);
        if (!b) return;
        b.name = ctx.flow.edit.name.trim();
        save();
        ctx.back();
      },
    },
  });

  /* =====================================================================
   * Pagar factura guardada (Form-2) → Pasarela → Comprobante
   * ===================================================================== */
  const MIN = 1000, MAX = 5000000;
  const payAmount = (p) => Number(ui.digits(p.amountText));
  const payOk = (p) => ({
    amount: payAmount(p) >= MIN && payAmount(p) <= MAX,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email || ''),
  });
  const docMasked = (state) => {
    const d = ui.digits(state.user.documento);
    return d.length > 4 ? d.slice(0, -4) + '****' : '10265988****';
  };

  App.register('facturas-pagar', {
    render({ flow, state }) {
      const p = flow.pay || {};
      const b = billById(p.id);
      if (!b) return `<div class="screen"><div class="content">${ui.logo()}<p class="fc-label">La factura ya no existe.</p>${ui.btn('Volver', { variant: 'dark', action: 'back' })}</div></div>`;
      const v = payOk(p);
      const ready = v.amount && v.email;
      const amtErr = p.amountText && !v.amount ? `El valor debe estar entre ${ui.money(MIN)} y ${ui.money(MAX)}` : '';
      const mailErr = p.email && !v.email && p.emailTouched ? 'Ingresa un correo válido' : '';
      const headIcon = b.cat === 'gas' ? `<img src="${A}fire-teal.svg" alt="" width="23" height="27">` : `<img src="${catIcon(b.cat)}" alt="" height="27">`;
      return `
      <div class="screen">
        <div class="content content--sheet fc-col fc-pay" data-scroll="main">
          ${ui.logo()}
          <div class="fc-head">
            <span class="fc-head__icon">${headIcon}</span>
            <span class="fc-head__div"></span>
            <div class="fc-head__txt"><p class="fc-head__cat">${ui.esc(catById(b.cat).label)}</p><p class="fc-head__conv">${ui.esc(b.conv)}</p></div>
          </div>
          <div class="fc-fields fc-fields--pay">
            ${input({ label: 'Nombre de la factura', key: 'fc-pname', value: b.name, disabled: true })}
            ${input({ label: 'Referencia de pago 1', key: 'fc-pref', value: b.ref1, disabled: true })}
            ${input({
              label: 'Valor', key: 'fc-amount', value: p.amountText ? '$ ' + p.amountText : '', placeholder: '$ 0', action: 'fcAmount', inputmode: 'numeric', maxlength: 12, err: amtErr,
              hint: (svCompany(b.conv) ? svCompany(b.conv).partial : true) === false ? '' : `<span class="fc-hint${p.hintOpen ? ' is-open' : ''}">
                  <button type="button" class="fc-hint__icon" data-action="fcHint" aria-label="Más información"><img src="${A}alert-circle.svg" alt="" width="14" height="14"></button>
                  <span class="fc-hint__bubble" role="tooltip">Tu factura permite<br>pagos parciales</span>
                </span>`,
            })}
            ${input({
              label: 'Correo', key: 'fc-email', value: p.email || '', placeholder: 'Digita tu correo electrónico', action: 'fcEmail', type: 'email', err: mailErr, extraCls: 'fc-input--mail',
              leading: `<span class="fc-input__lead"><img src="assets/icons/field-mail.svg" alt="" width="16" height="13"></span>`,
              trailing: `<button type="button" class="fc-input__icon" data-action="fcFocusMail" aria-label="Editar correo"><img src="${A}edit.svg" alt="" width="16" height="16"></button>`,
            })}
            ${mailErr ? '' : '<p class="fc-help">Valida tu información, enviaremos el comprobante<br>de la transacción a tu correo</p>'}
          </div>
          ${bancoProcesador()}
          ${footer()}
        </div>
        ${ui.sheet({
          open: !!flow.sheetOpen,
          rows: [
            ['Categoría', ui.esc(catById(b.cat).label)],
            ['Empresa', ui.esc(b.conv)],
            ['Número de documento', ui.esc(docMasked(state))],
            ['Referencia de pago', ui.esc(b.ref1)],
            ['Valor', v.amount ? ui.money(payAmount(p)) : '—'],
          ],
          primary: { label: 'Confirmar', enabled: ready, action: 'fcConfirm' },
        })}
      </div>`;
    },
    mount(root) {
      // Como en el diseño, el tooltip "pagos parciales" aparece abierto al entrar
      const p = App.flow.pay;
      if (p && !App.flow.hintShown) {
        App.flow.hintShown = true;
        p.hintOpen = true;
        const h = root.querySelector('.fc-hint');
        if (h) h.classList.add('is-open');
        App.later(() => { p.hintOpen = false; const x = document.querySelector('.fc-hint'); if (x) x.classList.remove('is-open'); }, 3500);
      }
    },
    actions: {
      fcHint: (ctx) => { ctx.flow.pay.hintOpen = !ctx.flow.pay.hintOpen; ctx.render(); },
      fcAmount: (ctx, el) => {
        const d = ui.digits(el.value);
        ctx.flow.pay.amountText = d ? ui.num(d) : '';
        ctx.render();
      },
      fcEmail: (ctx, el) => { ctx.flow.pay.email = el.value.trim(); ctx.flow.pay.emailTouched = true; ctx.render(); },
      fcFocusMail: (ctx, el, e) => {
        e.preventDefault();
        const f = document.querySelector('[data-key="fc-email"]');
        if (f) { f.focus(); f.select(); }
      },
      fcConfirm: (ctx) => {
        const p = ctx.flow.pay;
        const v = payOk(p);
        if (!(v.amount && v.email)) { p.emailTouched = true; ctx.render(); return; }
        if (!ctx.flow.sheetOpen) { ctx.flow.sheetOpen = true; ctx.render(); return; }
        ctx.flow.receipt = { date: ui.now(), auth: ui.rand(9), trx: ui.rand(9) };
        const b = billById(p.id);
        if (b) { b.lastPay = ui.today(); b.amount = payAmount(p); save(); }
        ctx.go('facturas-pasarela');
      },
    },
  });

  App.register('facturas-pasarela', {
    render: () => ui.pasarela('assets/icons/cat-pago-servicios.svg', 33, 32),
    mount: () => App.later(() => App.go('facturas-ok', {}, { replace: true }), 2200),
  });

  App.register('facturas-ok', {
    render({ flow }) {
      const p = flow.pay || {};
      const b = billById(p.id) || {};
      const r = flow.receipt || {};
      const rows = [
        ['Fecha y hora', ui.esc(r.date || ui.now())],
        ['Estado', 'Aprobada', 'fc-kv--ok'],
        ['Operación', 'Pago de servicios'],
        ['Numero de autorización', r.auth || ''],
        ['ID transacción', r.trx || ''],
        ['Convenio', ui.esc(b.conv || '')],
        ['Referencia de pago 1', ui.esc(b.ref1 || '')],
      ];
      if (b.ref2) rows.push(['Referencia de pago 2', ui.esc(b.ref2)]);
      rows.push(['Total', ui.money(payAmount(p))]);
      return `
      <div class="screen screen--gray">
        <div class="content fc-receipt" data-scroll="main">
          ${ui.logo()}
          <p class="receipt-title">¡Transacción exitosa!</p>
          <div class="receipt-rows">${ui.rows(rows)}</div>
          <div class="fc-receipt__bank">
            ${bancoProcesador({ center: true })}
            <p class="fc-receipt__line">Línea de atención personalizada Davivienda en Bogotá: 3487881<br>Resto del Pais: 01 8000 960 505</p>
          </div>
          <div class="fc-receipt__links">
            <button type="button" class="link-finish" data-action="fcToList">Ver mis facturas</button>
            ${ui.finishLink()}
          </div>
        </div>
      </div>`;
    },
    actions: { fcToList: () => App.reset('facturas') },
  });
})();
