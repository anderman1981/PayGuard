# ADR 0003 · Flujo de ramas y versionado

**Estado:** aceptado · 2026-10-16

**Decisión:** `main` producción, `staging` pruebas, `dev` desarrollo; `fea/*` y `fix/*` desde `dev`. SemVer: `fix` sube parche, `fea` sube menor, `major` sube mayor. Sufijos por rama (`-dev.N`, `-rc.N`) y SHA por commit. Detalle en CONTRIBUTING.md.

**Consecuencias:** varios agentes trabajan en paralelo sin pisarse; cada versión es rastreable a su rama y commit.
