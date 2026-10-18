# PayGuard — Video Script (3 min)
**Hackathon Blinka 30X · Anderson Martinez Restrepo**

> **Cómo usar este guion con la extensión Claude en Chrome:**
> 1. Abre Railway (la URL de producción) en Chrome
> 2. Abre la extensión → pega este archivo como contexto
> 3. Pide: *"Toma un screenshot de esta pantalla y descríbela para el video"*
> 4. Navega escena por escena siguiendo las instrucciones de PANTALLA
> 5. Exporta los screenshots → ensambla en CapCut / iMovie
> 6. Agrega la narración con una IA de voz (ver sección al final)

---

## ESCENA 1 — El problema `[0:00 – 0:25]`

### PANTALLA
- Pantalla de login de PayGuard abierta en Railway
- Mostrar las 3 tarjetas de perfil: Admin · Facturador · Desarrollador

### NARRACIÓN
> Un pago indebido puede costar más que todo el proceso de aprobación.
> PayGuard es un agente de IA que valida cada factura antes de que se autorice el pago.
> Sin intervención humana para las facturas limpias. Con escalamiento inmediato para las que no lo son.

---

## ESCENA 2 — Dashboard y motor de reglas `[0:25 – 1:00]`

### PANTALLA
1. Login con perfil **Admin** → `admin@payguard.demo` / `admin1234`
2. Vista **Inicio** — mostrar los 4 tiles: Total · PAY · ESCALATE · HOLD
3. Navegar a **Reglas** — mostrar la lista R01–R13

### NARRACIÓN
> El agente aplica 13 reglas en cadena: verifica que los datos estén completos,
> que no haya instrucciones maliciosas, que no sea un duplicado,
> que el beneficiario sea conocido, que la cuenta bancaria no haya cambiado,
> que exista contrato, que la moneda y el país estén permitidos,
> que las fechas sean válidas y que el monto no supere el presupuesto ni el saldo.
> La prioridad es clara: HOLD gana sobre ESCALATE, ESCALATE gana sobre PAY.
> El agente nunca paga si alguna regla no pasa.

---

## ESCENA 3 — OCR de factura real `[1:00 – 1:40]`

### PANTALLA
1. Navegar a **Ingesta** → tab **Subir archivo**
2. Arrastrar un PDF de factura real al dropzone
3. Mostrar el resultado: campos extraídos + barra de confianza por campo
4. Mostrar la decisión final: PAY / ESCALATE / HOLD con explicación de regla

### NARRACIÓN
> Cualquier PDF o imagen se procesa con visión de Gemini Flash 2.5.
> El modelo extrae número de factura, proveedor, monto, moneda, fechas y concepto,
> y le asigna una confianza por campo.
> Si Gemini falla, el sistema cae automáticamente a Groq o a OpenRouter —
> sin interrumpir el flujo y sin dependencias de librerías externas.

---

## ESCENA 4 — Corrida diaria en tiempo real `[1:40 – 2:15]`

### PANTALLA
1. Navegar a **Hoy** — mostrar tabla de facturas que vencen hoy
2. Clic en **Ejecutar corrida**
3. Ver las filas cambiar de estado en tiempo real: ✓ PAY · ⚠ ESCALATE · ✗ HOLD
4. *(Opcional para jueces técnicos)* Abrir DevTools → Network → mostrar stream `/api/events`

### NARRACIÓN
> Cada día a las 7 AM el agente procesa todas las facturas que vencen ese día.
> Los eventos llegan en tiempo real vía Server-Sent Events.
> El equipo financiero ve el estado de cada factura en el momento exacto en que el agente decide.

---

## ESCENA 5 — Auditoría y API Keys `[2:15 – 2:40]`

### PANTALLA
1. Navegar a **Auditoría** — mostrar tabla con decisiones y hash de cada entrada
2. Clic en **Verificar integridad** → badge verde ✓
3. Login con perfil **Desarrollador** → navegar a **API Keys** → crear nueva clave

### NARRACIÓN
> Cada decisión queda en una cadena de integridad verificable:
> el hash de cada registro incluye el hash del anterior.
> Y cualquier sistema ERP puede conectarse via API Key con el rol que necesite.

---

## ESCENA 6 — Cierre `[2:40 – 3:00]`

### PANTALLA
- Dashboard Admin con métricas finales: autonomía, cero pagos inseguros
- Texto en pantalla: **"La IA lee — el código decide."**

### NARRACIÓN
> PayGuard corre con cero dependencias de producción. Solo Node.js nativo.
> 177 pruebas. Cobertura del 97%. Cero pagos indebidos.
> La IA lee. El código decide.

---

## HERRAMIENTAS DE VOZ — IA gratuita para narrar

| Herramienta | Gratis | Idioma | Link |
|---|---|---|---|
| **ElevenLabs** | 10.000 chars/mes | ES ✓ | elevenlabs.io |
| **TTSMaker** | Ilimitado | ES ✓ | ttsmaker.com |
| **Murf.ai** | 10 min/mes | ES ✓ | murf.ai |
| **Fish Audio** | Créditos gratis | ES ✓ | fish.audio |
| **Kokoro TTS** | Open source, local | ES ✓ | GitHub: hexgrad/kokoro |

> **Flujo recomendado:**
> 1. Copia el texto de cada sección NARRACIÓN
> 2. Pégalo en **TTSMaker** (completamente gratis, sin registro)
> 3. Elige una voz en español — *es-CO* o *es-MX* para el acento
> 4. Descarga el MP3
> 5. Ensambla en CapCut: video (screenshots) + audio (narración)

---

## TEXTO COMPLETO PARA VOZ (copia y pega todo de una vez)

Un pago indebido puede costar más que todo el proceso de aprobación.
PayGuard es un agente de IA que valida cada factura antes de que se autorice el pago.
Sin intervención humana para las facturas limpias. Con escalamiento inmediato para las que no lo son.

El agente aplica 13 reglas en cadena: verifica que los datos estén completos,
que no haya instrucciones maliciosas, que no sea un duplicado,
que el beneficiario sea conocido, que la cuenta bancaria no haya cambiado,
que exista contrato, que la moneda y el país estén permitidos,
que las fechas sean válidas y que el monto no supere el presupuesto ni el saldo.
La prioridad es clara: HOLD gana sobre ESCALATE, ESCALATE gana sobre PAY.
El agente nunca paga si alguna regla no pasa.

Cualquier PDF o imagen se procesa con visión de Gemini Flash 2.5.
El modelo extrae número de factura, proveedor, monto, moneda, fechas y concepto,
y le asigna una confianza por campo.
Si Gemini falla, el sistema cae automáticamente a Groq o a OpenRouter,
sin interrumpir el flujo y sin dependencias de librerías externas.

Cada día a las 7 AM el agente procesa todas las facturas que vencen ese día.
Los eventos llegan en tiempo real vía Server-Sent Events.
El equipo financiero ve el estado de cada factura en el momento exacto en que el agente decide.

Cada decisión queda en una cadena de integridad verificable:
el hash de cada registro incluye el hash del anterior.
Y cualquier sistema ERP puede conectarse via API Key con el rol que necesite.

PayGuard corre con cero dependencias de producción. Solo Node.js nativo.
177 pruebas. Cobertura del 97%. Cero pagos indebidos.
La IA lee. El código decide.
