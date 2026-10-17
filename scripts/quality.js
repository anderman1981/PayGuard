// @ts-check
/**
 * Gate de calidad y seguridad estática. Falla si hay cualquier hallazgo.
 * Uso: npm run quality
 */
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFiles } from './lib/walk.js';
import { CHECKS } from './lib/checks.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Corre todos los chequeos sobre los archivos .js del proyecto.
 * @param {string} root
 * @returns {import('./lib/checks.js').Finding[]}
 */
export function runQuality(root) {
  /** @type {import('./lib/checks.js').Finding[]} */
  const findings = [];
  for (const path of listFiles(root, ['.js'])) {
    const text = readFileSync(path, 'utf8');
    const file = { path, rel: relative(root, path), text, lines: text.split('\n') };
    for (const check of CHECKS) findings.push(...check.run(file));
  }
  findings.push(...checkModulesHaveTests(root));
  return findings;
}

/**
 * Cada módulo de src/ debe ser importado por al menos un archivo de test/.
 * @param {string} root
 * @returns {import('./lib/checks.js').Finding[]}
 */
function checkModulesHaveTests(root) {
  const tests = listFiles(`${root}test`, ['.js']).map((p) => readFileSync(p, 'utf8')).join('\n');
  return listFiles(`${root}src`, ['.js'])
    .map((p) => relative(root, p))
    .filter((rel) => !tests.includes(rel.replace(/^src\//, '')))
    .map((rel) => ({ rule: 'modulo-sin-test', rel, line: 1, message: 'ningún test importa este módulo' }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const findings = runQuality(ROOT);
  for (const f of findings) process.stdout.write(`✗ ${f.rel}:${f.line}  [${f.rule}] ${f.message}\n`);
  const total = CHECKS.length + 1;
  process.stdout.write(findings.length === 0
    ? `✓ calidad: ${total} chequeos, 0 hallazgos\n`
    : `\n${findings.length} hallazgo(s). Corrige antes de hacer commit.\n`);
  process.exit(findings.length === 0 ? 0 : 1);
}
