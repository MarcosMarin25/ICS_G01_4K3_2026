# TP 6 - TDD: Registro de ejecución de las pruebas

Este documento registra, para cada prueba, el resultado esperado y lo que dio al correrla en cada paso del ciclo **Red → Green → Refactor**.

- **Esperado:** el valor que pide la prueba (definido en `pruebas_comprar_entradas.md`).
- **Obtenido en Red:** lo que devolvió el código **antes** de implementar la funcionalidad. La prueba tiene que fallar.
- **Obtenido en Green:** lo que devolvió el código después de escribir lo mínimo para que pase.

Cuando una prueba pasa sin cambiar el código (pruebas de borde), se indica "pasó sin cambios": el código escrito para una prueba anterior ya cubría ese caso. No es un ciclo Red: es una **confirmación de borde**, que verifica que la generalización hecha antes ya cubre el valor límite.

- **Estrategia (Kent Beck):** *Fake it* (devolver una constante), *Triangulación* (una segunda prueba obliga a generalizar), *Implementación obvia* (el código es trivial y se escribe directo) o *Confirmación de borde* (pasó sin cambios).

La evidencia de la última ejecución completa está en `reportes/reporte-pruebas.html`, que se genera solo cada vez que se corre `npm test`.


## A. Precio de cada entrada (`CalculadoraPrecios`)

| # | Prueba | Esperado | Obtenido en Red | Obtenido en Green | Estrategia | Cambio en el código | Estado |
|---|---|---|---|---|---|---|---|
| C01 | Adulto con pase regular (30, REGULAR) | 10000 | `undefined` | 10000 | Fake it | `return 10000` | ✅ Pasa |
| C02 | Adulto con pase VIP (30, VIP) | 20000 | 10000 | 20000 | Triangulación | Precio según el tipo de pase | ✅ Pasa |
| C03 | Bebé de 0 años (0, VIP) (*) | 0 | 20000 | 0 | Implementación obvia | Hasta 3 años no paga | ✅ Pasa |
| C04 | Niño de 3 años (3, VIP) | 0 | Pasó sin cambios | 0 | Confirmación de borde | — | ✅ Pasa |
| C05 | Niño de 4 años (4, REGULAR) | 5000 | 10000 | 5000 | Implementación obvia | Hasta 15 años paga la mitad | ✅ Pasa |
| C06 | Persona de 15 años (15, VIP) | 10000 | Pasó sin cambios | 10000 | Confirmación de borde | — | ✅ Pasa |
| C07 | Persona de 16 años (16, REGULAR) | 10000 | Pasó sin cambios | 10000 | Confirmación de borde | — | ✅ Pasa |
| C08 | Persona de 59 años (59, VIP) | 20000 | Pasó sin cambios | 20000 | Confirmación de borde | — | ✅ Pasa |
| C09 | Persona de 60 años (60, REGULAR) | 5000 | 10000 | 5000 | Implementación obvia | Desde 60 años paga la mitad | ✅ Pasa |

(*) C03 se diseñó y se corrió en Red con edad 1 (obtuvo 20000). Después se cambió el supuesto de la edad mínima a 0 y la prueba pasó a usar edad 0 como borde inferior. Con el código existente pasa sin cambios, porque `edad <= EDAD_MAXIMA_GRATIS` ya incluye el 0.

**Refactor:** los números sueltos (10000, 20000, 3, 15, 60) se reemplazaron por constantes con nombre (`PRECIO_REGULAR`, `EDAD_MAXIMA_GRATIS`, etc.). Las 9 pruebas siguieron pasando.

**Refactor 2 (detectado por ESLint):** al configurar el lint, la regla `no-magic-numbers` marcó el `/ 2` del descuento. Se reemplazó por `PORCENTAJE_DESCUENTO = 50` y `PORCENTAJE_TOTAL = 100`, que expresan la regla del PO tal como está escrita ("50% off") y mantienen la aritmética entera. Las 9 pruebas siguieron pasando y la cobertura quedó en 100%.

**Resultado final:** 9 de 9 pruebas pasan.

