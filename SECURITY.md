# Política de seguridad

PayGuard toma decisiones sobre pagos. Aunque no mueve dinero, se diseña como si lo hiciera. Estas reglas son obligatorias y las verifican pruebas y gates automáticos.

## 1. Invariantes de seguridad (nunca se rompen)

| # | Invariante | Cómo se garantiza |
|---|---|---|
| S1 | El agente no puede mover dinero | No existe ninguna función de pago. La guardia de integración solo permite `GET/HEAD`, bloquea rutas de pagos/transferencias y rechaza claves `*_live_*` |
| S2 | Ninguna factura sale como PAGADA si alguna regla dio HOLD o ESCALATE | Política con prioridad fija + test de propiedades (≥ 1.000 casos aleatorios) |
| S3 | Una persona solo puede aprobar facturas PENDIENTES, nunca FRENADAS | M5 rechaza la operación; además revalida duplicado, límite máximo, presupuesto y saldo en el momento de aprobar |
| S4 | El LLM no decide | Solo extrae; su salida pasa por validación de esquema; no tiene herramientas; aritmética, fechas y monedas se calculan en código |
| S5 | El contenido de la factura es dato, no instrucción | R02 detecta intentos de manipulación y frena la factura; el prompt de extracción aísla el documento |
| S6 | Toda decisión, aprobación y cambio de regla queda registrado | Registro encadenado SHA-256; `/api/audit/verify` detecta cualquier alteración |

## 2. Datos

- **Repo y demo pública: solo datos ficticios.** Empresas, NIT, cuentas y montos inventados.
- **Facturas reales (ej. una factura colombiana): solo en local**, con `PAYGUARD_ALLOW_UPLOAD=1`. En Railway esta opción está apagada.
  - Se procesan en memoria y no se escriben a disco.
  - No se guardan en el registro de auditoría el documento ni el texto completo: solo campos extraídos, con NIT y cuentas enmascarados (`****4521`).
  - Nunca se suben a git (`.gitignore` bloquea `uploads/`, `*.real.*`).
- Logs: nunca imprimen documentos, claves, NIT completos ni números de cuenta.

## 3. Secretos

- Solo en `.env` local o en las variables de Railway. `.env` nunca se versiona (`.gitignore` + gate de calidad).
- `npm run quality` busca patrones de claves (Google, OpenAI, Anthropic, GitHub, LangSmith, Blinka, etc.) y falla si encuentra alguno.
- Toda clave que haya aparecido en un chat, un log o un commit se considera expuesta y **se rota de inmediato**.
- Claves de Blinka: solo de prueba. El sistema rechaza las de producción.

## 4. Servidor HTTP

- Cabeceras en toda respuesta: `Content-Security-Policy` restrictiva (`default-src 'self'`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` mínima, `Cross-Origin-Opener-Policy: same-origin`.
- Solo sirve `public/`, `src/` y `data/`; cualquier otra ruta (incluida `.env`) responde 403/404.
- Cuerpo máximo 1 MB (10 MB en subida local); JSON inválido → 400; errores sin trazas internas.
- Operaciones que cambian estado (reglas, aprobaciones, reprocesar) requieren `PAYGUARD_ADMIN_TOKEN` cuando está configurado (siempre en Railway).
- Límite de peticiones por IP en endpoints de escritura.

## 5. Dependencias y cadena de suministro

- 0 dependencias de runtime. Tooling con versión exacta y revisado.
- La imagen Docker corre con usuario sin privilegios y sin archivos de desarrollo (`.dockerignore`).
- CI corre en cada push y PR; `main` y `staging` protegidas.

## 6. Reporte de vulnerabilidades

Escribe al responsable del repositorio (sin abrir issue público) con pasos para reproducir. Respuesta en 24 h durante el hackathon.
