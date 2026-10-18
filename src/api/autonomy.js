// @ts-check
/** Perfiles de autonomía: datos de configuración y handlers de API. */

/** @typedef {import('./state.js').AppState} AppState */
/** @typedef {{ status: number, body: unknown }} ApiResponse */

export const AUTONOMY_PROFILES = /** @type {const} */ ([
  {
    id: 'conservative',
    label: 'Conservador (Recomendado)',
    autonomyPct: 76.6,
    vendors: 8,
    contracts: 8,
    description: 'Configuración actual. 8 proveedores conocidos con contratos activos.'
      + ' Adecuado para empresas en etapa inicial o con proveedores muy estables.',
    dataFile: 'conservative.json',
  },
  {
    id: 'standard',
    label: 'Estándar',
    autonomyPct: 88,
    vendors: 13,
    contracts: 13,
    description: 'Empresa con 2+ años de operación. 13 proveedores en múltiples países y monedas.'
      + ' Las facturas recurrentes de proveedores conocidos se procesan sin intervención humana.',
    dataFile: 'standard.json',
  },
  {
    id: 'mature',
    label: 'Maduro',
    autonomyPct: 90,
    vendors: 18,
    contracts: 17,
    description: 'Ecosistema completo. 18 contrapartes verificadas con cuentas bancarias actualizadas.'
      + ' El historial de pagos reduce al mínimo las alertas de R05.',
    dataFile: 'mature.json',
  },
]);

/** Nota: los % (88%, 90%) son proyecciones para operación diaria real.
 *  El set de evaluación contiene casos extremos deliberados que siempre escalarán. */
export const NOTE_99PCT = [
  '¿Qué se necesita para el 99 % de autonomía?',
  '',
  'El 10 % que siempre requiere un humano corresponde a situaciones donde las reglas'
    + ' no pueden decidir solas:',
  '',
  '• Proveedores desconocidos (R04): factura de proveedor sin historial previo.'
    + ' Solución: onboarding formal antes de la primera factura.',
  '',
  '• Cambio de cuenta bancaria (R05): cuenta diferente a la registrada → posible fraude BEC.'
    + ' Solución: proceso oficial para actualizar cuentas.',
  '',
  '• Límite de aprobación (R09): facturas sobre cierto monto requieren segunda firma.'
    + ' Solución: elevar el umbral (implica mayor riesgo financiero).',
  '',
  '• Datos de pago inválidos (R12): IBAN o BIC malformados.'
    + ' Solución: exigir al proveedor que corrija la factura.',
  '',
  '• Baja confianza OCR (R01): documento ilegible → sin datos completos no hay decisión.'
    + ' Solución: exigir facturas en formato estructurado (XML, PDF/A).',
  '',
  'Relajar cualquiera de estas reglas introduciría riesgo de pagos indebidos o fraude.'
    + ' El sistema decidió que 0 pagos indebidos no es negociable.',
].join('\n');

/** @param {AppState} state @returns {ApiResponse} */
export const getAutonomyProfile = (state) => ({
  status: 200,
  body: {
    current: state.autonomyProfile ?? 'conservative',
    profiles: AUTONOMY_PROFILES,
    note99pct: NOTE_99PCT,
  },
});

/**
 * Cambia el perfil de autonomía y recarga los datos de la empresa.
 * @param {AppState} state
 * @param {{ profile?: string }} input
 * @param {(profileId: string) => import('node:url').URL} profileUrl
 * @returns {Promise<ApiResponse>}
 */
export async function putAutonomyProfile(state, input, profileUrl) {
  const { profile } = input ?? {};
  const valid = AUTONOMY_PROFILES.map((p) => p.id);
  if (!profile || !valid.includes(/** @type {string} */ (profile))) {
    return { status: 400, body: { errors: [`profile debe ser uno de: ${valid.join(', ')}`] } };
  }
  const { readFileSync } = await import('node:fs');
  const company = JSON.parse(readFileSync(profileUrl(profile), 'utf8'));
  state.company = company;
  state.autonomyProfile = profile;
  const { MockAccountSource } = await import('../integrations/blinka/account-source.js');
  state.account = new MockAccountSource(company);
  await state.audit.append({
    type: 'autonomy-profile-changed', actor: 'admin',
    payload: { profile, vendors: company.counterparties?.length ?? 0 },
    at: state.now,
  });
  const meta = AUTONOMY_PROFILES.find((p) => p.id === profile);
  return {
    status: 200,
    body: { ok: true, profile, autonomyPct: meta?.autonomyPct, vendors: meta?.vendors },
  };
}
