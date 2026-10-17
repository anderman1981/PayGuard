# Bitácora

Una línea por sesión de trabajo. Ver [DOC-RULE.md](DOC-RULE.md).

| Fecha | Agente | Rama | Versión | Qué quedó hecho |
|---|---|---|---|---|
| 2026-10-16 | claude | dev | 0.1.0 | M0: dominio, reglas configurables, guardia de solo lectura, servidor, Docker, Railway, gobierno y gates |
| 2026-10-17 | claude | fea/m9-i18n | 0.2.0 | M9: multi-idioma (6 idiomas) y validadores internacionales (IBAN, BIC, ABA, divisas, totales) |
| 2026-10-17 | claude | fea/m3-rules-engine | 0.3.0 | M3: reglas R01–R12, motor, política y pruebas de propiedades (2.500 casos) |
| 2026-10-17 | claude | fea/m10-learning | 0.4.0 | M10: memoria de casos (RAG sin dependencias), consejero que solo puede escalar y propuestas de ajuste con aprobación humana; se define la cadena de modelos |
| 2026-10-17 | claude | fea/m4-audit-log | 0.5.0 | M4 y M5: auditoría encadenada, explicaciones multi-idioma, agente, métricas, cola de aprobación y API completa |
| 2026-10-17 | claude | fea/m1-dataset | 0.6.0 | M1: 32 facturas simuladas en 4 formatos reales (PDF y PNG escritos sin dependencias), manifiesto con decisión esperada y extracción dorada; el agente acierta el 100% del set |
| 2026-10-17 | claude | fea/m2-extraction | 0.7.0 | M2: validador estricto de la salida del modelo, instrucción a prueba de manipulación, cadena de cuatro proveedores con interruptor y modo caché |
| 2026-10-17 | claude | fea/m6-ui | 0.8.0 | M6: interfaz completa de cinco vistas, sin build ni dependencias, verificada en navegador real con el set de 32 facturas |
| 2026-10-17 | claude | fea/m8-colombia | 0.9.0 | M8: regla R13 con validadores de Colombia (NIT con dígito de verificación, CUFE, IVA y cuadre); NIT ficticios corregidos para que sean coherentes |
| 2026-10-17 | claude | fea/m9-upload | 0.11.0 | RF-09: endpoint POST /api/upload para subir factura real; validación PAYGUARD_ALLOW_UPLOAD=1; procesamiento en memoria con motor de reglas y explicación |
| 2026-10-17 | claude | fix/m9-upload | 0.10.1 | RF-09: arregla el handler getProposals faltante y el postUpload roto (variable file inexistente, extractInvoice sin importar, factura iterada como arreglo); se agregan pruebas de upload |
| 2026-10-17 | claude | fix/ci-ladder-guard | 0.10.2 | CI: guardián de escalera de ramas (main←staging, staging←dev, dev←fea/fix) que rechaza PRs con origen incorrecto |
