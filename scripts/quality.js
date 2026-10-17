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
  findings.push(...checkModulesAreDocumented(root));
  return findings;
}

/**
 * Cada módulo de src/ tiene que ser alcanzable desde las pruebas: importado por
 * un test, o importado por otro módulo que ya lo esté (cobertura transitiva).
 * @param {string} root
 * @returns {import('./lib/checks.js').Finding[]}
 */
function checkModulesHaveTests(root) {
  const tests = listFiles(`${root}test`, ['.js']).map((p) => readFileSync(p, 'utf8')).join('\n');
  const modules = listFiles(`${root}src`, ['.js']).map((p) => ({ rel: relative(root, p), text: readFileSync(p, 'utf8') }));
  const basename = (/** @type {string} */ rel) => rel.split('/').pop() ?? rel;
  const reached = new Set(modules.filter((m) => tests.includes(m.rel.replace(/^src\//, ''))).map((m) => m.rel));
  for (let changed = true; changed;) {
    changed = false;
    for (const from of modules.filter((m) => reached.has(m.rel))) {
      for (const to of modules.filter((m) => !reached.has(m.rel))) {
        if (from.text.includes(`/${basename(to.rel)}'`) || from.text.includes(`./${basename(to.rel)}"`)) {
          reached.add(to.rel);
          changed = true;
        }
      }
    }
  }
  return modules
    .filter((m) => !reached.has(m.rel))
    .map(({ rel }) => ({ rule: 'modulo-sin-test', rel, line: 1, message: 'ningún test lo alcanza, ni directa ni indirectamente' }));
}

/**
 * Documentación viva (docs/DOC-RULE.md): cada módulo de src/ se nombra en algún
 * documento del repositorio, para que nadie tenga que leer el código para saber qué hay.
 * @param {string} root
 * @returns {import('./lib/checks.js').Finding[]}
 */
function checkModulesAreDocumented(root) {
  const docs = [...listFiles(`${root}docs`, ['.md']), `${root}README.md`, `${root}AGENTS.md`]
    .map((p) => readFileSync(p, 'utf8')).join('\n');
  return listFiles(`${root}src`, ['.js'])
    .map((p) => relative(root, p))
    .filter((rel) => !docs.includes(rel) && !docs.includes(rel.split('/').pop() ?? rel))
    .map((rel) => ({ rule: 'modulo-sin-doc', rel, line: 1, message: 'ningún documento lo menciona (docs/DOC-RULE.md)' }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const findings = runQuality(ROOT);
  for (const f of findings) process.stdout.write(`✗ ${f.rel}:${f.line}  [${f.rule}] ${f.message}\n`);
  const total = CHECKS.length + 2;
  process.stdout.write(findings.length === 0
    ? `✓ calidad: ${total} chequeos, 0 hallazgos\n`
    : `\n${findings.length} hallazgo(s). Corrige antes de hacer commit.\n`);
  process.exit(findings.length === 0 ? 0 : 1);
}
