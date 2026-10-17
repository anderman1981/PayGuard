# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado según CONTRIBUTING.md §2.

## [Unreleased]

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
