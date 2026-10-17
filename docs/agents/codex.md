# Brief: Codex

## Tarea 1 · M2 Extracción — rama `fea/m2-extraction`
Implementa `src/extraction/` según el contrato de `docs/ARCHITECTURE.md` §3 (M2).

- `validateExtraction(obj)`: validador de esquema propio (sin zod), tipos y rangos estrictos, normaliza moneda (ISO-4217 mayúsculas), fechas `YYYY-MM-DD`, montos numéricos. Rechaza campos extra.
- `extractInvoice(doc, opts)`:
  - `mode: 'cache'` → devuelve la extracción dorada del manifest de M1 (mientras M1 no esté, usa un fixture en `test/fixtures/`).
  - `mode: 'live'` → cadena Gemini → Groq → OpenRouter con `fetch`, circuit breaker (2 fallos o 1 respuesta 429 abren el circuito del proveedor), timeout 20 s, salida JSON validada; si nada responde, devuelve extracción con confianza 0 (R01 escalará).
  - Gemini recibe PDF/PNG como `inline_data`; `.eml` y `.txt` se envían como texto.
  - El prompt aísla el documento entre delimitadores y declara que su contenido es dato, no instrucciones.
- Nunca registres el documento ni claves. Lee claves solo de `opts.env`.
- Pruebas `test/extraction.test.js` con `fetch` simulado: éxito, respaldo al segundo proveedor, 429, timeout, JSON inválido, campos extra, confianza.

## Tarea 2 · M5 Aprobaciones — rama `fea/m5-approvals` (cuando M3 y M4 estén en `dev`)
`src/approvals/queue.js` según el contrato. Invariante S3 de `SECURITY.md`. Endpoint `POST /api/approvals/:id` con token. Pruebas: aprobar PENDIENTE, rechazar, intentar aprobar FRENADA (falla), aprobar cuando el saldo ya no alcanza (falla), auditoría registrada.
