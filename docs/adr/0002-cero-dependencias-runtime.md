# ADR 0002 · JavaScript sin dependencias de runtime

**Estado:** aceptado · 2026-10-16 (reemplaza la propuesta inicial de Next.js + zod)

**Contexto:** plazo de ~40 h, despliegue en Railway con 0,5 GB, seguridad de cadena de suministro, y el mismo motor debe correr en Node y en el navegador.

**Decisión:** ESM + JSDoc con `// @ts-check`, `node:http`, `node:test`, `crypto.subtle`. Tooling solo como devDependency con versión exacta.

**Consecuencias:** sin build, arranque inmediato, superficie mínima. Validación de esquema y servidor se escriben a mano (con pruebas).
