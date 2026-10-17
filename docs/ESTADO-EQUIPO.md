# PayGuard · Estado del equipo — 17 oct 2026

> Reto Blinka: *Agentes que pagan por la empresa* · Hackathon 30X · v0.13.0

---

## Métricas actuales

| Métrica | Valor |
|---|---|
| Pagos indebidos | **0** ✅ |
| Precisión del set (32 facturas) | **100%** ✅ |
| Autonomía (decide solo) | **65.6%** ⚠️ meta: 75–80% |
| Pruebas pasadas | **171 / 171** ✅ |
| Versión en staging | **0.13.0** |
| CI (gates + ladder) | **verde** ✅ |

---

## Cobertura del reto Blinka

### ✅ Listo

| Requisito | Cómo se cumple |
|---|---|
| Leer factura y extraer datos | PDF, PNG, correo, chat · 4 idiomas · cadena de LLMs + caché |
| Decidir según reglas configurables | R01–R13 · política determinista PAY / HOLD / ESCALATE · nunca mueve dinero |
| Registrar cada decisión | Auditoría encadenada SHA-256 · explicaciones en 6 idiomas · verificación de integridad |
| Pedir permiso a una persona | Cola de aprobación humana · aprobaciones y rechazos desde la UI · re-validación al aprobar |
| Pantalla simple de reglas y estado | 6 vistas: Resumen, Facturas, Aprobaciones, Reglas, Auditoría, Ingesta |
| Casos trampa | 21 tipos · 12 normales + 20 trampas · R02 frena prompt injection |
| Seguridad: cero pagos indebidos | CI falla si aparece uno · 0 en todo el set |
| Explicabilidad | Texto plano por regla, con motivo y evidencia · legible sin abrir el código |

### ⚠️ Mejorable

| Requisito | Estado |
|---|---|
| Autonomía 75–80% | Hoy 65.6% · ajustar umbrales R09/R10 · el reto no fija mínimo, pero más autonomía = mejor demo |
| UI/UX para la demo | Funcional y limpia · falta estado vacío atractivo y onboarding de 3 pasos |

### ✗ Falta (bloqueante para entregar)

| Requisito | Acción |
|---|---|
| **Video de demostración (2:30)** | Guion en `docs/DEMO.md` · solo falta grabarlo |
| **URL pública desplegada** | Dockerfile + `railway.toml` listos · hacer deploy en Railway y publicar la URL |

### ➕ Plus (diferenciadores)

| Feature | Qué aporta |
|---|---|
| Corrida diaria 07:00 con vista en vivo (SSE) | Muestra facturas del día en tiempo real · diferenciador frente a otros equipos |
| Notificaciones al humano (sidebar, audio, badge, Slack/email) | Aviso inmediato de facturas frenadas sin salir de la app |
| Ingesta multi-canal: formulario, JSON, archivo, set de ejemplo | Demostrable en vivo sin datos previos |
| Aprendizaje continuo (RAG) + propuestas con aprobación humana | El sistema mejora con el uso sin cambiar reglas solo |

---

## División de tareas

### Persona A · Producto & Demo

- [ ] Grabar el video de 2:30 siguiendo `docs/DEMO.md` ← **bloqueante**
- [ ] Hacer deploy en Railway y publicar la URL pública
- [ ] Verificar que la URL cargue y `npm run eval` pase en producción
- [ ] Mejorar el estado vacío del Resumen (primera impresión del jurado)
- [ ] Añadir onboarding de 3 pasos si el set no está procesado
- [ ] Revisar copy de explicaciones (deben ser legibles por no-técnicos)

### Persona B · Motor & Calidad

- [ ] Subir autonomía de 65.6% → 75%+ ajustando umbrales en R09/R10
- [ ] Agregar 4–6 facturas nuevas al set para cubrir casos borde pendientes
- [ ] Revisar regla R06 (8 marcas) — ¿hay falsos positivos frenando pagos válidos?
- [ ] Correr `npm run eval` tras cada ajuste y mantener 0 pagos indebidos
- [ ] Actualizar `README.md` con la URL de Railway y las métricas finales

---

## Cómo correr el proyecto

```bash
# Sin dependencias externas. Node 20+.
npm test          # 171 pruebas
npm run check     # calidad + cobertura
npm run eval      # seguridad, precisión y autonomía
npm start         # http://localhost:3000

# Con Docker
docker compose up --build
```

## Ramas activas

| Rama | Estado |
|---|---|
| `main` | base protegida |
| `staging` | v0.13.0 · PR #7 pendiente de merge |
| `dev` | igual a staging tras reconciliación |

> Nuevas features van a `fea/<nombre>` → PR a `dev` → staging → main.

---

*Generado el 17 oct 2026 · PayGuard v0.13.0*
