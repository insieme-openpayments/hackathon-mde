/* Cliente del integration-backend: descubrimiento de productos (/v1/products), pago de servicios
 * (catálogo, empresas, validación, pago, estado), Giro Efecty y Transferencia Bre-B.
 * Base configurable con ?api=http://host:puerto. Si el servidor no responde, las pantallas
 * usan los datos locales de respaldo (ver servicios.js).
 * Errores: ApiError(status, detail). detail es el texto en español del servidor (string); si llega
 * un array/objeto (validación pydantic) o es un error de red, detail es null y el flujo muestra
 * un mensaje genérico (ver App.api.errorMessage).
 */
(function () {
  const qs = new URLSearchParams(location.search);
  const config = {
    base: (qs.get('api') || 'http://localhost:8000').replace(/\/$/, ''),
    key: 'insieme-dev-key', // API key de demo (X-API-Key)
    timeoutMs: 6000,
  };

  /** Error HTTP del servidor (status + detail); los errores de red no traen status */
  class ApiError extends Error {
    constructor(status, detail) { super(detail || `HTTP ${status}`); this.status = status; this.detail = detail; }
  }

  const request = async (path, { method = 'GET', body } = {}) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), config.timeoutMs);
    try {
      const res = await fetch(config.base + path, {
        method,
        headers: { 'X-API-Key': config.key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(res.status, typeof data.detail === 'string' ? data.detail : null);
      return data;
    } finally {
      clearTimeout(t);
    }
  };

  const post = (path, body) => request(path, { method: 'POST', body });
  const enc = encodeURIComponent;

  /** Query string omitiendo undefined/null/'' */
  const query = (params = {}) => {
    const u = new URLSearchParams();
    Object.keys(params).forEach((k) => {
      const v = params[k];
      if (v !== undefined && v !== null && v !== '') u.append(k, String(v));
    });
    const s = u.toString();
    return s ? '?' + s : '';
  };

  let productsPromise = null;

  App.api = {
    config,
    ApiError,
    /** e.detail si es un string no vacío; si no, el mensaje genérico del flujo */
    errorMessage: (e, fallback) =>
      (e && typeof e.detail === 'string' && e.detail.trim() ? e.detail : fallback),
    /** GET /v1/products se comparte entre Home, Efecty y Bre-B (una sola petición por carga). */
    products: () => {
      if (!productsPromise) {
        productsPromise = request('/v1/products').catch((e) => { productsPromise = null; throw e; });
      }
      return productsPromise;
    },
    // Pago de servicios
    catalog: () => request('/v1/catalog'),
    companies: (params) => request('/v1/catalog/companies' + query(params)),
    validateService: (companyId, reference) =>
      post('/v1/services/validate', { company_id: companyId, reference }),
    payService: (body) => post('/v1/services/pay', body),
    serviceTransaction: (id) => request('/v1/services/transactions/' + enc(id)),
    // Giro Efecty
    efectyQuote: (body) => post('/v1/efecty/quote', body),
    efectySend: (body) => post('/v1/efecty/transfers', body),
    efectyGet: (id) => request('/v1/efecty/transfers/' + enc(id)),
    // Transferencia Bre-B
    brebResolve: (key) => post('/v1/breb/keys/resolve', { key }),
    brebSend: (body) => post('/v1/breb/transfers', body),
    brebGet: (id) => request('/v1/breb/transfers/' + enc(id)),
  };
})();
