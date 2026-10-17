# Tecnologías, paquetes y herramientas

## Política de dependencias

- **Runtime: 0 dependencias.** Solo Node.js y las APIs del navegador. Menos superficie de ataque, nada que auditar en producción, arranque instantáneo en Railway.
- **Tooling (devDependencies): permitido**, siempre con versión exacta (sin `^` ni `~`) y solo para chequeo de tipos, generación de datos o pruebas. Nunca se cargan en el servidor.
- Toda dependencia nueva requiere un ADR en `docs/adr/`.

## Plataforma

| Capa | Tecnología | Por qué |
|---|---|---|
| Lenguaje | JavaScript ESM + JSDoc con `// @ts-check` | Tipado verificable sin paso de build; el mismo código corre en Node y en el navegador |
| Runtime | Node.js 22 LTS (mínimo 20) | `fetch`, `crypto.subtle`, `node:test` y cobertura nativos |
| Servidor | `node:http` | Sin framework: superficie mínima, control total de cabeceras de seguridad |
| Interfaz | HTML + CSS + JS de módulos, sin build | Despliegue trivial; estilo inspirado en el lenguaje visual de Blinka |
| Persistencia | Archivos JSON en memoria/volumen + registro encadenado | La demo se reinicia limpia; la auditoría verifica su integridad |
| Pruebas | `node:test` + `node:assert` + cobertura nativa | Sin dependencias |
| Tipos | TypeScript `tsc --checkJs` (devDependency, versión exacta) | Chequeo estricto de JSDoc en CI |
| Contenedor | Docker (`node:22-alpine`, usuario sin privilegios) | Igual en local y en Railway |
| Hosting | Railway (Dockerfile + healthcheck) | URL pública de la demo |
| CI | GitHub Actions | Gates en cada push y PR |

## IA

| Uso | Proveedor | Notas |
|---|---|---|
| Extracción de facturas (PDF/imagen nativos) | Google Gemini (capa gratuita) | Primer proveedor de la cadena |
| Respaldo | Groq, OpenRouter (modelos gratuitos) | Circuit breaker: 2 fallos o 1 rate-limit abren el circuito |
| Clasificación opcional | JEV (TypeSafe AI) | Solo puede escalar, nunca aprobar |
| Modo sin conexión | Caché de extracciones doradas (M1) | Demo pública, tests y CI no llaman a ningún modelo |

Ningún modelo tiene herramientas ni acceso a la red de pagos: solo recibe texto o imagen y devuelve JSON que se valida contra el esquema.

## Herramientas de desarrollo

| Herramienta | Rol |
|---|---|
| Git + GitHub + `gh` | Control de versiones, PRs, protección de ramas |
| Claude (Cowork) | Integrador, M3, M4, seguridad, revisión de PRs |
| Codex | M2 extracción, M5 aprobaciones |
| OpenCode | M1 datos, M7 evaluación, M8 Colombia |
| Antigravity (agy) | M6 interfaz |
| Docker Desktop | Ejecución local idéntica a producción |
| Railway | Despliegue de `staging` y `main` |

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run setup` | Activa los git hooks del repo |
| `npm test` | Pruebas |
| `npm run coverage` | Pruebas con umbral de cobertura |
| `npm run quality` | Gate de calidad y seguridad estática |
| `npm run typecheck` | Chequeo de tipos (requiere red para `npx`) |
| `npm run check` | quality + coverage (lo que corre el pre-commit) |
| `npm run version:show` · `version:bump -- fix|fea|major` | Versionado |
| `npm start` · `docker compose up --build` | Ejecutar |
