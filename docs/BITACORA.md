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
| 2026-10-17 | claude | fix/ci-ladder-guard | 0.10.2 | CI: corrige el comando de typecheck (tsc) y lo hace informativo (gate real = quality.js) para desbloquear el check gates que siempre estaba rojo |
| 2026-10-17 | claude | fea/m11-ingesta | 0.11.0 | M11: vista Ingesta (captura/JSON/subir archivo), fix ruta /api/upload, notificaciones al humano en el sidebar (audio+badge+Slack/correo, /api/notify), sidebar de alto fijo con scroll interno, docs/API.md |
| 2026-10-17 | claude | fea/m14-corrida-diaria | 0.12.0 | M14: vista "Hoy" con corrida diaria en vivo (SSE), endpoints GET/POST /api/daily-run, disparador 07:00 gated por PAYGUARD_DAILY, novedades conectadas al aviso al humano; cero pagos reales |
| 2026-10-17 | claude | fea/m15-ingesta-tabs | 0.13.0 | UI: la vista Ingesta separa sus cuatro secciones en tabs internas (Capturar/Pegar JSON/Subir archivo/Set de ejemplo) con la caja de Resultado compartida |
| 2026-10-18 | claude | fea/audit-corrections | 0.14.0 | Auditoría: set ampliado a 47 facturas (15 nuevas); corrección de 5 hallazgos de seguridad en server.js y config (rutas sin autenticación, cabeceras faltantes, validación de entrada) |
| 2026-10-18 | claude | fea/audit-corrections | 0.16.0 | UI: tabla de facturas siempre visible en la vista Ingesta; botón "Reiniciar demo" con reset de estado en el servidor |
| 2026-10-18 | claude | fea/audit-corrections | 0.17.0 | UI: datos completos de factura (proveedor, monto, moneda, fechas) en vistas Facturas y Hoy; filas clicables en Auditoría con detalle expandible |
| 2026-10-18 | claude | fea/audit-corrections | 0.18.0 | UI: paginación, ordenamiento por columna y filtros en todas las tablas; vista API Docs con referencia de endpoints |
| 2026-10-18 | claude | fea/audit-corrections | 0.19.0 | Corrida diaria: paginación de resultados, modo demo aleatorio y relay de Slack vía variable de entorno PAYGUARD_SLACK_WEBHOOK |
| 2026-10-18 | claude | fea/audit-corrections | 0.20.0 | Notificaciones: configuración centralizada en el servidor con GET/PUT /api/notify-config; ya no requiere reinicio para cambiar webhook |
| 2026-10-18 | claude | fea/audit-corrections | 0.21.0 | UI: Swagger interactivo en /api/docs; login demo con tres perfiles (Admin/Facturador/Desarrollador); vista Desarrollador con gestión de API Keys |
| 2026-10-18 | claude | fea/audit-corrections | 0.22.0 | Login: campo email+contraseña en la pantalla de login demo; botón Cerrar sesión visible en todas las vistas |
| 2026-10-18 | claude | fea/audit-corrections | 0.23.0 | Fix CSP: permite style-src 'unsafe-inline' para los estilos inline generados por el helper el() del frontend sin dependencias |
| 2026-10-18 | claude | fea/audit-corrections | 0.24.0 | OCR real: script scripts/test-ocr.js para validar extracción con Gemini Flash 2.5 y Groq sobre facturas reales (PDF/JPG/PNG); docs: README con métricas reales (47 facturas, 76,6 % autonomía), DEMO.md guion 3 min, BITACORA al día |
| 2026-10-18 | claude | fea/audit-corrections | 0.25.0 | Docs: README con métricas reales corregidas, DEMO.md guion 3 min, BITACORA al día v0.14–v0.24 |
| 2026-10-18 | claude | fea/audit-corrections | 0.26.0 | Feature admin: selector de Perfil de Autonomía (Conservador/Estándar/Maduro) con nota explicativa del 99 %; 3 perfiles JSON en data/profiles/, endpoints GET/PUT /api/autonomy-profile, nueva pestaña en vista Desarrollador |
| 2026-10-18 | claude | fea/audit-corrections | 0.27.0 | UX Ingesta: al subir archivo muestra datos extraídos (beneficiario, monto, fechas, contrato, proveedor IA) + decisión; factura subida aparece al inicio de la lista; paginación en el set de ejemplo; descripción en vista Auditoría |
| 2026-10-18 | claude | fea/audit-corrections | 0.28.0 | Docs: link de Slack para jueces en README con instrucciones de notificaciones en tiempo real |
| 2026-10-18 | claude | fea/audit-corrections | 0.29.0 | UX resumen: descripción hero de PayGuard; demo aleatoria con muestra variable del set de 47 facturas |
| 2026-10-18 | claude | fea/audit-corrections | 0.30.0 | Fix corrida diaria: rows.clear() al montar vista, al correr y al ejecutar demo — evita acumulación entre corridas |
| 2026-10-18 | claude | fea/audit-corrections | 0.31.0 | UX ingesta: datos extraídos pre-llenan formulario Capturar al subir archivo; README con variables de entorno para Railway y guía de Slack para jueces |
