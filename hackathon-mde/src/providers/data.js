// Catálogo SIMULADO de facturadores. Datos inventados para la demo; no son facturas reales.
export const BILLERS = [
  { id: 'epm', name: 'EPM — Servicios públicos', category: 'utilities' },
  { id: 'codensa', name: 'Enel Colombia — Energía', category: 'utilities' },
  { id: 'acueducto', name: 'Acueducto de Bogotá', category: 'utilities' },
  { id: 'admin-edificio', name: 'Administración de conjunto residencial', category: 'housing' },
  { id: 'colegio', name: 'Pensión de colegio', category: 'education' },
  { id: 'soat', name: 'SOAT', category: 'insurance' },
  { id: 'claro', name: 'Recarga celular Claro', category: 'topup' }
]
export const INVOICES = {
  'epm:12345678': { holder: 'María E. Restrepo', concept: 'Factura marzo 2026', amountCOP: 184_500, dueDate: '2026-10-25' },
  'admin-edificio:apto-502': { holder: 'María E. Restrepo', concept: 'Cuota administración octubre', amountCOP: 320_000, dueDate: '2026-10-20' },
  'colegio:EST-0091': { holder: 'Colegio San José', concept: 'Pensión octubre', amountCOP: 410_000, dueDate: '2026-10-30' },
  'soat:ABC123': { holder: 'Vehículo ABC123', concept: 'SOAT anual', amountCOP: 262_000, dueDate: '2026-11-05' },
  'claro:3001234567': { holder: '300 123 4567', concept: 'Recarga', amountCOP: 20_000, dueDate: null }
}
