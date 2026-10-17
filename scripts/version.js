// @ts-check
/**
 * Versionado del proyecto.
 *   node scripts/version.js show            muestra la versión de la rama actual
 *   node scripts/version.js bump fix|fea|major
 *   node scripts/version.js check           verifica que la rama subió versión
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse, format, bump, compare, display, kindForBranch } from './lib/semver.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const VERSION_FILE = `${ROOT}VERSION`;

/** @param {string[]} args @returns {string} */
function git(args) {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return ''; }
}

const readBase = () => readFileSync(VERSION_FILE, 'utf8').trim();

function show() {
  const branch = git(['branch', '--show-current']) || 'dev';
  const commits = Number(git(['rev-list', '--count', 'HEAD']) || 0);
  const sha = git(['rev-parse', '--short', 'HEAD']);
  return display(readBase(), branch, { commits, sha });
}

/** @param {'fix'|'fea'|'major'} kind */
function doBump(kind) {
  const next = format(bump(parse(readBase()), kind));
  writeFileSync(VERSION_FILE, `${next}\n`);
  return next;
}

/** Verifica que la rama actual subió la versión respecto a su base. @returns {string[]} errores */
function check() {
  const branch = git(['branch', '--show-current']);
  const kind = kindForBranch(branch);
  if (!kind) return [];
  const baseRef = git(['show', 'origin/dev:VERSION']) || git(['show', 'dev:VERSION']);
  if (!baseRef) return [];
  const current = parse(readBase());
  const previous = parse(baseRef);
  if (compare(current, previous) <= 0) {
    return [`la rama ${branch} no subió la versión (${format(previous)} → ${format(current)}); corre: npm run version:bump -- ${kind}`];
  }
  const expected = format(bump(previous, kind));
  if (format(current) !== expected && kind === 'fix') {
    return [`rama fix/* debe subir solo el parche: se esperaba ${expected}, hay ${format(current)}`];
  }
  return [];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, arg] = process.argv.slice(2);
  try {
    if (cmd === 'show') process.stdout.write(`${show()}\n`);
    else if (cmd === 'bump') process.stdout.write(`VERSION → ${doBump(/** @type {any} */ (arg))}\n`);
    else if (cmd === 'check') {
      const errors = check();
      errors.forEach((e) => process.stdout.write(`✗ ${e}\n`));
      if (errors.length) process.exit(1);
      process.stdout.write('✓ versión correcta para la rama\n');
    } else {
      process.stdout.write('uso: version.js show | bump <fix|fea|major> | check\n');
      process.exit(1);
    }
  } catch (err) {
    process.stdout.write(`✗ ${/** @type {Error} */ (err).message}\n`);
    process.exit(1);
  }
}

export { show, check };
