// @ts-check
/**
 * Escritor de PDF mínimo pero válido, sin dependencias: una página de texto.
 * Suficiente para generar facturas simuladas legibles por un lector de PDF y
 * por los extractores de texto.
 */

/** Escapa los caracteres que tienen significado dentro de una cadena PDF. */
const escape = (/** @type {string} */ s) => s.replace(/([\\()])/g, '\\$1');

/**
 * Convierte a Latin-1 lo que el PDF básico puede mostrar (WinAnsi).
 * @param {string} s
 */
const latin1 = (s) => s.normalize('NFC').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');

/**
 * Construye un PDF de una página con las líneas dadas.
 * @param {string[]} lines
 * @param {{ title?: string, fontSize?: number }} [opts]
 * @returns {Buffer}
 */
export function renderPdf(lines, { title = 'Factura', fontSize = 11 } = {}) {
  const leading = Math.round(fontSize * 1.6);
  const text = [
    'BT', `/F1 ${fontSize} Tf`, `${leading} TL`, '56 760 Td',
    ...lines.map((l) => `(${escape(latin1(l))}) Tj T*`),
    'ET',
  ].join('\n');

  /** @type {string[]} */
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] '
      + '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(text, 'latin1')} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Title (${escape(latin1(title))}) /Producer (PayGuard) >>`,
  ];

  let body = '%PDF-1.4\n';
  /** @type {number[]} */
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(body, 'latin1'));
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefAt = Buffer.byteLength(body, 'latin1');
  const xref = [
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`,
    ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`),
  ].join('');
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\n`
    + `startxref\n${xrefAt}\n%%EOF\n`;

  return Buffer.from(body + xref + trailer, 'latin1');
}
