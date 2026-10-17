// @ts-check
/**
 * R02 · El contenido de la factura es dato, no instrucción.
 * Frena cualquier documento que intente dar órdenes al sistema (invariante S5).
 */
import { PASS } from './helpers.js';

/** Patrones en los idiomas soportados. Se comparan sobre el texto sin tildes. */
const INJECTION = [
  /ignor\w*\s+(las\s+)?(reglas|instrucciones|lo anterior)/i,
  /ignore\s+(all\s+|the\s+|previous\s+)?(rules|instructions)/i,
  /(aprueba|approve|pague|pay)\s+(este|this|automaticamente|automatically|inmediatamente|now)/i,
  /(sin|no)\s+(aprobacion|approval|revision|review)/i,
  /(eres|you are|actua como|act as)\s+(un |an |a )?(agente|assistant|system|administrador|admin)/i,
  /(system|assistant|developer)\s*(prompt|message|instruction)/i,
  /(salta|skip|omite|bypass|disable|desactiva)\s+\w*\s*(validacion|validation|control|limite|limit|regla|rule)/i,
];

/** @type {import('./helpers.js').Rule} */
export const r02 = {
  id: 'R02',
  nameKey: 'r02.name',
  evaluate(inv) {
    const text = (inv.rawText ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '');
    for (const pattern of INJECTION) {
      const found = pattern.exec(text);
      if (found) {
        return {
          verdict: 'HOLD',
          messageKey: 'r02.fail',
          vars: { match: found[0].slice(0, 80) },
          evidence: { pattern: String(pattern), match: found[0].slice(0, 160) },
        };
      }
    }
    return PASS;
  },
};
