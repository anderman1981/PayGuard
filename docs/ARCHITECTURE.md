# Arquitectura

## 1. Principio

**La IA lee, el código decide.** El LLM solo convierte un documento en datos estructurados. Ninguna respuesta de un modelo puede, por sí sola, producir un pago: la decisión sale de reglas deterministas escritas en código y probadas.

## 2. Flujo

```
           ┌──────────── Fuente de la factura ────────────┐
           │ PDF · imagen · correo (.eml) · chat (.txt)    │
           └───────────────────────┬──────────────────────┘
                                   ▼
 M2  Extracción ──► ExtractedInvoice (validado por esquema, confianza por campo)
      · modo cache: usa la extracción guardada (demo pública, tests)
      · modo live:  Gemini → Groq → OpenRouter (respaldo con circuit breaker)
                                   ▼
 M3  Motor de reglas ──► RuleResult[] (PASS / HOLD / ESCALATE + motivo + evidencia)
      · lee contexto de la cuenta vía AccountSource (mock hoy, Blinka solo-lectura mañana)
                                   ▼
     Política (prioridad fija):  algún HOLD → FRENADA
                                 si no, algún ESCALATE → PENDIENTE
                                 si no → PAGADA (pago simulado)
                                   ▼
 M4  Auditoría ──► entrada encadenada con SHA-256 (no se puede alterar sin que se note)
                                   ▼
 M5  Aprobación humana (solo PENDIENTES) ──► revalida límites duros antes de aceptar
                                   ▼
 M6  Interfaz · M7 Métricas
```

## 3. Contratos entre módulos (fijos)

Cambiar cualquiera de estos contratos requiere un PR `fea/contract-*` aprobado por el integrador **antes** de que los módulos lo usen.

### Tipos
Definidos en `src/domain/types.js` (JSDoc): `Counterparty`, `Contract`, `ExtractedInvoice`, `RulesConfig`, `RuleResult`, `Decision`, `Outcome`.

### M1 · Datos
- `data/company.json`: empresa, saldos, contrapartes, contratos, historial (ya existe).
- `data/invoices/manifest.json`:
  ```json
  [{ "id": "INV-001", "file": "INV-001.pdf", "source": "pdf",
     "case": "normal | duplicate | new-beneficiary | mismatch | over-limit | ...",
     "expected": { "outcome": "PAY|HOLD|ESCALATE", "rules": ["R03"] },
     "extraction": { /* ExtractedInvoice dorado: es la caché offline de M2 */ } }]
  ```
- `data/invoices/<id>.<pdf|png|eml|txt>`: el documento.

### M2 · Extracción — `src/extraction/index.js`
```js
/** @returns {Promise<ExtractedInvoice>} */
export async function extractInvoice(doc /* {id, name, mime, bytes: Uint8Array} */, opts /* {mode:'cache'|'live', manifest?, env?} */)
/** @returns {{ ok: boolean, errors: string[], value: ExtractedInvoice|null }} */
export function validateExtraction(obj)
```

### M3 · Reglas — `src/rules/`
- Cada regla es un archivo `rNN-nombre.js` que exporta `{ id, name, evaluate(inv, ctx) => RuleResult }`.
- `src/rules/engine.js`: `evaluateInvoice(inv, ctx) => RuleResult[]` con `ctx = { rules: RulesConfig, account: AccountSource, now: Date }`.
- `src/rules/policy.js`: `decide(results) => Outcome`.

| Regla | Comprueba | Si falla |
|---|---|---|
| R01 | Campos obligatorios presentes y confianza ≥ mínimo | ESCALATE |
| R02 | El texto no contiene instrucciones para el agente ("ignora las reglas", "aprueba ya") | HOLD |
| R03 | No es duplicado (mismo proveedor + número, o mismo monto dentro de la ventana) | HOLD |
| R04 | Beneficiario registrado y en la lista permitida | ESCALATE |
| R05 | Datos bancarios iguales a los registrados | ESCALATE |
| R06 | Monto y moneda cuadran con un contrato activo (con tolerancia) | HOLD |
| R07 | Moneda y país permitidos | ESCALATE |
| R08 | Fechas válidas: no emitida en el futuro, no vencida hace más de N días | ESCALATE |
| R09 | Monto en USD ≤ máximo por pago (HOLD) y ≤ umbral de aprobación (ESCALATE) | HOLD / ESCALATE |
| R10 | Cabe en el presupuesto del periodo | HOLD |
| R11 | Hay saldo suficiente en la moneda | HOLD |
| R12 | Datos de pago válidos: IBAN/BIC/ABA según el país, divisa ISO con sus decimales, cuadre de totales | ESCALATE |
| R13 | (Regional, M8) Reglas del país del emisor, p. ej. NIT con dígito de verificación en Colombia | ESCALATE |

