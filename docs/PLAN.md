# Plan de desarrollo y plan de trabajo

**Proyecto:** PayGuard · Reto Blinka (*Agentes que pagan por la empresa*) · Hackathon 30X
**Equipo:** DEV-TECHS-MEDALLO · **Cierre:** domingo 18 oct 2026, 12:00 p. m. (America/Bogota)
**Meta:** producto terminado y 100% funcional para el alcance del reto, no un MVP.

---

## 1. Plan de desarrollo

### 1.1 Qué tiene que cumplir (trazado al reto)

| ID | Requisito del reto | Dónde se cumple |
|---|---|---|
| RF-01 | Leer una factura (PDF, imagen, correo o chat) y extraer a quién, cuánto, moneda y fecha | M2 Extracción |
| RF-02 | Decidir según reglas configurables: límite por pago, por periodo, beneficiarios permitidos, aprobación humana sobre un monto | M3 Motor de reglas |
| RF-03 | Registrar cada decisión (pagó / frenó / escaló) y por qué | M4 Auditoría |
| RF-04 | Pedir permiso a una persona cuando algo sale de las reglas | M5 Aprobaciones |
| RF-05 | Pantalla donde la empresa define reglas y ve pagado / frenado / pendiente y por qué | M6 Interfaz |
| RF-06 | Set propio de facturas con casos normales y trampa | M1 Datos |
| RF-07 | Medir autonomía, seguridad y explicabilidad | M7 Evaluación |
| RF-08 | Subir una factura colombiana real y validar sus datos de pago (solo local) | M8 Colombia |
| RNF-01 | Cero pagos fuera de las reglas sin aprobación humana | Invariante de M3 + M5, test de propiedades |
| RNF-02 | Cada decisión explicable después, sin abrir el código | M4 |
| RNF-03 | Ningún dato real en el repo ni en la demo pública | SECURITY.md, gate de calidad |

Detalle completo en [REQUIREMENTS.md](REQUIREMENTS.md).

### 1.2 Arquitectura en una línea

`Factura → M2 extrae (LLM o caché) → M3 evalúa reglas en código → política decide → M4 registra con hash encadenado → M5 cola humana → M6 muestra`.

**La IA lee, el código decide.** Ver [ARCHITECTURE.md](ARCHITECTURE.md) y los ADR en [adr/](adr/).

### 1.3 Módulos

| Módulo | Entrega | Rama | Responsable | Depende de |
|---|---|---|---|---|
| M0 | Dominio, reglas, guardia de solo lectura, servidor, Docker, gobierno | `dev` | Claude (Cowork) | — |
| M1 | 30+ facturas ficticias (PDF, PNG, EML, chat) con decisión esperada | `fea/m1-dataset` | OpenCode | M0 |
| M2 | Ingesta + extracción con cadena de LLMs y caché offline | `fea/m2-extraction` | Codex | M0, contrato de M1 |
| M3 | 11 reglas + política + tests de seguridad | `fea/m3-rules-engine` | Claude | M0 |
| M4 | Registro de auditoría encadenado + explicaciones | `fea/m4-audit-log` | Claude | M3 |
| M5 | Cola de aprobación humana | `fea/m5-approvals` | Codex | M3, M4 |
| M6 | Interfaz (reglas, tablero, detalle, aprobaciones, subida) | `fea/m6-ui` | Antigravity | contratos de API |
| M7 | Evaluación (autonomía/seguridad/precisión) + guion de demo | `fea/m7-eval` | OpenCode | M1, M3 |
| M8 | Validadores Colombia (NIT/DV, CUFE, IVA, retenciones) | `fea/m8-colombia` | OpenCode | M3 |

Los módulos se construyen **en paralelo contra contratos fijos** (ARCHITECTURE.md §3). Nadie cambia un contrato sin un PR propio de contrato aprobado por el integrador.

### 1.4 Criterios de "terminado" del producto (v1.0.0)

- Las 30+ facturas del set se procesan de punta a punta en modo simulado y en vivo.
- Seguridad: 0 pagos indebidos en el set y en las pruebas de propiedades (≥ 1.000 casos aleatorios).
- Autonomía ≥ 60% del set decidido correctamente sin humano; precisión de decisión 100% contra lo esperado.
- Cada decisión tiene explicación en español y la cadena de auditoría verifica.
- Interfaz completa en escritorio y móvil, modo claro y oscuro.
- Docker local y Railway funcionando con la misma imagen.
- Todos los gates en verde (ver CONTRIBUTING.md §5).

---

## 2. Plan de trabajo (cronograma)

Hora de Bogotá. Cada bloque termina con merge a `dev` y gates en verde.

| Bloque | Cuándo | Qué | Salida |
|---|---|---|---|
| F0 Gobierno | Vie 20:00–23:00 | Docs, gates, hooks, CI, ramas, contratos; lanzar a los agentes | `v0.1.0` en `main`, `staging`, `dev` |
| F1 Construcción paralela | Vie 23:00 – Sáb 12:00 | M1, M2, M3, M8 en sus ramas `fea/*` | PRs a `dev` |
| F2 Integración I | Sáb 12:00–15:00 | Merge M1–M3, M8; M4 y M5 | `0.5.x-dev` |
| F3 Interfaz | Sáb 12:00–19:00 (paralelo) | M6 contra la API real | `0.7.x-dev` |
| F4 Evaluación y QA | Sáb 19:00–22:00 | M7, corrida completa, corrección de fallas (`fix/*`) | `0.9.0-rc.1` en `staging` + Railway staging |
| F5 Estabilización | Sáb 22:00 – Dom 01:00 | Solo `fix/*` sobre lo que falle en `staging` | `0.9.x-rc.N` |
| F6 Release | Dom 07:00–09:30 | Congelamiento, `staging → main`, `v1.0.0`, Railway producción | Demo URL final |
| F7 Entrega | Dom 09:30–11:30 | Video (2–3 min), README final, formulario HackRadar | Envío antes de 11:30 (30 min de margen) |

**Regla de corte:** si a las 19:00 del sábado un módulo no está en `dev`, se entrega sin él y se documenta como fuera de alcance. Nada entra a `staging` después del domingo 07:00 salvo `fix/*` críticos.
