# Brief: Claude

## Rol de integrador
Revisa cada PR contra contratos, seguridad y gates; mergea a `dev`; promueve `dev → staging → main`; etiqueta versiones.

## Tarea 1 · M3 Motor de reglas — rama `fea/m3-rules-engine`
R01–R11 según la tabla de `docs/ARCHITECTURE.md` (R12 la aporta M8), `engine.js` y `policy.js`. Conversión a USD con `fxToUSD`, fechas y aritmética en código. Pruebas por regla (pasa, falla, bordes) y prueba de propiedades de la invariante S2 con ≥ 1.000 casos.

## Tarea 2 · M4 Auditoría — rama `fea/m4-audit-log`
`AuditLog` con cadena SHA-256 (`crypto.subtle`), `verify()`, y `explain(decision)` en español. Endpoints `/api/run`, `/api/decisions`, `/api/audit`, `/api/audit/verify`, cabeceras de seguridad y token de administración.