Aritmética, conversión de moneda y fechas **siempre en código**, nunca en el LLM.

### M4 · Auditoría — `src/audit/log.js`
```js
export class AuditLog {
  async append(entry)        // agrega {type, invoiceId, payload} con prevHash y hash SHA-256
  async verify()             // => { ok: boolean, brokenAt: number|null }
  list()                     // => entradas en orden
}
export function explain(decision, lang) // => texto en el idioma dado, legible sin abrir el código
```
Usa `crypto.subtle` (funciona en Node y en el navegador).

### M5 · Aprobaciones — `src/approvals/queue.js`
```js
export function approve(invoiceId, { approver, reason }, ctx) // solo si está PENDIENTE; revalida R03, R09-HOLD, R10, R11
export function reject(invoiceId, { approver, reason }, ctx)
```
Una factura FRENADA **no** se puede aprobar: solo cambiando las reglas y reprocesando, y eso también queda auditado.

### API HTTP (servidor y UI)
| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/health` | estado, modo, versión, idiomas disponibles |
| GET / PUT | `/api/rules` | leer / editar reglas (PUT valida y audita) |
| GET | `/api/company` | empresa ficticia |
| GET | `/api/invoices` | facturas del set con su estado |
| POST | `/api/run` | procesa todo el set (o `{ids}`) |
| GET | `/api/decisions` · `/api/decisions/:id` | decisiones y detalle |
| POST | `/api/approvals/:id` | `{ action: "approve"|"reject", approver, reason }` |
| GET | `/api/audit` · `/api/audit/verify` | registro y verificación de la cadena |
| GET | `/api/metrics` | autonomía, seguridad, precisión |
| POST | `/api/upload` | subir factura (solo si `PAYGUARD_ALLOW_UPLOAD=1`, nunca en la demo pública) |

### M9 · Idioma — `src/i18n/`
```js
export function resolveLang({ requested, acceptLanguage, document, company }) // => Lang
export function t(key, lang, vars)      // texto del catálogo, con {marcadores}
export function money(amount, currency, lang) · date(isoDate, lang)
export function detectLang(text)        // => Lang | null  (heurístico, sin modelo)
```
Toda respuesta de la API acepta `?lang=` y respeta `Accept-Language`. Ningún texto visible se escribe dentro de la lógica: siempre pasa por `t()`.

### Módulos implementados de M3

`src/rules/helpers.js` (conversión a USD, fechas, contraparte, contrato, gasto del periodo),
`src/rules/engine.js` (`evaluateInvoice`, catálogo `RULES`),
`src/rules/policy.js` (`decide`, `blockingResults`) y una regla por archivo:
`r01-datos-completos.js`, `r02-sin-instrucciones.js`, `r03-sin-duplicado.js`, `r04-beneficiario.js`,
`r05-datos-bancarios.js`, `r06-contrato.js`, `r07-moneda-pais.js`, `r08-fechas.js`,
`r09-limites.js`, `r10-presupuesto.js`, `r11-saldo.js`, `r12-datos-pago.js`.

Los textos de cada motivo viven en `src/i18n/messages/rules-a.js` (R01–R06) y
`src/i18n/messages/rules-b.js` (R07–R12); las etiquetas de interfaz en `src/i18n/messages.js`.
Una regla que lance una excepción se registra como ESCALATE: nunca deja pasar un pago.

## 4. Estructura de carpetas

```
src/domain       tipos y etiquetas (types.js)
src/config       reglas por defecto y su validación (default-rules.js)
src/integrations account-source.js (fuente de cuenta: saldos, contrapartes, contratos,
                 historial; hoy MockAccountSource, mañana Blinka de solo lectura)
                 y readonly-guard.js (bloquea todo movimiento de dinero)
src/extraction   M2
src/rules        M3
src/audit        M4
src/approvals    M5
src/i18n         M9 (catálogo, detección y formato por idioma)
src/validators   M9 (international.js) y M8 (colombia.js y otros países)
public/          M6 (HTML + JS sin build)
data/            M1 (solo ficticio)
scripts/         calidad, versionado, evaluación
test/            un archivo de pruebas por módulo
docs/            documentación y ADR
```