**Commits:** esta sección se mergeó en `TP_6` con *squash* (commit `36a2a41`). El commit de cada paso (RED, GREEN y REFACTOR, de C01 a C09) se puede ver en la pestaña *Commits* del [PR #5](https://github.com/MarcosMarin25/ICS_G01_4K3_2026/pull/5). Desde la sección B, cada paso tiene su commit directamente en `TP_6`.


## B. Días de apertura (`CalendarioParque`)

Orden de ejecución: K01, K03, K02, K04, K05. K03 va antes que K02 porque es la que obliga a mirar el día de la semana. Si K02 iba segunda, pasaba con el *fake it* y no aportaba nada.

| # | Prueba | Esperado | Obtenido en Red | Obtenido en Green | Estrategia | Cambio en el código | Estado |
|---|---|---|---|---|---|---|---|
| K01 | Martes abierto (2026-10-20) | `true` | `Cannot find module '../src/logica/calendarioParque'` | `true` | Fake it | Se crea la clase con `estaAbierto()` que devuelve `true` | ✅ Pasa |
| K03 | Lunes cerrado (2026-10-19) | `false` | `true` | `false` | Implementación obvia | Se arma la fecha local con año, mes y día, y se cierra si `getDay()` es lunes | ✅ Pasa |
| K02 | Domingo abierto (2026-10-18) | `true` | Pasó sin cambios | `true` | Confirmación de borde | — | ✅ Pasa |
| K04 | Navidad cerrado (2026-12-25) | `false` | `true` | `false` | Implementación obvia | Se cierra si el mes es diciembre y el día es 25 | ✅ Pasa |
| K05 | Año Nuevo cerrado (2027-01-01) | `false` | `true` | `false` | Triangulación | El caso suelto de Navidad pasa a ser una lista de feriados fijos | ✅ Pasa |

**Trampa de zona horaria:** con la zona `America/Buenos_Aires`, `new Date("2026-10-19").getDay()` devuelve `0` (domingo), porque JavaScript interpreta la cadena `AAAA-MM-DD` en UTC y en UTC-3 cae el día anterior. `new Date(2026, 9, 19).getDay()` devuelve `1` (lunes). Por eso, desde el Green de K03, la fecha se arma con sus partes en la zona local.

**Refactor:**
- **K01:** no hubo nada que refactorizar, porque el código es una sola línea. No se hizo commit de refactor.
- **K03:** el `1` se reemplazó por la constante `LUNES` y el parseo se extrajo a `crearFechaLocal(fecha)`, con un comentario sobre la trampa de UTC. Queda dentro del módulo hasta que otra clase lo necesite.
- **K04:** el refactor se postergó a propósito, porque con un solo feriado no se veía la forma de la generalización. No se hizo commit de refactor.
- **K05:** los feriados pasaron a la constante `FERIADOS_FIJOS`, con el mes de 1 a 12 para no arrastrar el mes base 0 de `Date`. La condición se extrajo a `esFeriadoFijo()`, y `estaAbierto()` quedó como una sola regla: no es lunes y no es feriado fijo. La regla `no-magic-numbers` de ESLint marcó los números sueltos del Green.

En cada refactor las 14 pruebas siguieron pasando. Al final, el lint no da errores y la cobertura es del 100%.

**Commits** (rama `TP_6`):

| Paso | RED | GREEN | REFACTOR |
|---|---|---|---|
| K01 | `4b209d9` | `bab4543` | — (no hizo falta) |
| K03 | `1940ef0` | `ffe3b12` | `3cf98c5` |
| K02 | `9c95b41` (pasó sin cambios) | — | — |
| K04 | `ab95acb` | `a818f33` | — (postergado a K05) |
| K05 | `4e9cce4` | `4b7847f` | `01129af` |

**Resultado final:** 5 de 5 pruebas pasan.


## C. Compras que deben pasar (`ServicioCompraEntradas`)

_Pendiente._


## D. Compras que deben fallar (validaciones)

_Pendiente._


## Resumen

| Sección | Pruebas | Pasan | Fallan |
|---|---|---|---|
| A. Precio de cada entrada | 9 | 9 | 0 |
| B. Días de apertura | 5 | 5 | 0 |
| C. Compras que deben pasar | 18 | — | — |
| D. Compras que deben fallar | 26 | — | — |
| **Total** | **58** | **14** | **0** |
