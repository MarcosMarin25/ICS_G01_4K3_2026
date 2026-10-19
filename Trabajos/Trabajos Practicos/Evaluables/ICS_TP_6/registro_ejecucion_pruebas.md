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

Antes de P01 se agregaron los dobles de prueba en `tests/dobles/` (commit `ac5a0c3`), según la taxonomía de Gerard Meszaros:

| Doble | Tipo | Responsabilidad |
|---|---|---|
| `RelojFijo` | Stub | Devuelve una fecha y hora fijas, que se pueden cambiar con `fijar()` |
| `RepositorioUsuariosFalso` | Stub | Responde `estaRegistrado()` a partir de una lista fija |
| `RepositorioComprasFalso` | Fake | Repositorio en memoria que funciona de verdad: `registrar()` y `cantidadComprada()` |
| `ServicioMailEspia` | Spy | Registra a quién se envió la confirmación |
| `PasarelaMercadoPagoEspia` | Spy | Registra si se pidió la redirección y con qué monto |

| # | Prueba | Esperado | Obtenido en Red | Obtenido en Green | Estrategia | Cambio en el código | Estado |
|---|---|---|---|---|---|---|---|
| P01 | Compra válida con tarjeta | Confirmada, Mercado Pago por 50000 y mail enviado | `Cannot find module '../src/logica/servicioCompraEntradas'` | Lo esperado | Fake it | Se crea el servicio con las dependencias inyectadas. `comprar()` redirige por 50000 fijo, envía el mail y devuelve `confirmada: true` | ✅ Pasa |
| P02 | Compra en efectivo | Mercado Pago no se llama | `true` (se llamó) | `false` | Implementación obvia | Se redirige solo si `formaPago` es `"TARJETA"` | ✅ Pasa |
| P03 | Informa cantidad y fecha | `3` y `"2026-10-20"` | `undefined` | `3` y `"2026-10-20"` | Implementación obvia | El resultado devuelve `cantidadEntradas` y `fechaVisita` | ✅ Pasa |
| P04 | Hoy antes de las 17:30 | Confirmada | Pasó sin cambios | Confirmada | Confirmación de borde | — | ✅ Pasa |
| P05 | Hoy justo a las 17:30 | Confirmada | Pasó sin cambios | Confirmada | Confirmación de borde | — | ✅ Pasa |
| P06 | Justo un mes antes (2026-11-15) | Confirmada | Pasó sin cambios | Confirmada | Confirmación de borde | — | ✅ Pasa |
| P07 | 10 entradas | Confirmada, 10 entradas | Pasó sin cambios | Confirmada, 10 entradas | Confirmación de borde | — | ✅ Pasa |
| P08 | Una sola entrada | Confirmada | Pasó sin cambios | Confirmada | Confirmación de borde | — | ✅ Pasa |
| P09 | Pase regular | `"REGULAR"` | `undefined` | `"REGULAR"` | Implementación obvia | El resultado devuelve `tipoPase` | ✅ Pasa |
| P10 | Total con descuentos `[35, 10, 2, 65]` | `20000` | `undefined` | `20000` | Triangulación | El total se calcula sumando `calculadora.precioEntrada()` de cada edad | ✅ Pasa |
| P11 | Entrada de $0 `[30, 2]` | 2 entradas: 20000 y 0 | `TypeError: Cannot read properties of undefined (reading 'length')` | 2 entradas: 20000 y 0 | Implementación obvia | El resultado devuelve `entradas`, con la edad y el precio de cada una | ✅ Pasa |
| P12 | Edad 0 `[30, 0]` | Confirmada, entrada de 0 | Pasó sin cambios | Confirmada, entrada de 0 | Confirmación de borde | — | ✅ Pasa |
| P13 | 7 previas + 3 | Confirmada | Pasó sin cambios | Confirmada | Confirmación de borde | — | ✅ Pasa |
| P14 | 10 previas en otra fecha | Confirmada | Pasó sin cambios | Confirmada | Confirmación de borde | — | ✅ Pasa |
| P15 | La compra queda registrada | `3` | `0` | `3` | Implementación obvia | `comprar()` llama a `compras.registrar()` | ✅ Pasa |
| P16 | Mañana después de las 17:30 | Confirmada | Pasó sin cambios | Confirmada | Confirmación de borde | — | ✅ Pasa |
| P17 | Compras de otro usuario | Confirmada | Pasó sin cambios | Confirmada | Confirmación de borde | — | ✅ Pasa |
| P18 | Fin de mes (2027-01-31 → 2027-02-28) | Confirmada | Pasó sin cambios | Confirmada | Confirmación de borde | — | ✅ Pasa |

