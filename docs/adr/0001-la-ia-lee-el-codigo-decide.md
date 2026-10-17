# ADR 0001 · La IA lee, el código decide

**Estado:** aceptado · 2026-10-16

**Contexto:** el reto descalifica si se aprueba un pago indebido. Los LLM pueden equivocarse con confianza y son vulnerables a instrucciones dentro del documento.

**Decisión:** el LLM solo extrae datos. Todas las decisiones salen de reglas deterministas en código, con una política de prioridad fija (HOLD > ESCALATE > PAY) y pruebas de propiedades.

**Consecuencias:** decisiones reproducibles y explicables; la calidad de extracción solo afecta la autonomía (más escalamientos), nunca la seguridad.
