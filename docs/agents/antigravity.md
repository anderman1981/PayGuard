# Brief: Antigravity (agy)

## M6 Interfaz — rama `fea/m6-ui`
Construye `public/` (HTML + CSS + JS de módulos, **sin build ni dependencias**) contra la API de `docs/ARCHITECTURE.md` §3. Mientras los endpoints no existan, usa `public/mock-api.js` con respuestas de ejemplo que cumplan el contrato, desactivable con `?mock=0`.

**Estilo:** inspirado en el lenguaje visual de la app de Blinka (barra lateral fija, fondo `#f4f5f7`, paneles blancos con radio grande, botones tipo píldora índigo `#4338ca`, tablas limpias con filas redondeadas, tipografía de sistema, modo oscuro `#0f1013`). **No uses su logo, nombre ni marca**: la app se llama PayGuard y dice "Prototipo para el reto Blinka".

**Pantallas:**
1. *Resumen*: tarjetas Pagadas / Frenadas / Pendientes con total en USD, métricas de autonomía y seguridad, botón "Procesar facturas".
2. *Facturas*: tabla con búsqueda y filtros por estado; fila → panel lateral con documento, datos extraídos, resultado de cada regla (verde/ámbar/rojo) y explicación en español.
3. *Aprobaciones*: cola de pendientes, aprobar/rechazar con nombre y motivo obligatorios.
4. *Reglas*: formulario de `RulesConfig` con validación en vivo; guardar → reprocesar.
5. *Auditoría*: registro cronológico y botón "Verificar integridad".
6. *Subir factura*: solo visible si `/api/health` indica `uploadEnabled: true`.

**Calidad:** responsive desde 375 px, contraste AA, foco visible y navegación por teclado, sin `innerHTML` con datos (usa `textContent`/`createElement`), respeta la CSP (`default-src 'self'`: nada inline, nada de CDNs). Pruebas de la lógica pura de la UI en `test/ui.test.js`.
