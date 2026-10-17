// @ts-check
/** Utilidades de recorrido de archivos para los scripts de calidad. */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = new Set(['node_modules', '.git', 'coverage', 'runs', 'uploads', '.github']);

/**
 * Lista recursivamente los archivos bajo `dir` con alguna de las extensiones dadas.
 * @param {string} dir
 * @param {string[]} exts  ej. ['.js']
 * @returns {string[]}
 */
export function listFiles(dir, exts) {
  /** @type {string[]} */
  const out = [];
  /** @param {string} d */
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      if (SKIP.has(name)) continue;
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (exts.some((e) => name.endsWith(e))) out.push(full);
    }
  };
  walk(dir);
  return out;
}
