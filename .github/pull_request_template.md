## Qué cambia
<!-- 1–3 líneas -->

## Tipo
- [ ] fea (sube MENOR)  - [ ] fix (sube PARCHE)  - [ ] major (sube MAYOR, requiere etiqueta `major`)

## Checklist (todo obligatorio)
- [ ] Rama `fea/*` o `fix/*` hacia `dev` (o promoción `dev→staging`, `staging→main`)
- [ ] Cumple los contratos de `docs/ARCHITECTURE.md`
- [ ] Pruebas nuevas para cada cambio de comportamiento
- [ ] `npm run check` en verde · `npm run typecheck` en verde
- [ ] `npm run version:bump` ejecutado y `CHANGELOG.md` actualizado
- [ ] Sin dependencias de runtime nuevas · sin datos reales · sin claves
- [ ] Documentación actualizada según `docs/DOC-RULE.md`
- [ ] Línea agregada en `docs/BITACORA.md`