**Por qué hay tantas confirmaciones.** En esta sección todavía no existe ninguna regla que rechace una compra: las validaciones llegan en la sección D. Por eso P04 a P08, P12 a P14 y P16 a P18 pasan sin cambios. No se forzó un Red artificial. Estas pruebas son el **lado válido de cada valor límite**, y cobran valor en la sección D como red de seguridad. Por ejemplo, P05 (17:30) obliga a que F08 (17:31) se implemente con `>` y no con `>=`. P06 y P18 protegen el horizonte. P07 y P13 protegen el máximo de 10. P12 protege la edad mínima.

**Refactor:**
- **P01:** postergado a propósito. El 50000 fijo del *fake it* se mantuvo hasta que otra prueba obligara a calcularlo.
- **P02, P03, P09 y P15:** no hubo nada que refactorizar. El literal `"TARJETA"` aparece una sola vez, y se va a centralizar cuando la sección D agregue más valores de pase y de forma de pago.
- **P10:** se eliminó la duplicación entre la prueba y el código. La redirección a Mercado Pago pasó a usar el monto calculado en lugar del 50000 fijo de P01, que era el paso que faltaba para cerrar el *fake it*.
- **P11:** el precio de cada edad se calculaba dos veces, una para el total y otra para las entradas. Ahora primero se arman las entradas y el total se obtiene sumando sus precios.
- **Al cerrar la sección:** se documentó con JSDoc la interfaz que el servicio espera de cada dependencia (Principio de Inversión de Dependencias).

En cada refactor las pruebas siguieron pasando y el lint no dio errores. La cobertura quedó en 100%.

**Commits** (rama `TP_6`):

| Paso | RED | GREEN | REFACTOR |
|---|---|---|---|
| Dobles de prueba | — | — | `ac5a0c3` (agregado) |
| P01 | `b54bae8` | `1662631` | — (postergado a P10) |
| P02 | `f882732` | `922d8a2` | — |
| P03 | `f052fed` | `af7a219` | — |
| P04 | `8e54732` (pasó sin cambios) | — | — |
| P05 | `5d4ebb9` (pasó sin cambios) | — | — |
| P06 | `fb3990c` (pasó sin cambios) | — | — |
| P07 | `41bb8e5` (pasó sin cambios) | — | — |
| P08 | `762c1c1` (pasó sin cambios) | — | — |
| P09 | `1a5ced1` | `5db9357` | — |
| P10 | `8f8c272` | `c61d446` | `5498511` |
| P11 | `16b2271` | `da0d907` | `df21d0c` |
| P12 | `a375e37` (pasó sin cambios) | — | — |
| P13 | `b159820` (pasó sin cambios) | — | — |
| P14 | `43617ec` (pasó sin cambios) | — | — |
| P15 | `c2e1bc7` | `1b75426` | — |
| P16 | `4733f61` (pasó sin cambios) | — | — |
| P17 | `59ac185` (pasó sin cambios) | — | — |
| P18 | `e0a2219` (pasó sin cambios) | — | — |
| Cierre de la sección | — | — | `027f67a` (JSDoc de las interfaces) |

**Resultado final:** 18 de 18 pruebas pasan.


## D. Compras que deben fallar (validaciones)

_Pendiente._


## Resumen

| Sección | Pruebas | Pasan | Fallan |
|---|---|---|---|
| A. Precio de cada entrada | 9 | 9 | 0 |
| B. Días de apertura | 5 | 5 | 0 |
| C. Compras que deben pasar | 18 | 18 | 0 |
| D. Compras que deben fallar | 26 | — | — |
| **Total** | **58** | **32** | **0** |
