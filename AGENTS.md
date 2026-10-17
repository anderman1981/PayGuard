# Instrucciones para agentes de IA

Lee esto completo antes de tocar el repo. Aplica a Claude, Codex, OpenCode, Antigravity y cualquier otro agente.

## Contexto en 5 líneas
- PayGuard decide qué facturas pagar, frenar o escalar dentro de reglas configurables. Reto Blinka, Hackathon 30X.
- **La IA lee, el código decide.** Nunca pongas lógica de decisión en un prompt.
- **Cero pagos indebidos** descalifica o gana el reto. Ante la duda, la regla escala o frena; nunca paga.
- JavaScript ESM sin dependencias de runtime, `// @ts-check` + JSDoc, pruebas con `node:test`.
- Documentos clave: `docs/ARCHITECTURE.md` (contratos), `CONTRIBUTING.md` (ramas, versionado, gates), `SECURITY.md`.

## Reglas duras
1. Trabaja **solo en tu rama asignada** (`fea/*` o `fix/*`). Nunca hagas commit ni push a `main`, `staging` o `dev`.
2. Toca **solo los archivos de tu módulo** y sus pruebas. Si necesitas cambiar un contrato de `docs/ARCHITECTURE.md` o `src/domain/types.js`, detente y pide un PR de contrato.
3. 0 dependencias de runtime. No agregues paquetes a `dependencies`. Para tooling, pide un ADR.
4. Cada cambio de comportamiento lleva su prueba en el mismo commit. Las pruebas no llaman a la red.
5. Nunca uses datos reales. Nunca escribas claves en el código, en pruebas ni en docs.
6. Antes de cada commit: `npm run check` (quality + cobertura). Antes del PR: `npm run version:bump -- fea|fix` y actualiza `CHANGELOG.md`.
7. Mensajes de commit: `tipo(alcance): descripción` (ver CONTRIBUTING.md §3).
8. Nada de `TODO`, `FIXME`, código comentado, `console.log` en `src/` ni archivos de más de 400 líneas.
9. Textos visibles al usuario y explicaciones: en español. Nombres de código: en inglés.
10. Si algo del reto o del contrato es ambiguo, elige la opción más segura (escalar) y documéntalo en el PR.
11. **Documentación viva: ninguna interacción termina sin dejar los documentos al día.** Antes de cerrar tu turno actualiza lo que corresponda según [docs/DOC-RULE.md](docs/DOC-RULE.md) y agrega tu línea en [docs/BITACORA.md](docs/BITACORA.md). Si no actualizaste nada, dilo explícitamente y explica por qué.

## Asignación

| Agente | Rama(s) | Brief |
|---|---|---|
| OpenCode | `fea/m1-dataset`, `fea/m8-colombia`, `fea/m7-eval` | [docs/agents/opencode.md](docs/agents/opencode.md) |
| Codex | `fea/m2-extraction`, `fea/m5-approvals` | [docs/agents/codex.md](docs/agents/codex.md) |
| Claude | `fea/m3-rules-engine`, `fea/m4-audit-log`, integración | [docs/agents/claude.md](docs/agents/claude.md) |
| Antigravity (AGY) | `fea/m6-ui` | [docs/agents/antigravity.md](docs/agents/antigravity.md) |
| Copilot | apoyo dentro del editor, en la rama abierta | [docs/agents/_comun.md](docs/agents/_comun.md) |
| OpenRouter / Ollama | modelos de respaldo para extracción (M2) | [docs/agents/codex.md](docs/agents/codex.md) |

## Al cerrar cada turno (obligatorio)

1. `npm run check` en verde.
2. Documentos actualizados según [docs/DOC-RULE.md](docs/DOC-RULE.md).
3. Una línea nueva en [docs/BITACORA.md](docs/BITACORA.md).
4. Entrada en `CHANGELOG.md` y `npm run version:bump -- fea|fix`.
5. Commit con el formato de CONTRIBUTING.md §3 y push de tu rama.

## Flujo de integración
`fea/*` → PR a `dev` (squash) → integrador revisa → corre la suite completa en `dev` → PR `dev → staging` → prueba en Railway staging → PR `staging → main` → tag `vX.Y.Z`.
