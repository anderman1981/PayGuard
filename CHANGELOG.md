# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado según CONTRIBUTING.md §2.

## [Unreleased]
### Added
- M11 Ingesta: nueva vista "Ingesta" en la UI para que entren facturas al agente — captura manual con formulario, pegar JSON (una o varias) y subir un archivo (PDF/imagen/texto, con `PAYGUARD_ALLOW_UPLOAD=1`), más la lista del set de ejemplo con su estado. Helpers puros `buildManualInvoice`, `parseInvoicesJson`, `parseMoney` en `public/lib.js`.
- M11 Notificaciones: aviso al humano dentro del sidebar (debajo del menú), con scroll y destacado, de las facturas que el agente NO paga (frenadas) o escala; suma sonido, contador en la pestaña del navegador y configuración de canal de Slack (webhook) y correo. Nuevo endpoint `POST /api/notify` (+ handler `postNotify`), apagado salvo `PAYGUARD_ALLOW_NOTIFY=1`, que solo acepta webhooks de `hooks.slack.com` y registra cada reenvío en la auditoría (tipo `notify`).
- `docs/API.md`: contrato de la API para sistemas externos (`/api/run`, `/api/upload`, `/api/notify`, consultas y aprobaciones).
- UI: `public/ingesta.js` y `public/notify.js`; el sidebar ahora es de alto fijo y el scroll vive en el contenedor derecho y en la sección de avisos.

### Fixed
- La ruta `POST /api/upload` era inalcanzable: el 404 genérico de `/api/` estaba antes en el router; ahora responde el handler (403 si la subida está desactivada).

### Added
- CI: job `ladder` que hace cumplir la escalera de ramas en cada PR — `main` solo recibe de `staging`, `staging` solo de `dev`, `dev` solo de `fea/*` o `fix/*`; rechaza el PR si el origen no corresponde.

### Fixed
- CI: el step `Tipos` nunca pasaba porque `npm run typecheck` invocaba `npx typescript` (binario inexistente; el binario es `tsc`); se corrige a `npx -p typescript@5.9.2 tsc`. Como el chequeo `tsc` completo exige `@types/node` (choca con la política 0-dependencias) se marca el step como informativo (`continue-on-error`); el gate real de tipos sigue siendo el `ts-check` de `quality.js`. Esto desbloquea el check requerido `gates`, que antes siempre quedaba rojo.

### Fixed
- RF-09: se implementa el handler `getProposals` que faltaba en `src/api/handlers.js`; `server.js` y las pruebas ya lo invocaban y rompían el arranque de `/api/proposals` y la suite.
- RF-09: `postUpload` dejaba de funcionar por una variable `file` inexistente (el parámetro era `fileDoc`), por no importar `extractInvoice` y por iterar la factura única como si fuera un arreglo; ahora extrae, evalúa y registra la factura correctamente y valida que el payload traiga un archivo.
- Pruebas: `test/api.test.js` cubre `getProposals` y los tres caminos de `postUpload` (desactivado, payload inválido y procesamiento en caché).

## [0.11.0] - 2026-10-17
### Added
- RF-09: endpoint `POST /api/upload` para subir una factura real de cualquier país; solo activo con `PAYGUARD_ALLOW_UPLOAD=1`
- RF-09: procesamiento en memoria — la factura se extrae y evalúa sin persistir en disco
- RF-09: decisión explicable vía `explain()` en el idioma solicitado; incluye regla, resultado, motivo y evidencia
- RF-09: la factura se registra en el estado pero no se guarda en el repositorio ni en la auditoría como entrada permanente

### Changed
- `src/api/handlers.js`: nuevo handler `postUpload` que orquesta la extracción M2, el motor M3 y la política M5
- `server.js`: nueva ruta `POST /api/upload` integrada en el router

## [0.10.0] - 2026-10-17
### Added
- M7: `npm run eval` evalúa el set completo — seguridad, precisión, autonomía, matriz de confusión y reglas más frecuentes — y falla si aparece un pago indebido, si la precisión baja del 100% o si la auditoría no verifica.
- M7: la evaluación corre en el CI, así una regresión rompe el build y no la demo.
- `docs/DEMO.md`: guion del video de 2 min 30 s, con lo que se muestra y lo que no se debe decir.
### Changed
- README publica los resultados actuales del set: 0 pagos indebidos, 100% de precisión y 65,6% de autonomía.

## [0.9.0] - 2026-10-17
### Added
- M8: regla R13, que aplica las reglas del país que emite la factura; se elige por la contraparte registrada o por la forma del identificador fiscal.
- M8: validadores de Colombia — dígito de verificación del NIT (algoritmo de la DIAN), formato del CUFE, tarifas de IVA (0%, 5%, 19%) y cuadre de totales con retenciones.
### Fixed
- Los NIT de la empresa ficticia tenían dígitos de verificación inventados; ahora son coherentes con el algoritmo, y el caso trampa de NIT inválido lo es de verdad.

## [0.8.0] - 2026-10-17
### Added
- M6: interfaz con cinco vistas (Resumen, Facturas, Aprobaciones, Reglas, Auditoría), selector de idioma y botón para procesar el lote.
- M6: tabla de facturas con búsqueda y filtro, y panel de detalle con el resultado de cada regla, la explicación y el documento leído.
- M6: aprobar o rechazar desde la pantalla, editar las reglas y verificar la integridad de la cadena de auditoría.
- Lógica pura de la interfaz en `public/lib.js`, con pruebas propias.
### Security
- La interfaz no usa marcado dinámico ni scripts en línea; se verifica con pruebas, de modo que la CSP `default-src 'self'` se cumple sin excepciones.

