# Regla de documentación viva

**Ninguna interacción termina sin dejar la documentación al día.** Aplica a personas y a todos los agentes (Claude, Codex, OpenCode, Antigravity/AGY, Copilot, OpenRouter, Ollama y cualquier otro).

## Qué actualizar según lo que tocaste

| Si tocaste… | Actualiza también |
|---|---|
| Una regla, un endpoint o una firma pública | `docs/ARCHITECTURE.md` (tabla de reglas o de API) |
| Comportamiento visible para el usuario | `README.md` y `CHANGELOG.md` |
| Reglas de negocio, límites o umbrales | `docs/REQUIREMENTS.md` |
| Una dependencia, herramienta o plataforma | `docs/STACK.md` + un ADR en `docs/adr/` |
| Algo con impacto en seguridad o privacidad | `SECURITY.md` |
| Validación por país, idioma o formato | `docs/VALIDATORS.md` |
| El flujo de trabajo, ramas o gates | `CONTRIBUTING.md` |
| El reparto entre agentes | `AGENTS.md` y el brief en `docs/agents/` |
| Cualquier cosa | `CHANGELOG.md` bajo la versión que subiste y `docs/BITACORA.md` |

## Bitácora

Cada sesión de trabajo agrega **una línea** a `docs/BITACORA.md`:

```
| 2026-10-17 | claude | fea/m3-rules-engine | 0.3.0 | R01–R12, motor y política con prueba de propiedades |
```

Sirve para que el siguiente agente sepa en qué quedó el anterior sin leer todo el historial de git.

## Cómo se verifica

- El gate `npm run quality` falla si un módulo de `src/` no está documentado en `docs/ARCHITECTURE.md`.
- El PR no se aprueba si la checklist de documentación no está marcada.
- Un commit que cambia `src/` sin tocar ningún `.md` se revisa con lupa: o la documentación ya estaba al día, o falta.

## En una frase

Si alguien tiene que preguntarte qué hiciste, la documentación falló.
