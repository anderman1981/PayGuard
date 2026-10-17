# ADR 0004 · Aprendizaje por memoria de casos, con aprobación humana

**Estado:** aceptado · 2026-10-17

**Contexto:** queremos que el sistema mejore con el uso hasta rozar el 99,9% de acierto, sin perder la garantía de cero pagos indebidos ni la explicabilidad.

**Alternativas descartadas:**
- Afinar un modelo con las decisiones pasadas: no es auditable, no se puede explicar caso por caso y un dato envenenado se vuelve comportamiento permanente.
- Dejar que el sistema ajuste sus propios umbrales: cualquier error de aprendizaje se convierte en un pago indebido.

**Decisión:** memoria de casos consultada por similitud (RAG) que alimenta tres cosas: ejemplos para el extractor, una señal de riesgo que **solo puede escalar**, y propuestas de ajuste que **una persona aprueba**. Los vectores se calculan con un método propio sin dependencias; Ollama o Gemini son opcionales.

**Consecuencias:** la autonomía sube con el uso y la seguridad no baja nunca. Cada mejora queda como regla o umbral explícito, probado, auditable y reversible. A cambio, el aprendizaje es más lento que un ajuste automático: es el precio de poder explicar cada decisión.
