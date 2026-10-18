# PayGuard

**El agente de pagos que explica cada decisión.** Reto Blinka: *Agentes que pagan por la empresa* · Hackathon 30X (oct 2026).

PayGuard revisa las facturas de una empresa y decide por ella cuáles **pagar**, cuáles **frenar** y cuáles **escalar** a una persona, sin salirse nunca de las reglas que la empresa define.

> **Principio: la IA lee, el código decide.** El LLM solo extrae los datos de la factura. La decisión la toma un motor de reglas determinista. El agente no tiene ninguna función capaz de mover dinero.

## Documentación

| Documento | Para qué |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Plan de desarrollo y cronograma |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitectura y **contratos entre módulos** |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Requerimientos funcionales, no funcionales, hardware |
| [docs/STACK.md](docs/STACK.md) | Tecnologías, paquetes y herramientas |
| [docs/AI-AND-LEARNING.md](docs/AI-AND-LEARNING.md) | Qué modelo usa el agente y cómo aprende con el uso |
| [docs/VALIDATORS.md](docs/VALIDATORS.md) | Validación de datos de pago e idioma (mundial + regional) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Ramas, versionado, commits, gates |
| [SECURITY.md](SECURITY.md) | Invariantes y políticas de seguridad |
| [AGENTS.md](AGENTS.md) | Instrucciones para los agentes de IA |
| [docs/DEMO.md](docs/DEMO.md) | Guion del video de demostración (3 min) |
| [docs/DOC-RULE.md](docs/DOC-RULE.md) | Regla de documentación viva (obligatoria en cada interacción) |
| [docs/BITACORA.md](docs/BITACORA.md) | Qué dejó hecho cada sesión |
| [docs/adr/](docs/adr/) | Decisiones de arquitectura |

## Estado

| Módulo | Qué hace | Estado |
|---|---|---|
| M0 | Dominio, reglas, guardia de solo lectura, servidor, Docker, gobierno y gates | ✅ |
| M1 | 47 facturas ficticias (PDF, PNG, correo, chat) con decisión esperada | ✅ |
| M2 | Extracción con cadena de LLMs, validación estricta y caché sin conexión | ✅ |
| M3 | Motor de reglas R01–R13 + política + pruebas de propiedades | ✅ |
| M4 | Registro de auditoría encadenado + explicaciones + métricas | ✅ |
| M5 | Cola de aprobación humana + API completa | ✅ |
| M6 | Interfaz: login demo, dashboard, facturas, corrida diaria, API Keys, Swagger y auditoría | ✅ |
| M7 | Evaluación reproducible del set y guion de la demo | ✅ |
| M8 | Validadores regionales: Colombia (NIT, CUFE, IVA, cuadre) | ✅ |
| M9 | Multi-idioma y validadores internacionales (IBAN, BIC, ABA, divisas) | ✅ |
| M10 | Aprendizaje continuo: memoria de casos (RAG) y propuestas con aprobación humana | ✅ |

## Correr

Sin dependencias externas. No necesita `npm install`.

```bash
npm run setup     # activa los git hooks (una vez)

# Local con Node 20+
npm test          # pruebas
npm run check     # calidad + cobertura (lo que exige el pre-commit)
npm run dataset   # regenera data/invoices/ (47 facturas simuladas)
npm run eval      # evalúa el set: seguridad, precisión y autonomía
npm start         # http://localhost:3000

# Local con Docker
docker compose up --build    # http://localhost:3000
```

## Desplegar en Railway

1. En Railway: *New Project → Deploy from GitHub repo* → elegir este repo.
2. Railway detecta `railway.toml` y construye con el `Dockerfile`. El healthcheck es `/api/health`.
3. *Settings → Networking → Generate Domain* para obtener la URL pública.

No requiere variables de entorno: por defecto corre en modo simulado (`PAYGUARD_MODE=mock`).

## Resultados sobre el set (`npm run eval`)

| Métrica | Valor |
|---|---|
| Facturas | 47 (27 pagadas · 9 frenadas · 11 escaladas) |
| **Pagos indebidos** | **0** |
| Precisión contra lo esperado | 100% |
| Autonomía | **76,6 %** — 36/47 resueltas sin intervención humana |
| Requieren humano (ESCALATE) | 23,4 % — 11/47 |
| Cadena de auditoría | íntegra |

> **Lectura honesta de la autonomía:** el 76,6 % significa que en 36 de las 47 facturas el agente decidió solo (PAY o HOLD). Las 11 restantes se escalan porque alguna regla no puede resolverse sin contexto humano (contrato dudoso, beneficiario nuevo, monto límite). Subir la autonomía requiere ampliar la base de contratos y beneficiarios conocidos — no relajar las reglas.

La evaluación corre en CI y **falla el build** si aparece un pago indebido o si la precisión baja del 100%.

## Seguridad por diseño

- `src/integrations/blinka/readonly-guard.js`: solo permite GET/HEAD, bloquea rutas de pagos/transferencias y rechaza claves de producción (`*_live_*`).
- Todos los datos son ficticios (`data/company.json`).

## Auditoría del sistema

La cadena de auditoría completa (todas las decisiones con hash encadenado) está disponible en la instancia de producción:

```
<URL_RAILWAY>/api/audit          # JSON con todas las entradas
<URL_RAILWAY>/api/audit/verify   # verifica la integridad de la cadena
```

> Sustituye `<URL_RAILWAY>` por la URL generada en Railway → *Settings → Networking → Domain*.
> La interfaz visual de auditoría está en la pestaña **Auditoría** de la app.

## Notificaciones en tiempo real (Slack)

Los jueces y evaluadores pueden unirse al workspace de Slack del proyecto para recibir las alertas del agente en tiempo real (facturas frenadas, escaladas, aprobaciones humanas):

👉 **[Unirse al workspace PayGuard en Slack](https://join.slack.com/t/hackathon30x/shared_invite/zt-4dchf24dj-~3cNyZEimfSQ803JrLadyA)**

Cada vez que el agente frena o escala una factura, publica un aviso en el canal `#alertas-agente` con el ID de la factura, el motivo y las reglas que lo activaron.

Para activar las notificaciones en tu propia instancia de Railway, agrega las variables:

```
PAYGUARD_ALLOW_NOTIFY=1
PAYGUARD_SLACK_WEBHOOK=https://hooks.slack.com/services/...
```

## Licencia

MIT