## [0.7.0] - 2026-10-17
### Added
- M2: `validateExtraction` rechaza campos desconocidos, exige fecha ISO, divisa ISO-4217 y monto numérico, y normaliza lo que varía entre modelos.
- M2: `parseAmount` interpreta montos en cualquier convención de separadores ("1.234,56", "1,234.56", "2.800").
- M2: instrucción que declara el documento como dato y prohíbe obedecerlo, inventar o hacer cuentas.
- M2: cadena Gemini → Groq → OpenRouter → Ollama con interruptor (dos fallos, o uno si es cuota) y tiempo de espera; los documentos binarios solo van a proveedores que leen imágenes.
- M2: modo caché que usa la extracción dorada del set, para que la demo pública y las pruebas no llamen a ningún modelo.
- Si ningún proveedor responde, la extracción sale con confianza 0 y R01 escala: nunca se paga a ciegas.

## [0.6.0] - 2026-10-17
### Added
- M1: set de 32 facturas ficticias en PDF, PNG, correo y chat, con 21 tipos de caso (12 normales y 20 trampas) y la decisión esperada de cada una.
- `scripts/lib/pdf.js` y `scripts/lib/png.js`: escritores de PDF y PNG sin dependencias (PNG con fuente de mapa de bits propia).
- `npm run dataset` regenera el set de forma reproducible.
- Prueba del set: el agente acierta el 100% de las decisiones esperadas, cada trampa la marca su regla, cero pagos inseguros y la auditoría del lote verifica.
### Changed
- Presupuesto del periodo por defecto: 45.000 → 48.000 USD, para que el caso de presupuesto agotado sea el último del lote y no afecte a los demás.
- R06 ya no frena cuando el monto es ilegible: ese caso lo escala R01, que es quien puede juzgarlo.

## [0.5.0] - 2026-10-17
### Added
- M4: registro de auditoría encadenado con SHA-256; alterar o borrar una entrada rompe `verify()`.
- M4: explicaciones legibles re-traducibles a cualquier idioma (cada resultado guarda su clave de mensaje, no solo el texto).
- `src/agent.js`: procesa una factura de punta a punta (reglas, consejo, política, pago simulado, auditoría y memoria de casos).
- `src/metrics.js`: autonomía, precisión, pagos inseguros y diferencias contra lo esperado.
- M5: cola de aprobación humana; una factura frenada no se puede aprobar y al aprobar se revalidan duplicado, presupuesto y saldo.
- API completa: `/api/run`, `/api/decisions`, `/api/approvals/:id`, `/api/audit`, `/api/audit/verify`, `/api/metrics`, `/api/proposals`.
- Cabeceras de seguridad en toda respuesta y token de administración para las operaciones que cambian estado.
### Fixed
- El texto canónico de la auditoría ahora ordena claves a cualquier profundidad: antes una alteración dentro del payload no rompía la cadena.

## [0.4.0] - 2026-10-17
### Added
- M10: memoria de casos (RAG) sin dependencias — vectores deterministas, `CaseStore` con resolución humana y búsqueda por similitud.
- M10: consejero que aporta ejemplos al extractor, una señal de riesgo que solo puede escalar, y propuestas de ajuste que nacen pendientes de aprobación humana.
- `docs/AI-AND-LEARNING.md`: cadena de modelos (Gemini 2.5 Flash → Groq → OpenRouter → Ollama → caché) y camino al 99,9% de acierto.
- ADR 0004: por qué el aprendizaje es memoria de casos con aprobación humana y no un modelo afinado.

## [0.3.0] - 2026-10-17
### Added
- M3: motor de reglas con R01 a R12 (datos completos, instrucciones ocultas, duplicados, beneficiario, datos bancarios, contrato, moneda y país, fechas, límites, presupuesto, saldo y datos de pago internacionales), una regla por archivo.
- M3: política de decisión con prioridad fija (HOLD > ESCALATE > PAY) y pruebas de propiedades sobre 2.500 casos; una regla que lance excepción escala, nunca paga.
- Regla de documentación viva (`docs/DOC-RULE.md`) y bitácora de sesiones (`docs/BITACORA.md`), obligatorias para personas y agentes.
- Gate `modulo-sin-doc`: falla si un módulo de `src/` no se menciona en ningún documento.
### Changed
- El gate `modulo-sin-test` ahora reconoce cobertura transitiva por imports.
- Catálogo de mensajes dividido en interfaz y reglas (`src/i18n/messages/rules-a.js`, `rules-b.js`).

## [0.2.0] - 2026-10-17
### Added
- M9: soporte multi-idioma (es, en, pt, fr, de, it) con catálogo central, detección del idioma de la factura sin modelo, y formato de montos y fechas por idioma.
- M9: validadores internacionales — IBAN (módulo 97), BIC/SWIFT, ABA routing, divisas ISO-4217 con sus decimales (JPY, KWD), fechas ISO reales y cuadre de totales a escala de la divisa.
### Changed
- Las facturas pueden ser de cualquier país: `docs/COLOMBIA.md` pasa a `docs/VALIDATORS.md` con capa internacional + capa regional.
- Nuevos requerimientos RF-10 a RF-12 y RNF-09; reglas R12 (datos de pago) y R13 (regional).

## [0.1.0] - 2026-10-16
### Added
- M0: modelo de dominio, reglas configurables con validación, guardia de solo lectura (bloquea movimiento de dinero y claves live), fuente de cuenta simulada, empresa ficticia.
- Servidor HTTP sin dependencias con cabeceras de seguridad, Dockerfile, docker-compose y configuración de Railway.
- Gobierno del proyecto: plan, arquitectura y contratos, requerimientos, stack, política de seguridad, reglas de contribución, instrucciones para agentes, ADR 0001–0003.
- Gates de calidad, versionado automático, git hooks y CI.
