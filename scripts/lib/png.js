// @ts-check
/**
 * Escritor de PNG en escala de grises, sin dependencias (usa node:zlib).
 * Dibuja líneas de texto con la fuente 5x7: suficiente para simular la foto
 * o el escaneo de una factura.
 */
import { deflateSync } from 'node:zlib';
import { glyph, GLYPH_WIDTH, GLYPH_HEIGHT } from './font5x7.js';

const SCALE = 2;
const MARGIN = 12;
const LINE_GAP = 6;

/** CRC-32, requerido por el formato PNG. */
function crc32(/** @type {Buffer} */ buf) {
  let c = 0xffffffff;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** @param {string} type @param {Buffer} data */
function chunk(type, data) {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, crc]);
}

/**
 * Renderiza líneas de texto como PNG en escala de grises.
 * @param {string[]} lines
 * @returns {Buffer}
 */
export function renderPng(lines) {
  const cols = Math.max(20, ...lines.map((l) => l.length));
  const width = MARGIN * 2 + cols * (GLYPH_WIDTH + 1) * SCALE;
  const lineHeight = GLYPH_HEIGHT * SCALE + LINE_GAP;
  const height = MARGIN * 2 + lines.length * lineHeight;
  const pixels = Buffer.alloc(width * height, 0xff);

  lines.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      const rows = glyph(ch);
      for (let y = 0; y < GLYPH_HEIGHT; y += 1) {
        for (let x = 0; x < GLYPH_WIDTH; x += 1) {
          if (!((rows[y] >> (GLYPH_WIDTH - 1 - x)) & 1)) continue;
          const px0 = MARGIN + col * (GLYPH_WIDTH + 1) * SCALE + x * SCALE;
          const py0 = MARGIN + row * lineHeight + y * SCALE;
          for (let dy = 0; dy < SCALE; dy += 1) {
            for (let dx = 0; dx < SCALE; dx += 1) pixels[(py0 + dy) * width + px0 + dx] = 0x14;
          }
        }
      }
    });
  });

  // Cada fila del PNG va precedida por su byte de filtro (0 = ninguno).
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width + 1)] = 0;
    pixels.copy(raw, y * (width + 1) + 1, y * width, (y + 1) * width);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bits por muestra
  ihdr[9] = 0;   // escala de grises
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
