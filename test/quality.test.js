import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { CHECKS, MAX_LINES, MAX_LINE_LENGTH } from '../scripts/lib/checks.js';
import { runQuality } from '../scripts/quality.js';
import { parse, format, bump, compare, display, kindForBranch } from '../scripts/lib/semver.js';
import { OUTCOME_LABEL_ES } from '../src/domain/types.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
/** @param {string[]} lines */
const file = (lines, rel = 'src/x.js') => ({ path: rel, rel, text: ['// @ts-check', ...lines].join('\n'), lines });
const run = (id, f) => CHECKS.find((c) => c.id === id).run(f);

test('el propio repo pasa el gate de calidad', () => {
  assert.deepEqual(runQuality(ROOT), []);
});

test('chequeo ts-check', () => {
  assert.equal(run('ts-check', { rel: 'src/a.js', path: 'a', text: 'const a = 1;', lines: ['const a = 1;'] }).length, 1);
  assert.equal(run('ts-check', { rel: 'src/a.js', path: 'a', text: '// @ts-check\nconst a = 1;', lines: [] }).length, 0);
  assert.equal(run('ts-check', { rel: 'test/a.js', path: 'a', text: 'const a = 1;', lines: [] }).length, 0);
});

test('chequeo de marcadores pendientes', () => {
  assert.equal(run('no-pendientes', file([`// ${'TO'}${'DO'} revisar`])).length, 1);
  assert.equal(run('no-pendientes', file([`// ${'FIX'}${'ME'}`])).length, 1);
  assert.equal(run('no-pendientes', file(['// todos los casos'])).length, 0);
});

test('chequeos de console y eval', () => {
  assert.equal(run('no-console', file(['console.log(1);'])).length, 1);
  assert.equal(run('no-console', file(['console.log(1);'], 'scripts/x.js')).length, 0);
  assert.equal(run('no-eval', file([`${'ev'}${'al'}("1");`])).length, 1);
  assert.equal(run('no-eval', file([`new ${'Func'}${'tion'}("1");`])).length, 1);
});

test('chequeo de secretos cubre los proveedores del proyecto', () => {
  const samples = ['AIza' + 'A'.repeat(35), 'sk-' + 'b'.repeat(32), 'gsk_' + 'c'.repeat(32),
    'sk-or-v1-' + 'd'.repeat(32), 'lsv2_pt_' + 'e'.repeat(32), 'blk_live_' + 'f'.repeat(32), 'ghp_' + 'g'.repeat(36)];
  for (const s of samples) assert.equal(run('no-secretos', file([`const k = "${s}";`])).length >= 1, true, s);
  assert.equal(run('no-secretos', file(['const k = process.env.GEMINI_API_KEY;'])).length, 0);
});

test('chequeos de tamaño (clean code)', () => {
  assert.equal(run('tamano-archivo', file(Array(MAX_LINES + 1).fill('const a = 1;'))).length, 1);
  assert.equal(run('tamano-archivo', file(['const a = 1;'])).length, 0);
  assert.equal(run('largo-linea', file(['a'.repeat(MAX_LINE_LENGTH + 1)])).length, 1);
});

test('semver: parse, format y bump por tipo de rama', () => {
  assert.deepEqual(parse('1.4.2'), { major: 1, minor: 4, patch: 2 });
  assert.throws(() => parse('1.4'), /versión inválida/);
  assert.equal(format(bump(parse('1.4.2'), 'fix')), '1.4.3');
  assert.equal(format(bump(parse('1.4.2'), 'fea')), '1.5.0');
  assert.equal(format(bump(parse('1.4.2'), 'major')), '2.0.0');
  assert.throws(() => bump(parse('1.0.0'), /** @type {any} */ ('otro')), /tipo de versión inválido/);
});

test('semver: comparación y versión mostrada por rama', () => {
  assert.ok(compare(parse('1.5.0'), parse('1.4.9')) > 0);
  assert.equal(compare(parse('1.0.0'), parse('1.0.0')), 0);
  assert.equal(display('1.4.0', 'main'), '1.4.0');
  assert.equal(display('1.4.0', 'staging', { rc: 2 }), '1.4.0-rc.2');
  assert.equal(display('1.4.0', 'dev', { commits: 12, sha: 'a1b2c3d' }), '1.4.0-dev.12+a1b2c3d');
  assert.equal(display('1.4.0', 'fea/m3-rules', { commits: 3 }), '1.4.0-fea-m3-rules.3');
});

test('semver: tipo de bump según la rama', () => {
  assert.equal(kindForBranch('fix/algo'), 'fix');
  assert.equal(kindForBranch('fea/m3'), 'fea');
  assert.equal(kindForBranch('dev'), null);
});

test('dominio: etiquetas de resultado en español', () => {
  assert.deepEqual(Object.keys(OUTCOME_LABEL_ES).sort(), ['ESCALATE', 'HOLD', 'PAY']);
  assert.equal(OUTCOME_LABEL_ES.PAY, 'Pagada');
});
