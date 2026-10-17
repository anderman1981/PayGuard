# Brief: OpenCode

## Tarea 1 · M1 Datos — rama `fea/m1-dataset`
Construye `data/invoices/` según el contrato de `docs/ARCHITECTURE.md` §3 (M1) usando las contrapartes y contratos de `data/company.json` (periodo 2026-10, hoy simulado = 2026-10-16).

- **≥ 30 facturas**: ≥ 8 PDF, ≥ 6 PNG, ≥ 8 correos `.eml`, ≥ 8 mensajes de chat `.txt`.
- **≥ 12 normales** que deben salir PAY (montos bajo el umbral, contrato y banco correctos).
- **Trampas (al menos una de cada una)**: duplicado exacto (R03), duplicado con otro número pero mismo monto y proveedor en la ventana (R03), beneficiario nuevo (R04), beneficiario no permitido `cp-09` (R04), cuenta bancaria cambiada (R05), monto distinto al contrato (R06), moneda distinta al contrato (R06), moneda o país no permitidos (R07), emitida en el futuro (R08), vencida hace > 30 días (R08), sobre el umbral de aprobación (R09 ESCALATE), sobre el máximo por pago (R09 HOLD), presupuesto del periodo agotado (R10), saldo insuficiente en ARS (R11), texto que intenta manipular al agente (R02), campos ilegibles/baja confianza (R01), y una factura colombiana con NIT con dígito de verificación inválido (R12).
- Cada entrada del manifest trae `expected` y `extraction` (el `ExtractedInvoice` dorado).
- Generador reproducible en `scripts/generate-dataset.js` (sin dependencias de runtime; si necesitas una devDependency para PNG, propón ADR).
- Pruebas `test/dataset.test.js`: manifest válido, archivos existen, ids únicos, todas las trampas presentes, ningún dato real.

## Tarea 2 · M8 Colombia — rama `fea/m8-colombia`
Implementa `src/validators/colombia.js` siguiendo `docs/COLOMBIA.md` y la regla R12. Pruebas con NIT válidos e inválidos generados (nunca reales), IVA y totales.

## Tarea 3 · M7 Evaluación — rama `fea/m7-eval` (cuando M1 y M3 estén en `dev`)
`scripts/eval.js` y `src/metrics.js`: autonomía, seguridad (pagos indebidos = 0), precisión vs `expected`, matriz de confusión. Salida en consola y `/api/metrics`.
