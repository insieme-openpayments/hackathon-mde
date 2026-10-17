/* Cliente del integration-backend (dummy): catálogo de servicios y validación de referencias.
 * Base configurable con ?api=http://host:puerto. Si el servidor no responde, las pantallas
 * usan los datos locales de respaldo (ver servicios.js).
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

  App.api = {
    config,
    ApiError,
    catalog: () => request('/v1/catalog'),
    validateService: (companyId, reference) =>
      request('/v1/services/validate', { method: 'POST', body: { company_id: companyId, reference } }),
  };
})();
