# API de PayGuard

PayGuard expone una API HTTP para que otros sistemas le manden facturas y el
agente decida: **pagar, frenar o escalar**. Nunca mueve dinero ni ejecuta
pagos; solo decide, lo registra en la auditoría encadenada y lo explica.

Todas las respuestas son JSON. El idioma de las explicaciones se elige con
`?lang=es|en|pt|fr|de|it`. Las rutas que cambian estado (`POST`, `PUT`) piden
`Authorization: Bearer <token>` cuando se arranca con `PAYGUARD_ADMIN_TOKEN`.

## Decidir sobre facturas ya estructuradas — `POST /api/run`

El canal principal para sistemas externos que ya tienen los datos. Cuerpo:

```json
{ "invoices": [
  { "id": "FAC-001", "source": "chat", "counterpartyName": "Proveedor S.A.",
    "counterpartyTaxId": "US-12-3456789", "amount": 1250.00, "currency": "USD",
    "issueDate": "2026-10-01", "dueDate": "2026-10-31", "invoiceNumber": "INV-1",
    "contractRef": "CT-1", "bank": { "accountLast4": "0042" },
    "concept": "Servicios", "confidence": { "amount": 1 }, "rawText": "…" } 
] }
```

Respuesta: una decisión por factura con `outcome` (`PAY` | `HOLD` | `ESCALATE`),
`summary`, las reglas evaluadas y `explanation` en el idioma pedido.

## Subir un documento crudo — `POST /api/upload`

Para PDF, imagen o texto. Desactivado salvo que se arranque con
`PAYGUARD_ALLOW_UPLOAD=1`. Cuerpo: `{ "file": { "name", "mime", "bytes": [] } }`
(`bytes` es el arreglo de octetos). El agente extrae los datos (en modo caché
usa la extracción dorada del set por nombre de archivo), decide y explica.

## Consultar — `GET`

- `GET /api/decisions` y `GET /api/decisions/:id` — decisiones y detalle.
- `GET /api/proposals` — ajustes que el agente sugiere (siempre pendientes de
  aprobación humana).
- `GET /api/audit` y `GET /api/audit/verify` — registro encadenado e integridad.
- `GET /api/metrics` — autonomía, precisión y pagos indebidos.
- `GET /api/health` — estado y banderas (`uploadEnabled`).

## Aprobar o rechazar lo escalado — `POST /api/approvals/:id`

Cuerpo: `{ "action": "approve" | "reject", "approver": "…", "reason": "…" }`.
Una factura frenada (`HOLD`) nunca se puede aprobar (invariante de seguridad).

## Avisar al humano — `POST /api/notify`

Reenvía a canales externos el aviso de lo que el agente frenó o escaló. Nunca
mueve dinero: solo notifica. Apagado salvo `PAYGUARD_ALLOW_NOTIFY=1`. Cuerpo:
`{ "text": "…", "slackWebhook": "https://hooks.slack.com/…", "email": "…" }`.

- **Slack**: solo se aceptan webhooks de `hooks.slack.com` (no se usa como proxy
  a cualquier URL). 
- **Correo**: necesita un relay propio configurado en `PAYGUARD_EMAIL_WEBHOOK`
  (PayGuard hace `POST { to, text }` a esa URL); sin él, el correo queda
  pendiente de proveedor.

Cada reenvío queda registrado en la auditoría con tipo `notify`.

## Corrida diaria — `GET` y `POST /api/daily-run`

La "corrida diaria" revisa qué facturas **tienen pago para hoy** (vencen hoy o
antes, es decir, vencidas y aún pendientes) y las pasa por el motor existente.
**Nunca mueve dinero**: solo decide, registra y explica. La lógica vive en
`src/daily/daily-run.js` (`selectDueInvoices`, `runDailyRun`, `loadDataset`,
`nextDailyRunMs`) y los handlers en `src/api/handlers.js`
(`getDailyRun`, `postDailyRun`); la vista en vivo es `public/corrida.js`.

- `GET /api/daily-run` — vista previa: lista las facturas con pago para hoy, sin
  procesarlas. Admite `?date=YYYY-MM-DD` para fijar otra fecha de referencia.
  Respuesta: `{ date, invoices: [{ id, counterpartyName, amount, currency, dueDate }] }`.
- `POST /api/daily-run` — corre la selección por el motor y devuelve
  `{ date, count, decisions: [...] }` (cada decisión con `outcome`, `summary`,
  `failed` y `explanation`). El cuerpo es opcional: `{ "date"?, "invoices"? }`.
  Si no se pasan `invoices`, usa el set de ejemplo del servidor.

## Eventos en vivo — `GET /api/events`

Flujo **Server-Sent Events** (`text/event-stream`, sin dependencias) para pintar
la corrida en tiempo real. Emite, por factura, `evaluating` (empieza a
evaluarla) y `decided` (`{ invoiceId, outcome, summary, failed, explanation }`),
y en el disparador automático, `run-start` y `run-done`.

## Disparador 07:00 (opcional)

Con `PAYGUARD_DAILY=1`, el servidor programa la corrida diaria a las **07:00** de
la zona horaria de `PAYGUARD_TZ` (o `TZ`, por defecto `UTC`) usando `setTimeout`
nativo (cero dependencias) y se reprograma cada día. `PAYGUARD_DAILY_STEP_MS`
ajusta la pausa entre facturas (visualización; `0` la apaga). Apagado por
defecto y en pruebas. **En producción esto lo haría un cron real** del sistema o
del orquestador; el disparador propio es para la demo.
