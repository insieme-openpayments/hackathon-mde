/* Onboarding: TyC-1 / TyC-2 / Política (2018:4572, 2024:16434, 2025:16581) y Home (2025:16719) */
(function () {
  const { ui } = App;
  const LOREM = 'Lorem ipsum dolor sit amet. At minus nulla sit alias velit est adipisci molestiae et distinctio consequatur aut accusamus omnis qui consequatur quae. Aut perspiciatis nihil At magnam doloremque qui quos nostrum.Eos sapiente quasi ab repellat quidem qui cupiditate voluptatum est eaque nihil eos internos quia. Id deserunt cumque ea molestias internos aut saepe quidem eum nihil quia ad deleniti internos ut ipsa corporis qui pariatur sequi. t rerum labore eum quod laborum et maiores eveniet cum excepturi eveniet et officia earum quo aspernatur consequuntur est odit totam. Qui soluta eius hic voluptas galisum id blanditiis.';

  const DOC_TYPES = ['Cédula de ciudadanía', 'Cédula de extranjería', 'Tarjeta de identidad', 'Pasaporte', 'NIT'];

  const valid = (u) => ({
    nombre: (u.nombre || '').trim().length >= 2,
    apellido: (u.apellido || '').trim().length >= 2,
    tipoDoc: !!u.tipoDoc,
    documento: ui.digits(u.documento).length >= 5,
    correo: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(u.correo || ''),
    celular: /^3\d{9}$/.test(ui.digits(u.celular)),
    acepta: !!u.acepta,
  });
  const allValid = (u) => Object.values(valid(u)).every(Boolean);

  const icon = (name) => `assets/icons/field-${name}.svg`;

  App.register('tyc', {
    render({ state, flow }) {
      const u = state.user;
      const v = valid(u);
      const showErr = flow.tried;
      const err = (k) => (showErr && !v[k] ? ' is-error' : '');
      const f = (opts, k) => ui.field(opts).replace('class="item-list', `class="item-list${err(k)}`);
      const ok = allValid(u);
      return `
      <div class="screen">
        <div class="content content--gap24">
          ${ui.logo()}
          <div class="tyc-body">
            <div class="fieldset">
              <div class="fieldset__box">
                ${f({ key: 'nombre', icon: icon('user'), placeholder: 'Digita tu nombre', value: u.nombre, action: 'set' }, 'nombre')}
                ${f({ key: 'apellido', icon: icon('user'), placeholder: 'Digita tu apellido', value: u.apellido, action: 'set' }, 'apellido')}
                <label class="item-list${err('tipoDoc')}">
                  <img class="item-list__icon" src="${icon('id')}" alt="" width="16" height="16">
                  <select class="item-list__input${u.tipoDoc ? '' : ' is-empty'}" data-key="tipoDoc" data-input="set" aria-label="Tipo de documento">
                    <option value="" ${u.tipoDoc ? '' : 'selected'} disabled>Selecciona tu tipo de documento</option>
                    ${DOC_TYPES.map(t => `<option ${u.tipoDoc === t ? 'selected' : ''}>${t}</option>`).join('')}
                  </select>
                  <img src="assets/icons/chevron-down.svg" alt="" width="16" height="16">
                </label>
                ${f({ key: 'documento', icon: icon('id'), placeholder: 'Digita tu documento', value: u.documento, action: 'set', inputmode: 'numeric', maxlength: 12 }, 'documento')}
                ${f({ key: 'correo', icon: icon('mail'), placeholder: 'Digita tu correo electrónico', value: u.correo, action: 'set', type: 'email' }, 'correo')}
                ${f({ key: 'celular', icon: icon('phone'), placeholder: 'Digita tu número celular', value: u.celular, action: 'set', inputmode: 'numeric', maxlength: 10, last: true }, 'celular')}
              </div>
              <span class="fieldset__legend">Ingresa los siguientes datos</span>
            </div>
            <div class="tyc-check">
              <button type="button" class="check${u.acepta ? ' is-on' : ''}" data-action="toggleAcepta" role="checkbox" aria-checked="${!!u.acepta}" aria-label="Autorizo el tratamiento de datos"></button>
              <p>Autorizo el <a href="#" data-action="openPolicy">tratamiento de datos personales y términos y condiciones</a></p>
            </div>
            ${showErr && !ok ? '<p class="err">Completa los campos marcados y acepta la política para continuar.</p>' : ''}
          </div>
          <div class="bottom">
            ${ui.btn('Continuar', { variant: ok ? 'active' : 'disabled', action: 'continue' })}
            <div class="footer">${ui.byPuntored()}</div>
          </div>
        </div>
        ${flow.policy ? `
          <div class="overlay" data-action="closePolicy"></div>
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="policyTitle">
            <div class="modal__head">
              <h2 class="modal__title" id="policyTitle">Política de tratamiento de datos personales</h2>
              <button type="button" class="modal__close" data-action="closePolicy" aria-label="Cerrar"><img src="assets/icons/x.svg" alt="" width="16" height="16"></button>
            </div>
            <div class="modal__body"><p>${LOREM}</p><p>${LOREM} ${LOREM}</p></div>
            ${ui.btn('Continuar', { variant: 'active', action: 'acceptPolicy' })}
          </div>` : ''}
      </div>`;
    },
    actions: {
      set: (ctx, el) => {
        let val = el.value;
        if (['documento', 'celular'].includes(el.dataset.key)) { val = ui.digits(val); el.value = val; }
        ctx.state.user[el.dataset.key] = val;
        ctx.render();
      },
      toggleAcepta: (ctx) => { ctx.state.user.acepta = !ctx.state.user.acepta; ctx.render(); },
      openPolicy: (ctx) => { ctx.flow.policy = true; ctx.render(); },
      closePolicy: (ctx) => { ctx.flow.policy = false; ctx.render(); },
      acceptPolicy: (ctx) => { ctx.flow.policy = false; ctx.state.user.acepta = true; ctx.render(); },
      continue: (ctx) => {
        if (!allValid(ctx.state.user)) { ctx.flow.tried = true; ctx.render(); return; }
        App.reset('home');
      },
    },
  });

  /* ---------- Home: Productos disponibles ---------- */
  const PRODUCTS = [
    { id: 'recargas', label: 'Recargas', icon: 'cat-recargas', tip: 'Recarga minutos y datos<br>a cualquier operador' },
    { id: 'paquetes', label: 'Paquetes', icon: 'cat-paquetes', tip: 'Compra paquetes de datos,<br>minutos y apps' },
    { id: 'servicios', label: 'Pago de servicios', icon: 'cat-pago-servicios', tip: 'Paga tus facturas de<br>servicios públicos y más' },
    { id: 'pines', label: 'Pines y entretenimiento', icon: 'cat-pines', tip: 'Compra pines de streaming,<br>juegos y licencias' },
    { id: 'efecty', label: 'Giro Efecty', icon: 'cat-efecty', tip: 'Envía efectivo para reclamar<br>en un punto Efecty' },
    { id: 'breb', label: 'Bre-B', icon: 'cat-breb', tip: 'Transfiere al instante<br>a una llave Bre-B' },
  ];

  // id local → id en GET /v1/products (los no listados no existen en la API y se muestran siempre)
  const API_ID = { servicios: 'services', efecty: 'efecty', breb: 'breb' };
  App.data = App.data || {};
  const visibleProducts = () => {
    const list = App.data.products;
    if (!Array.isArray(list)) return PRODUCTS;
    return PRODUCTS.filter(p => {
      const remote = API_ID[p.id] && list.find(r => r && r.id === API_ID[p.id]);
      return !(remote && remote.enabled === false);
    });
  };
  let productsRequested = false;

  App.register('home', {
    render() {
      return `
      <div class="screen home">
        <img class="home__ellipse" src="assets/img/home-ellipse.svg" alt="">
        <div class="home__hero">
          <div class="home__human" aria-hidden="true">
            <img class="home__human-head" src="assets/img/human-head.svg" alt="">
            <img class="home__human-bottom" src="assets/img/human-bottom.svg" alt="">
            <img class="home__human-body" src="assets/img/human-body.svg" alt="">
          </div>
          <h1 class="home__title">Productos disponibles</h1>
        </div>
        <div class="home__main">
          ${ui.logo()}
          <div class="home__grid">
            ${visibleProducts().map(p => `
              <div class="cat-card" role="button" tabindex="0" data-action="open" data-id="${p.id}">
                <span class="cat-card__icon"><img src="assets/icons/${p.icon}.svg" alt="" width="33" height="37"></span>
                <span class="cat-card__label">${p.label}</span>
                <span class="cat-card__tip">${ui.tip(p.tip, { icon: 'alert' })}</span>
              </div>`).join('')}
          </div>
          <div class="footer">${ui.byPuntored()}</div>
        </div>
      </div>`;
    },
    mount(root) {
      if (productsRequested || !App.api || !App.api.products) return;
      productsRequested = true;
      const home = root.querySelector('.home');
      App.api.products().then(res => {
        if (!res || !Array.isArray(res.products)) { productsRequested = false; return; }
        App.data.products = res.products;
        if (home && home.isConnected) App.render(); // sigue siendo la pantalla activa
      }).catch(() => { productsRequested = false; }); // sin backend: tarjetas locales
    },
    actions: {
      open: (ctx, el, e) => {
        if (e.target.closest('.tip')) return;
        App.go(el.dataset.id, {}, { resetFlow: true });
      },
    },
  });
})();
