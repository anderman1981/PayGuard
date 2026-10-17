// @ts-check
/**
 * Reglas del gate de calidad. Cada chequeo recibe {path, rel, text, lines}
 * y devuelve una lista de hallazgos (vacía = todo bien).
 * Ver CONTRIBUTING.md §5.
 *
 * @typedef {{ path: string, rel: string, text: string, lines: string[] }} FileInfo
 * @typedef {{ rule: string, rel: string, line: number, message: string }} Finding
 * @typedef {{ id: string, describe: string, run: (f: FileInfo) => Finding[] }} Check
 */

export const MAX_LINES = 400;
export const MAX_LINE_LENGTH = 140;

/** Marcadores de trabajo pendiente, armados en ejecución para que este archivo no se señale a sí mismo. */
const PENDING_RE = new RegExp(`\\b(${['TO', 'FIX', 'HA', 'XX'].map((p, i) => p + ['DO', 'ME', 'CK', 'X'][i]).join('|')})\\b`);

/** @type {{re: RegExp, name: string}[]} */
const SECRET_PATTERNS = [
  { re: /AIza[0-9A-Za-z_-]{30,}/, name: 'clave de Google' },
  { re: /sk-[A-Za-z0-9]{20,}/, name: 'clave de OpenAI' },
  { re: /sk-ant-[A-Za-z0-9_-]{20,}/, name: 'clave de Anthropic' },
  { re: /gsk_[A-Za-z0-9]{20,}/, name: 'clave de Groq' },
  { re: /sk-or-v1-[A-Za-z0-9]{20,}/, name: 'clave de OpenRouter' },
  { re: /lsv2_[a-z]{2}_[A-Za-z0-9]{20,}/, name: 'clave de LangSmith' },
  { re: /blk_(live|test)_[A-Za-z0-9_-]{20,}/, name: 'clave de Blinka' },
  { re: /gh[pousr]_[A-Za-z0-9]{30,}/, name: 'token de GitHub' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, name: 'llave privada' },
];

/** @param {string} rule @param {FileInfo} f @param {number} i @param {string} message @returns {Finding} */
const at = (rule, f, i, message) => ({ rule, rel: f.rel, line: i + 1, message });

/** @type {Check[]} */
export const CHECKS = [
  {
    id: 'ts-check',
    describe: 'todo archivo de src/ y scripts/ empieza con // @ts-check',
    run: (f) => (/^(src|scripts)\//.test(f.rel) && !/^\/\/ @ts-check/m.test(f.text)
      ? [at('ts-check', f, 0, 'falta la directiva // @ts-check')] : []),
  },
  {
    id: 'no-pendientes',
    describe: 'sin marcadores de trabajo pendiente (0 deuda técnica)',
    run: (f) => f.lines.flatMap((l, i) => (PENDING_RE.test(l)
      ? [at('no-pendientes', f, i, 'marcador de trabajo pendiente')] : [])),
  },
  {
    id: 'no-console',
    describe: 'sin console.* en src/ (los scripts y el arranque sí pueden)',
    run: (f) => (f.rel.startsWith('src/')
      ? f.lines.flatMap((l, i) => (/\bconsole\.\w+\(/.test(l) ? [at('no-console', f, i, 'console en src/')] : []))
      : []),
  },
  {
    id: 'no-eval',
    describe: 'sin eval ni new Function',
    run: (f) => f.lines.flatMap((l, i) => (/\beval\s*\(|new\s+Function\s*\(/.test(l)
      ? [at('no-eval', f, i, 'ejecución dinámica de código')] : [])),
  },
  {
    id: 'no-secretos',
    describe: 'sin claves con forma de credencial',
    run: (f) => f.lines.flatMap((l, i) => SECRET_PATTERNS
      .filter((p) => p.re.test(l))
      .map((p) => at('no-secretos', f, i, `posible ${p.name}`))),
  },
  {
    id: 'tamano-archivo',
    describe: `archivos de máximo ${MAX_LINES} líneas (clean code)`,
    run: (f) => (f.lines.length > MAX_LINES
      ? [at('tamano-archivo', f, f.lines.length - 1, `${f.lines.length} líneas (máximo ${MAX_LINES})`)] : []),
  },
  {
    id: 'largo-linea',
    describe: `líneas de máximo ${MAX_LINE_LENGTH} caracteres`,
    run: (f) => f.lines.flatMap((l, i) => (l.length > MAX_LINE_LENGTH
      ? [at('largo-linea', f, i, `${l.length} caracteres`)] : [])),
  },
];
