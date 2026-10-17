# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado según CONTRIBUTING.md §2.

## [Unreleased]

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
