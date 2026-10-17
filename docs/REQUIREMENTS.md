# Requerimientos

## 1. Funcionales

| ID | Requerimiento | Criterio de aceptación |
|---|---|---|
| RF-01 | Extraer de cada factura: beneficiario, identificación fiscal, monto, moneda, fecha de emisión y vencimiento, número, contrato, datos bancarios, concepto | 100% de los campos del set extraídos o marcados con baja confianza (R01) |
| RF-02 | Reglas configurables desde la pantalla | Cambiar una regla y reprocesar cambia las decisiones; cada cambio queda auditado |
| RF-03 | Decidir PAGAR / FRENAR / ESCALAR | Coincide con `expected.outcome` en el 100% del set |
| RF-04 | Explicar cada decisión en español | Cada decisión lista regla, resultado, motivo y evidencia |
| RF-05 | Cola de aprobación humana | Aprobar/rechazar con nombre y motivo; solo para PENDIENTES |
| RF-06 | Tablero: pagadas, frenadas, pendientes, con totales en USD | Filtros y búsqueda; detalle por factura |
| RF-07 | Set de datos ficticio con casos normales y trampa | ≥ 30 facturas en 4 formatos, ≥ 10 tipos de trampa |
| RF-08 | Métricas de autonomía, seguridad y precisión | `/api/metrics` y en la pantalla |
| RF-09 | Subir una factura (incluida una colombiana real) y evaluarla | Solo con `PAYGUARD_ALLOW_UPLOAD=1`; se procesa en memoria y no se guarda |
| RF-10 | Validar datos de pago colombianos | NIT con dígito de verificación, IVA 19%/5%/0%, total = subtotal + IVA − retenciones, CUFE con formato válido |

## 2. No funcionales

| ID | Requerimiento | Meta |
|---|---|---|
| RNF-01 | Seguridad de decisión | 0 pagos fuera de reglas sin aprobación humana (test de propiedades ≥ 1.000 casos) |
| RNF-02 | Integridad de auditoría | Cadena SHA-256 verificable; cualquier alteración se detecta |
| RNF-03 | Privacidad | Ningún dato real en repo, logs ni demo pública; NIT y cuentas enmascarados en logs |
| RNF-04 | Rendimiento | Set completo en modo caché < 2 s; por factura en vivo < 10 s |
| RNF-05 | Disponibilidad de la demo | Funciona sin claves de IA (modo caché) |
| RNF-06 | Calidad | Cobertura de líneas ≥ 90%, 0 errores de tipos, 0 hallazgos del gate de calidad |
| RNF-07 | Accesibilidad | Contraste AA, navegable con teclado, usable a 375 px de ancho |
| RNF-08 | Portabilidad | Misma imagen Docker en local y Railway |

## 3. Requerimientos técnicos y de hardware

### Desarrollo (tu equipo)
| Recurso | Mínimo | Recomendado |
|---|---|---|
| CPU | 4 núcleos | 8 núcleos (Apple Silicon M1 o superior) |
| RAM | 8 GB | 16 GB (Docker + varios agentes de IA abiertos) |
| Disco libre | 5 GB | 10 GB |
| Software | Node 20+, Git 2.40+, Docker Desktop, `gh` | Node 22 LTS |
| Red | Internet para APIs de IA y GitHub | — |

### Ejecución de la demo
| Entorno | Recursos |
|---|---|
| Docker local | ~80 MB de imagen, < 100 MB de RAM |
| Railway | 1 servicio, 0,5 GB RAM, 1 vCPU (capa de prueba: crédito de 5 USD por 30 días) |
| Navegador | Chrome, Edge, Safari o Firefox actuales |

### Cuentas y claves
| Servicio | Necesario para | Obligatorio |
|---|---|---|
| GitHub | Repo público y CI | Sí |
| Railway | Demo pública | Sí |
| Google AI Studio (Gemini) | Extracción en vivo | No (hay modo caché) |
| Groq / OpenRouter | Respaldo de extracción | No |
| TypeSafe (JEV) | Clasificación opcional | No |
| Blinka | Solo lectura con clave de **prueba** | No |
