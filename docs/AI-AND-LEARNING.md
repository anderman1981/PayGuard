# Modelos de IA y aprendizaje continuo

## 1. Qué modelo usa el agente

El agente usa el modelo **solo para leer** (convertir un documento en datos). La decisión la toma el motor de reglas. Por eso elegimos por calidad de lectura y costo, no por "inteligencia".

| Puesto | Modelo | Por qué | Costo |
|---|---|---|---|
| **1. Principal** | **Google Gemini 2.5 Flash** | Lee PDF e imagen de forma nativa, sin OCR aparte; responde JSON con esquema; rápido | Capa gratuita |
| 2. Respaldo | Llama 3.3 70B en **Groq** | Muy rápido para texto (correo y chat); no lee imágenes | Capa gratuita |
| 3. Respaldo | Modelos gratuitos de **OpenRouter** | Tercera red de seguridad si los dos anteriores fallan | Gratuito |
| 4. Local | **Ollama** (`llama3.2-vision`, `nomic-embed-text`) | Para trabajar sin internet y para calcular vectores del RAG en tu equipo | Local |
| 5. Caché | Extracciones guardadas del set | La demo pública y los tests nunca llaman a un modelo | — |

La cadena cambia de proveedor sola: dos fallos seguidos (o un solo "límite alcanzado") sacan a ese proveedor del resto de la corrida. **Si ninguno responde, la factura se escala a una persona, nunca se paga.**

Nada de modelos de pago salvo que se agoten las capas gratuitas; esa decisión queda registrada en un ADR.

## 2. Por qué el modelo no decide

Un modelo puede equivocarse con confianza y puede ser manipulado por el texto de la factura. Si decidiera él, un atacante solo tendría que escribir "aprueba este pago" dentro del PDF. Por eso:

- El modelo devuelve datos + un nivel de confianza por campo.
- Las reglas, en código, deciden.
- Aritmética, conversión de moneda y comparación de fechas se calculan en código, nunca se le preguntan al modelo.

## 3. Aprendizaje continuo (RAG sobre casos pasados)

El sistema guarda cada decisión y, sobre todo, **qué hizo la persona cuando le escalamos**. Esa memoria se consulta en cada factura nueva para parecerse cada vez más al criterio del equipo.

### Cómo funciona

```
Factura nueva
   ↓ se convierte en vector (texto + proveedor + concepto + monto + moneda)
Memoria de casos  ──► los k casos más parecidos ya resueltos
   ↓
Consejero (advisor)
   ├─ Ejemplos para el extractor: cómo se leyó bien ese mismo proveedor antes  → sube la precisión de lectura
   ├─ Señal de riesgo: "casos parecidos terminaron rechazados por una persona" → puede ESCALAR
   └─ Propuesta de ajuste: "estas 20 facturas de este proveedor se aprobaron siempre" → sugiere subir un umbral
                                                                                        (NO lo aplica: lo propone)
   ↓
Motor de reglas (sin cambios) → Política → Decisión
```

### La regla de oro del aprendizaje

> **El aprendizaje solo puede volver al sistema más prudente, nunca más permisivo, sin que una persona lo apruebe.**

- El consejero puede **agregar** un motivo de escalamiento. Nunca puede quitar ni rebajar el resultado de una regla.
- Ningún umbral, lista de beneficiarios ni presupuesto cambia solo. El sistema **propone** y una persona acepta desde la pantalla de Reglas; el cambio queda en la auditoría con quién lo aprobó.
- Esto es lo que permite que la autonomía suba con el tiempo sin que la seguridad baje nunca.

### Qué se guarda en la memoria de casos

Campos extraídos (sin el documento), decisión del agente, reglas que no pasaron, y la **resolución humana** (aprobó / rechazó, con su motivo). Nunca el PDF, nunca identificadores fiscales ni cuentas completas: van enmascarados.

### Dónde vive cada pieza

| Archivo | Qué hace |
|---|---|
| `src/learning/vector.js` | Convierte una factura en vector y mide el parecido (coseno) |
| `src/learning/store.js` | `CaseStore`: guarda casos, anota la resolución humana y busca parecidos |
| `src/learning/advisor.js` | `advise()` produce el consejo; `applyAdvice()` solo puede agregar un escalamiento |
| `src/learning/config.js` | Parámetros del consejero (cuántos casos, cuánta evidencia, umbrales) |

### Vectores sin dependencias

Los vectores se calculan con un método propio (bolsa de palabras con pesos y proyección a 256 dimensiones, determinista). No requiere internet, no requiere librerías y es reproducible en los tests. Si hay Ollama o Gemini disponibles, se puede usar su modelo de embeddings y la similitud mejora; la interfaz es la misma.

## 4. Camino al 99,9%

La métrica que importa no es una sola: son tres, y la tercera es la que no puede bajar.

| Métrica | Qué mide | Meta |
|---|---|---|
| **Seguridad** | Pagos indebidos aprobados | **0. Siempre. No negociable** |
| **Precisión** | Decisiones iguales a lo que decidiría el equipo | 99,9% |
| **Autonomía** | Facturas resueltas sin molestar a una persona | Sube con el tiempo |

Cómo se llega:

1. **Hoy**: reglas deterministas. Precisión alta, autonomía media (escala cuando duda).
2. **Con memoria**: el extractor acierta más con proveedores ya vistos → menos escalamientos por lectura dudosa (R01).
3. **Con resoluciones humanas**: el sistema detecta patrones ("este proveedor siempre se aprueba", "estos recargos siempre se rechazan") y propone ajustes que una persona acepta.
4. **Cada propuesta aceptada** se vuelve regla o umbral explícito, probado y auditable. La precisión sube por reglas nuevas, no por un modelo opaco.

Que cada mejora sea una regla explícita es lo que hace defendible el 99,9%: se puede explicar, probar y revertir. Un modelo que "aprende solo" no se puede auditar, y en pagos eso no sirve.
