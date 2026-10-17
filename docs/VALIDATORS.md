# Validación de datos de pago e idioma

Las facturas llegan **de cualquier país y en cualquier idioma**. El sistema valida en dos capas: una internacional que aplica siempre, y una regional cuando el país la tiene.

## 1. Idioma

| Qué | Cómo |
|---|---|
| Idioma del documento | `src/i18n/detect.js` lo deduce de términos de facturación (es, en, pt, fr, de, it); si no hay señal clara devuelve `null` y no se adivina |
| Idioma de la respuesta | `resolveLang()` en este orden: el que pide el usuario (`?lang=` o cabecera `Accept-Language`) → el del documento → el de la empresa → inglés |
| Textos | Todos salen del catálogo `src/i18n/messages.js`. Ninguna explicación se escribe a mano dentro de la lógica |
| Montos y fechas | `Intl.NumberFormat` e `Intl.DateTimeFormat` con el idioma elegido y la divisa real |

La extracción le pide al modelo **datos normalizados** (fechas `YYYY-MM-DD`, divisa ISO-4217, montos numéricos) sin importar el idioma del documento, así las reglas nunca interpretan texto.

## 2. Capa internacional (`src/validators/international.js`)

| Chequeo | Qué verifica |
|---|---|
| IBAN | Formato y dígito de control módulo 97 (ISO 13616) |
| BIC / SWIFT | 8 u 11 caracteres con estructura válida |
| ABA routing (EE. UU.) | 9 dígitos con su suma de control |
| Divisa | Código ISO-4217 y **decimales correctos** (JPY y CLP sin centavos, KWD con tres) |
| País | ISO-3166-1 alfa-2 |
| Fechas | ISO real; rechaza 2026-02-31 |
| Cuadre | `total = subtotal + impuestos − retenciones`, con tolerancia de una unidad mínima de la divisa |

El nombre del impuesto cambia por país (IVA, VAT, TVA, MwSt, GST, Sales Tax); el sistema solo usa el **monto**, nunca la palabra.

## 3. Capa regional

Se aplica según el país de la contraparte o del emisor. Si un país no tiene validador regional, basta la capa internacional.

| País | Validador | Estado |
|---|---|---|
| CO Colombia | NIT con dígito de verificación, IVA 19/5/0, retenciones, CUFE | M8 |
| MX México | RFC (formato y homoclave) | opcional |
| BR Brasil | CNPJ con dígitos de verificación | opcional |
| UE | Número de IVA intracomunitario (formato por país) | opcional |
| US | EIN (formato) | opcional |

### Colombia (M8 · regla R12)



| Chequeo | Regla | Si falla |
|---|---|---|
| NIT con dígito de verificación (DV) | Algoritmo DIAN módulo 11 (abajo) | ESCALATE |
| NIT de la factura = NIT registrado de la contraparte | Comparación normalizada (sin puntos ni guiones) | ESCALATE (y R04/R05 actúan) |
| Moneda | COP para facturas emitidas en Colombia, salvo contrato en USD | ESCALATE si no coincide con el contrato |
| IVA | `iva = subtotal × tarifa` con tarifa 19%, 5% o 0% (exento/excluido), tolerancia ±1 peso por redondeo | ESCALATE |
| Total | `total = subtotal + iva − retenciones` (ReteFuente, ReteIVA, ReteICA), tolerancia ±1 peso | ESCALATE |
| CUFE (factura electrónica) | 96 caracteres hexadecimales (SHA-384). Solo formato, sin consulta a la DIAN | ESCALATE si viene y es inválido |
| Fechas | Emisión ≤ hoy; vencimiento ≥ emisión | ESCALATE |
| Cuenta bancaria | Coincide con la registrada (R05) | ESCALATE |

### Dígito de verificación del NIT

```
pesos (de derecha a izquierda): 3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71
suma = Σ dígito_i × peso_i
r = suma mod 11
DV = r si r ∈ {0, 1}; si no, 11 − r
```

Ejemplo ficticio: NIT `900111222` → DV calculado y comparado con el que trae la factura (`900111222-?`).

## 4. Facturas reales subidas en local

- Solo con `PAYGUARD_ALLOW_UPLOAD=1` (apagado en Railway).
- Se procesan en memoria; el registro guarda solo campos extraídos con NIT y cuenta enmascarados.
- Si el emisor no está en las contrapartes de la empresa ficticia, R04 la escala: es el comportamiento correcto.
