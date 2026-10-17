# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado según CONTRIBUTING.md §2.

## [Unreleased]

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
