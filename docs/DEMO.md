# Guion de la demo (3 min)

Hackathon Blinka 30X · PayGuard · Anderson Martinez Restrepo

> **Flujo de grabación:** abre Railway en Chrome con la extensión Claude → sigue las instrucciones PANTALLA escena por escena → captura screenshots → ensambla en CapCut/iMovie → narra con [TTSMaker](https://ttsmaker.com) (gratis, sin registro).

---

## ESCENA 1 — El problema `[0:00 – 0:25]`

**PANTALLA:** pantalla de login de PayGuard abierta en Railway. Mostrar las 3 tarjetas de perfil.

**NARRACIÓN:**
> Un pago indebido puede costar más que todo el proceso de aprobación.
> PayGuard es un agente de IA que valida cada factura antes de que se autorice el pago.
> Sin intervención humana para las facturas limpias. Con escalamiento inmediato para las que no lo son.

---

## ESCENA 2 — Dashboard y motor de reglas `[0:25 – 1:00]`

**PANTALLA:**
1. Login con perfil **Admin** → `admin@payguard.demo` / `admin1234`
2. Vista **Inicio** — mostrar los 4 tiles: Total · PAY · ESCALATE · HOLD
3. Navegar a **Reglas** — mostrar la lista R01–R13

**NARRACIÓN:**
> El agente aplica 13 reglas en cadena: verifica que los datos estén completos, que no haya instrucciones maliciosas, que no sea un duplicado, que el beneficiario sea conocido, que la cuenta bancaria no haya cambiado, que exista contrato, que la moneda y el país estén permitidos, que las fechas sean válidas y que el monto no supere el presupuesto ni el saldo. La prioridad es clara: HOLD gana sobre ESCALATE, ESCALATE gana sobre PAY. El agente nunca paga si alguna regla no pasa.

---

## ESCENA 3 — OCR de factura real `[1:00 – 1:40]`

**PANTALLA:**
1. Navegar a **Ingesta** → tab **Subir archivo**
2. Arrastrar un PDF de factura real al dropzone
3. Mostrar el resultado: campos extraídos + barra de confianza por campo
4. Mostrar la decisión final: PAY / ESCALATE / HOLD con explicación de regla

**NARRACIÓN:**
> Cualquier PDF o imagen se procesa con visión de Gemini Flash 2.5. El modelo extrae número de factura, proveedor, monto, moneda, fechas y concepto, y le asigna una confianza por campo. Si Gemini falla, el sistema cae automáticamente a Groq o a OpenRouter, sin interrumpir el flujo y sin dependencias de librerías externas.

---

## ESCENA 4 — Corrida diaria en tiempo real `[1:40 – 2:15]`

**PANTALLA:**
1. Navegar a **Hoy** — mostrar tabla de facturas que vencen hoy
2. Clic en **Ejecutar corrida**
3. Ver las filas cambiar de estado en tiempo real: ✓ PAY · ⚠ ESCALATE · ✗ HOLD

**NARRACIÓN:**
> Cada día a las 7 AM el agente procesa todas las facturas que vencen ese día. Los eventos llegan en tiempo real vía Server-Sent Events. El equipo financiero ve el estado de cada factura en el momento exacto en que el agente decide.

---

## ESCENA 5 — Auditoría y API Keys `[2:15 – 2:40]`

**PANTALLA:**
1. Navegar a **Auditoría** — mostrar tabla con decisiones y hash de cada entrada
2. Clic en **Verificar integridad** → badge verde ✓
3. Login con perfil **Desarrollador** → navegar a **API Keys** → crear nueva clave

**NARRACIÓN:**
> Cada decisión queda en una cadena de integridad verificable: el hash de cada registro incluye el hash del anterior. Y cualquier sistema ERP puede conectarse via API Key con el rol que necesite.

---

## ESCENA 6 — Cierre `[2:40 – 3:00]`

**PANTALLA:** dashboard Admin con métricas finales. Texto en pantalla: **"La IA lee — el código decide."**

**NARRACIÓN:**
> PayGuard corre con cero dependencias de producción. Solo Node.js nativo. 180 pruebas. Cobertura del 97%. Cero pagos indebidos. La IA lee. El código decide.

---

## Texto completo para voz (copia y pega en TTSMaker)

Un pago indebido puede costar más que todo el proceso de aprobación. PayGuard es un agente de IA que valida cada factura antes de que se autorice el pago. Sin intervención humana para las facturas limpias. Con escalamiento inmediato para las que no lo son.

El agente aplica 13 reglas en cadena: verifica que los datos estén completos, que no haya instrucciones maliciosas, que no sea un duplicado, que el beneficiario sea conocido, que la cuenta bancaria no haya cambiado, que exista contrato, que la moneda y el país estén permitidos, que las fechas sean válidas y que el monto no supere el presupuesto ni el saldo. La prioridad es clara: HOLD gana sobre ESCALATE, ESCALATE gana sobre PAY. El agente nunca paga si alguna regla no pasa.

Cualquier PDF o imagen se procesa con visión de Gemini Flash 2.5. El modelo extrae número de factura, proveedor, monto, moneda, fechas y concepto, y le asigna una confianza por campo. Si Gemini falla, el sistema cae automáticamente a Groq o a OpenRouter, sin interrumpir el flujo y sin dependencias de librerías externas.

Cada día a las 7 AM el agente procesa todas las facturas que vencen ese día. Los eventos llegan en tiempo real vía Server-Sent Events. El equipo financiero ve el estado de cada factura en el momento exacto en que el agente decide.

Cada decisión queda en una cadena de integridad verificable: el hash de cada registro incluye el hash del anterior. Y cualquier sistema ERP puede conectarse via API Key con el rol que necesite.

PayGuard corre con cero dependencias de producción. Solo Node.js nativo. 180 pruebas. Cobertura del 97%. Cero pagos indebidos. La IA lee. El código decide.

---

## Qué no decir

- No llamar a PayGuard un producto de Blinka: es un prototipo para su reto.
- No prometer integración con pagos reales: el alcance termina en la decisión.
- No decir que el sistema "aprende solo": propone, y una persona aprueba.
- No decir que la autonomía es "alta" sin contexto: **76,6 %** significa que 11 de 47 facturas necesitan un humano porque las reglas no tienen suficiente información para decidir solas.
