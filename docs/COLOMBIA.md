# Validación de facturas colombianas (M8 · regla R12)

Objetivo: cuando la contraparte o la factura es de Colombia, validar que los **datos de pago y los valores** sean consistentes antes de permitir el pago. Esto es validación de formato y aritmética; **no** verifica la identidad de la empresa (fuera de alcance del reto).

## Qué se valida

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

## Dígito de verificación del NIT

```
pesos (de derecha a izquierda): 3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71
suma = Σ dígito_i × peso_i
r = suma mod 11
DV = r si r ∈ {0, 1}; si no, 11 − r
```

Ejemplo ficticio: NIT `900111222` → DV calculado y comparado con el que trae la factura (`900111222-?`).

## Facturas reales subidas en local

- Solo con `PAYGUARD_ALLOW_UPLOAD=1` (apagado en Railway).
- Se procesan en memoria; el registro guarda solo campos extraídos con NIT y cuenta enmascarados.
- Si el emisor no está en las contrapartes de la empresa ficticia, R04 la escala: es el comportamiento correcto.
