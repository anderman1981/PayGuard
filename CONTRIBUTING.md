# Cómo se trabaja en PayGuard

Estas reglas aplican igual a personas y a agentes de IA (Claude, Codex, OpenCode, Antigravity). Ver también [AGENTS.md](AGENTS.md) y [SECURITY.md](SECURITY.md).

## 1. Regla de oro de ramas

| Rama | Propósito | Quién escribe | Cómo entra código |
|---|---|---|---|
| `main` | **Producción.** Lo que ve el jurado (Railway producción) | Nadie directo | Solo PR desde `staging` |
| `staging` | **Pruebas.** Candidato a release (Railway staging) | Nadie directo | Solo PR desde `dev` (o `fix/*` urgente) |
| `dev` | **Desarrollo.** Integración de módulos | Nadie directo | Solo PR desde `fea/*` o `fix/*` |
| `fea/<modulo>-<tema>` | Funcionalidad nueva, idea o experimento | Un solo responsable | Sale de `dev`, vuelve a `dev` |
| `fix/<tema>` | Corrección | Un solo responsable | Sale de `dev`; si el fallo está en `staging`, sale de `staging`, entra a `staging` y luego se devuelve a `dev` |

- Prohibido hacer push directo a `main`, `staging` o `dev` (lo bloquea el hook `pre-push` y la protección de GitHub).
- Una rama `fea/*` o `fix/*` hace **una sola cosa**. Si crece, se parte.
- Antes de abrir un PR: `git fetch && git rebase origin/dev` y gates en verde.
- Las ramas se borran después del merge.

## 2. Versionado

Formato **MAYOR.MENOR.PARCHE** (SemVer), guardado en el archivo `VERSION`.

| Cambio | Rama | Sube | Ejemplo |
|---|---|---|---|
| Corrección o cambio menor | `fix/*` | PARCHE | 1.0.**3** |
| Funcionalidad o cambio mayor | `fea/*` | MENOR (PARCHE vuelve a 0) | 1.**4**.0 |
| Rediseño completo, cambio de tecnología o upgrade completo | `fea/*` con etiqueta `major` en el PR | MAYOR (MENOR y PARCHE a 0) | **2**.0.0 |

**Versión por rama** (la calcula `npm run version:show` y la expone `/api/health`):

| Rama | Versión mostrada |
|---|---|
| `main` | `1.4.0` |
| `staging` | `1.4.0-rc.<n>` |
| `dev` | `1.4.0-dev.<commits>` |
| `fea/*`, `fix/*` | `1.4.0-<rama>.<sha>` |

**Versión por commit:** cada build lleva el SHA corto como metadato (`1.4.0-dev.12+a1b2c3d`).

Proceso:
1. En tu rama: `npm run version:bump -- fix` (o `fea`, o `major`). Esto actualiza `VERSION` y agrega la entrada en `CHANGELOG.md`.
2. CI verifica que `VERSION` subió respecto a `dev` y que el tipo coincide con el prefijo de la rama.
3. Si otro PR subió la versión antes que el tuyo: rebase y vuelve a correr el bump.
4. Al promover: `staging` se etiqueta `vX.Y.Z-rc.N`; `main` se etiqueta `vX.Y.Z`.

## 3. Commits

Formato obligatorio (lo valida el hook `commit-msg`):

```
<tipo>(<alcance>): <descripción en minúscula, imperativo, máx. 72 caracteres>
```

Tipos: `fea`, `fix`, `major`, `docs`, `test`, `refactor`, `chore`, `perf`, `security`, `release`, `merge`.
Ejemplo: `fea(rules): agregar R10 presupuesto del periodo`.

## 4. Pull requests

- Título con el mismo formato del commit.
- Usa la plantilla (`.github/pull_request_template.md`) y marca toda la checklist.
- Requiere: CI en verde + revisión del integrador. `main` y `staging` requieren además prueba manual en Railway staging.
- Merge por **squash** hacia `dev`; merge normal (sin squash) en promociones `dev → staging → main` para conservar historia.

## 5. Gates de calidad (0 deuda técnica)

"0 deuda técnica" aquí significa: **nada entra si algún gate falla**. No hay excepciones ni "lo arreglo después".

| Gate | Comando | Umbral |
|---|---|---|
| Pruebas | `npm test` | 100% pasan |
| Cobertura | `npm run coverage` | ≥ 90% líneas, ≥ 85% ramas, ≥ 90% funciones |
| Calidad y seguridad estática | `npm run quality` | 0 hallazgos |
| Tipos | `npm run typecheck` | 0 errores |
| Versión | `npm run version:check` | sube y coincide con la rama |
| Secretos | incluido en `quality` | 0 coincidencias |

`npm run quality` revisa: `// @ts-check` en todo archivo de código, sin `TODO/FIXME/HACK/XXX`, sin `console.log` en `src/`, sin `eval`/`new Function`, sin secretos con forma de clave, archivos ≤ 400 líneas, líneas ≤ 140 caracteres, sintaxis válida, y que cada módulo de `src/` tenga al menos un test que lo importe.

## 6. Pruebas: cada interacción y cada cambio

- Todo cambio de comportamiento trae su test en el mismo PR. Todo `fix/*` trae primero el test que reproduce el fallo.
- Un archivo de pruebas por módulo: `test/<modulo>.test.js`.
- Cada regla de M3 tiene pruebas de PASS, de su resultado negativo y de casos borde.
- Pruebas de propiedades para la invariante de seguridad (M3/M5).
- Cada endpoint de la API tiene prueba de respuesta correcta, de entrada inválida y de cabeceras de seguridad.
- Las pruebas no llaman a ningún servicio externo (modo caché o `fetch` simulado).

## 7. Definición de terminado

Un PR está terminado cuando: cumple el contrato de ARCHITECTURE.md, tiene pruebas, todos los gates están en verde, la documentación afectada está actualizada, `CHANGELOG.md` tiene su entrada y no introduce dependencias de runtime.
