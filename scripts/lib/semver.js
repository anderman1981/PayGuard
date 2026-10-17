// @ts-check
/** Lógica pura de versionado. Ver CONTRIBUTING.md §2. */

/** @typedef {{ major: number, minor: number, patch: number }} Version */

/** @param {string} s @returns {Version} */
export function parse(s) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(s.trim());
  if (!m) throw new Error(`versión inválida: "${s}" (se espera MAYOR.MENOR.PARCHE)`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/** @param {Version} v */
export const format = (v) => `${v.major}.${v.minor}.${v.patch}`;

/**
 * @param {Version} v
 * @param {'fix'|'fea'|'major'} kind
 * @returns {Version}
 */
export function bump(v, kind) {
  if (kind === 'fix') return { ...v, patch: v.patch + 1 };
  if (kind === 'fea') return { major: v.major, minor: v.minor + 1, patch: 0 };
  if (kind === 'major') return { major: v.major + 1, minor: 0, patch: 0 };
  throw new Error(`tipo de versión inválido: "${kind}" (fix | fea | major)`);
}

/** @param {Version} a @param {Version} b @returns {number} negativo si a < b */
export const compare = (a, b) => a.major - b.major || a.minor - b.minor || a.patch - b.patch;

/**
 * Versión mostrada según la rama.
 * @param {string} base  ej. "1.4.0"
 * @param {string} branch
 * @param {{ commits?: number, sha?: string, rc?: number }} [info]
 */
export function display(base, branch, info = {}) {
  const { commits = 0, sha = '', rc = 1 } = info;
  const meta = sha ? `+${sha}` : '';
  if (branch === 'main') return base;
  if (branch === 'staging') return `${base}-rc.${rc}${meta}`;
  if (branch === 'dev') return `${base}-dev.${commits}${meta}`;
  const slug = branch.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return `${base}-${slug}.${commits}${meta}`;
}

/**
 * Tipo de bump que corresponde a una rama.
 * @param {string} branch
 * @returns {'fix'|'fea'|null} null si la rama no debe subir versión
 */
export function kindForBranch(branch) {
  if (branch.startsWith('fix/')) return 'fix';
  if (branch.startsWith('fea/')) return 'fea';
  return null;
}
