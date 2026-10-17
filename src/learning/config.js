// @ts-check
/**
 * Parámetros del consejero. Están aquí, y no dentro de la lógica, para poder
 * ajustarlos y probarlos sin tocar el código que los usa.
 */
export const ADVISOR_DEFAULTS = {
  /** Cuántos casos parecidos se consultan. */
  k: 5,
  /** Similitud mínima para considerar que dos casos se parecen (0 a 1). */
  minSimilarity: 0.6,
  /** Casos resueltos por una persona que hacen falta para hacer caso a la señal. */
  minEvidence: 3,
  /** Proporción de rechazos a partir de la cual conviene escalar. */
  rejectionThreshold: 0.5,
  /** Máximo de proveedores sugeridos como ejemplo al extractor. */
  maxHints: 3,
  /** Aprobaciones seguidas que hacen falta para proponer un ajuste de reglas. */
  minProposalEvidence: 3,
};
