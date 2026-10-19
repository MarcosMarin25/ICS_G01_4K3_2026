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

Las pruebas se ejecutaron en orden numérico. Cada validación se insertó en su lugar dentro del orden definido: (1) usuario registrado, (2) datos obligatorios, (3) valores válidos, (4) reglas de fecha y (5) máximo por fecha. En la columna "Obtenido en Red", "No lanzó error" corresponde a `Received function did not throw`.

| # | Prueba | Esperado (mensaje) | Obtenido en Red | Obtenido en Green | Estrategia | Cambio en el código | Estado |
|---|---|---|---|---|---|---|---|
| F01 | Sin forma de pago | "Debe seleccionar una forma de pago" | No lanzó error | El mensaje esperado | Implementación obvia | Se exige `formaPago` | ✅ Pasa |
| F02 | Lunes (2026-10-19) | "El parque está cerrado en la fecha seleccionada" | No lanzó error | El mensaje esperado | Implementación obvia | Se consulta `calendario.estaAbierto()` | ✅ Pasa |
| F03 | Navidad (reloj 2026-12-20) | "El parque está cerrado en la fecha seleccionada" | Pasó sin cambios | El mensaje esperado | Confirmación de borde | — | ✅ Pasa |
| F04 | Año Nuevo (reloj 2026-12-20) | "El parque está cerrado en la fecha seleccionada" | Pasó sin cambios | El mensaje esperado | Confirmación de borde | — | ✅ Pasa |
| F05 | Fecha pasada (2026-10-14) | "La fecha de visita no puede ser anterior a hoy" | No lanzó error | El mensaje esperado | Implementación obvia | Se compara la fecha de visita con el día de hoy del reloj | ✅ Pasa |
| F06 | Sin fecha | "Debe indicar la fecha de visita" | `Cannot read properties of null (reading 'split')` (\*) | El mensaje esperado | Implementación obvia | Se exige `fechaVisita`, como primer dato obligatorio | ✅ Pasa |
| F07 | Más de un mes (2026-11-17) | "Solo se pueden comprar entradas con hasta un mes de anticipación" | No lanzó error | El mensaje esperado | Implementación obvia | Límite: `new Date(año, mes + 1, día)` | ✅ Pasa |
| F08 | Hoy a las 17:31 | "Las entradas para hoy se pueden comprar hasta las 17:30" | No lanzó error | El mensaje esperado | Implementación obvia | Si la fecha es hoy y son más de las 17:30, se rechaza | ✅ Pasa |
| F09 | 11 entradas | "No se pueden comprar más de 10 entradas para una misma fecha" | No lanzó error | El mensaje esperado | Implementación obvia | `cantidad > 10` | ✅ Pasa |
| F10 | Cantidad 0 | "La cantidad de entradas debe ser al menos 1" | No lanzó error | El mensaje esperado | Implementación obvia | `cantidad < 1` | ✅ Pasa |
| F11 | Cantidad -1 | "La cantidad de entradas debe ser al menos 1" | Pasó sin cambios | El mensaje esperado | Confirmación de borde | — | ✅ Pasa |
| F12 | 7 previas + 4 | "No se pueden comprar más de 10 entradas para una misma fecha" | No lanzó error | El mensaje esperado | Triangulación | Se suman las compras previas del usuario para la fecha | ✅ Pasa |
| F13 | 9 previas + `[30, 2]` | "No se pueden comprar más de 10 entradas para una misma fecha" | Pasó sin cambios | El mensaje esperado | Confirmación de borde | — (el máximo cuenta `cantidad`, incluida la entrada de $0) | ✅ Pasa |
| F14 | 3 entradas y 2 edades | "Debe indicar la edad de cada visitante" | No lanzó error | El mensaje esperado | Implementación obvia | `edades.length !== cantidad` | ✅ Pasa |
| F15 | Edad -1 | "Edad inválida" | No lanzó error | El mensaje esperado | Implementación obvia | `edad < 0` | ✅ Pasa |
| F16 | _Retirada_ | — | — | — | — | Ver la nota en `pruebas_comprar_entradas.md` | — |
| F17 | Sin tipo de pase | "Debe indicar el tipo de pase" | No lanzó error | El mensaje esperado | Implementación obvia | Se exige `tipoPase` | ✅ Pasa |
| F18 | Pase `"PREMIUM"` | "El tipo de pase debe ser VIP o regular" | No lanzó error | El mensaje esperado | Implementación obvia | Solo se acepta `"VIP"` o `"REGULAR"` | ✅ Pasa |
| F19 | Usuario no registrado | "Solo los usuarios registrados pueden comprar entradas" | No lanzó error | El mensaje esperado | Implementación obvia | Se consulta `usuarios.estaRegistrado()`, como primera validación | ✅ Pasa |
| F20 | Cantidad 2.5 | "La cantidad de entradas debe ser un número entero" | "Debe indicar la edad de cada visitante" (\*\*) | El mensaje esperado | Implementación obvia | Se valida que la cantidad sea entera antes que el mínimo y que las edades | ✅ Pasa |
| F21 | Edad 10.5 | "Edad inválida" | No lanzó error | El mensaje esperado | Implementación obvia | Las edades tienen que ser enteras | ✅ Pasa |
| F22 | Rechazo sin efectos secundarios | Error de máximo, sin mail, sin Mercado Pago y el repositorio en 7 | Pasó sin cambios (\*\*\*) | Lo esperado | Confirmación de borde | — | ✅ Pasa |
| F23 | Forma de pago `"CHEQUE"` | "La forma de pago debe ser tarjeta o efectivo" | No lanzó error | El mensaje esperado | Implementación obvia | Solo se acepta `"TARJETA"` o `"EFECTIVO"` | ✅ Pasa |
| F24 | 3 entradas y 4 edades | "Debe indicar la edad de cada visitante" | Pasó sin cambios | El mensaje esperado | Confirmación de borde | — (cubierta por el `!==` de F14) | ✅ Pasa |
| F25 | Fecha `2026-13-45` | "Fecha de visita inválida" | "Solo se pueden comprar entradas con hasta un mes de anticipación" (\*\*\*\*) | El mensaje esperado | Implementación obvia | Se rechazan el mes fuera de 1 a 12 y el día fuera de 1 a 31 | ✅ Pasa |
| F26 | Reloj 2027-01-31, fecha 2027-03-02 | "Solo se pueden comprar entradas con hasta un mes de anticipación" | No lanzó error | El mensaje esperado | Triangulación | Si el mes siguiente no tiene ese día, el límite es su último día | ✅ Pasa |
| F27 | Fecha `2026-02-30` | "Fecha de visita inválida" | "La fecha de visita no puede ser anterior a hoy" (\*\*\*\*) | El mensaje esperado | Triangulación | El chequeo de rangos se reemplaza por uno de ida y vuelta: se crea la fecha y se comparan año, mes y día | ✅ Pasa |

(\*) **F06:** sin la validación, el servicio no rechazaba la solicitud: **explotaba** con un `TypeError` al intentar leer la fecha. Esto muestra la diferencia entre un error de negocio (una solicitud inválida, con un mensaje para el usuario) y un bug.

(\*\*) **F20:** con 2.5 entradas y 3 edades, la primera validación que fallaba era la de las edades. El Red demuestra que **el orden de las validaciones importa**: la cantidad tiene que validarse completa (que sea entera y que sea al menos 1) antes de compararla con las edades. F11 (`cantidad: -1, edades: []`) exige lo mismo.

(\*\*\*) **F22, verificada con mutación:** como pasó sin cambios, se hizo un experimento sin commitear. Se movió `compras.registrar()` al principio de `comprar()`, antes de las validaciones. Fallaron F22 (`Expected: 7, Received: 11`), P07 y P13. Después se revirtió el cambio y se volvió a 53/53. La prueba sí protege el supuesto de que una compra inválida no tiene efectos secundarios.

(\*\*\*\*) **F25 y F27:** los dos Red muestran cómo `Date` convierte en silencio una fecha imposible. `2026-13-45` se transformó en una fecha de 2027 y el error salió por el horizonte. `2026-02-30` se transformó en el 02/03/2026 y el error salió como fecha pasada. F27 confirmó que un chequeo de rangos no alcanza (ver la nota de F25 y F27 en `pruebas_comprar_entradas.md`).

**F26, el defecto del fin de mes:** el límite de F07 se calculó con `new Date(año, mes + 1, día)`, que es la forma directa. F26 mostró el defecto: desde el 31/01, ese cálculo da el 03/03 y el 02/03 se aceptaba. P06 (15/11) y P18 (28/02) siguieron pasando con las dos implementaciones, y por eso hacía falta F26.

**Bordes protegidos por pruebas de la sección C:** al implementar F08 se verificó que P05 (17:30) y P16 (mañana a las 18:00) siguieran pasando, lo que confirma `>` y no `>=`. Con F12 siguieron pasando P13 (7 + 3 = 10) y P17 (otro usuario). Con F15 siguió pasando P12 (edad 0), lo que confirma `< 0` y no `<= 0`.

**Refactor:**
- **F05:** el parseo de la fecha quedó duplicado entre el calendario y el servicio. Se creó `src/logica/fechas.js`, con `crearFechaLocal()` e `inicioDelDia()`, y lo usan los dos módulos.
- **F08:** los números de la hora límite pasaron a `HORA_LIMITE_MISMO_DIA`, `MINUTO_LIMITE_MISMO_DIA` y `LIMITE_MISMO_DIA_EN_MINUTOS`, y se extrajo `minutosDelDia()` a `fechas.js`. El reloj pasó a consultarse una sola vez por compra.
- **F09:** el 10 pasó a la constante `MAXIMO_ENTRADAS_POR_FECHA`.
- **F18:** `"VIP"` aparecía en la calculadora y en el servicio, y `"TARJETA"` en el servicio. Se creó `src/logica/valores.js` con `TIPO_PASE` y `FORMA_PAGO`, que usan los dos módulos.
- **F26:** el cálculo del límite pasó a `fechas.js` como `mismoDiaDelMesSiguiente()`. En ese commit el lint todavía marcaba el 12 y el 31 del chequeo de rangos de F25, que se había postergado hasta F27 a propósito.
- **F25 y F27:** la verificación de que la fecha existe pasó a `fechas.js` como `esFechaExistente()`. El lint volvió a quedar sin errores.
- **Cierre de la sección:** las validaciones se extrajeron a métodos privados, uno por paso del orden: `#validarUsuario`, `#validarDatosObligatorios`, `#validarValores`, `#validarReglasDeFecha` y `#validarMaximoPorFecha`. También se extrajo `#emitirEntradas`. Ahora `comprar()` se lee como una lista de pasos.
- **F01, F02, F06, F10, F14, F15, F17, F19, F20, F21 y F23:** no hubo nada que refactorizar. Cada Green agregó una sola condición en su lugar y la estructura se mejoró al cerrar la sección.

En cada refactor las pruebas siguieron pasando. Al final hay 58/58 pruebas, el lint no da errores y la cobertura es del 100% en los cinco módulos de `src/`.

**Commits** (rama `TP_6`):

| Paso | RED | GREEN | REFACTOR |
|---|---|---|---|
| F01 | `68f2eae` | `d55091d` | — |
| F02 | `f9a942c` | `87abb81` | — |
| F03 | `7d5c7eb` (pasó sin cambios) | — | — |
| F04 | `03f2a16` (pasó sin cambios) | — | — |
| F05 | `06582b2` | `76acdbd` | `5d6bf34` |
| F06 | `146f725` | `fab7ff4` | — |
| F07 | `f84b73b` | `c28fc12` | — |
| F08 | `e10b1a1` | `c65473a` | `e65777e` |
| F09 | `7133df7` | `89966e6` | `6a03b39` |
| F10 | `529ca63` | `3dcfae7` | — |
| F11 | `62dcddf` (pasó sin cambios) | — | — |
| F12 | `cc73dfc` | `0c89853` | — |
| F13 | `dc3cde3` (pasó sin cambios) | — | — |
| F14 | `9e88e2c` | `992d09e` | — |
| F15 | `c3a5f28` | `fda96a1` | — |
| F17 | `54e5ccd` | `146a01e` | — |
| F18 | `37f31e2` | `4cf128d` | `f860be0` |
| F19 | `0c978e6` | `3053b2e` | — |
| F20 | `a1cb311` | `e34ce9c` | — |
| F21 | `8f29f36` | `734a010` | — |
| F22 | `db8a598` (pasó sin cambios) | — | — |
| F23 | `4ebc277` | `3013268` | — |
| F24 | `d66829f` (pasó sin cambios) | — | — |
| F25 | `cd0554b` | `7adef01` | — (postergado a F27) |
| F26 | `a06d65f` | `a5fc528` | `6da0faf` |
| F27 | `a5e3cb5` | `6de752d` | `471bb87` |
| Cierre de la sección | — | — | `20c9b8a` (métodos privados) |

**Resultado final:** 26 de 26 pruebas pasan.


## E. Validación por campo (`validarCampos`)

Esta sección se agregó para que la interfaz web pueda avisar los errores **en el momento**, mientras se completa el formulario. `comprar()` sigue cortando en el primer error. `validarCampos()` aplica las mismas reglas, pero devuelve el primer error de cada campo y no tiene efectos secundarios. Las pruebas V01 a V09 se diseñaron primero en `pruebas_comprar_entradas.md` (commit `0ea4e72`).

| # | Prueba | Esperado | Obtenido en Red | Obtenido en Green | Estrategia | Cambio en el código | Estado |
|---|---|---|---|---|---|---|---|
| V01 | Solicitud válida | `{}` | `TypeError: servicio.validarCampos is not a function` | `{}` | Fake it | `validarCampos()` devuelve `{}` | ✅ Pasa |
| V02 | Usuario no registrado | `{ usuario: "Solo los usuarios registrados..." }` | `{}` | Lo esperado | Implementación obvia | Se valida el usuario | ✅ Pasa |
| V03 | Pase vacío y pago `"CHEQUE"` | Los dos errores a la vez | `{}` | Lo esperado | Implementación obvia | Se validan el tipo de pase y la forma de pago, cada uno en su campo | ✅ Pasa |
| V04 | Lunes | `{ fechaVisita: "El parque está cerrado..." }` | `{}` | Lo esperado | Implementación obvia | Se valida la fecha: obligatoria, existente y las reglas de fecha (se reutiliza `#validarReglasDeFecha`) | ✅ Pasa |
| V05 | Edades [30, -1, 8] | `{ edades: "Edad inválida" }` | `{}` | Lo esperado | Implementación obvia | Se validan las edades | ✅ Pasa |
| V06 | 2.5 entradas con 3 edades | `{ cantidad: "...número entero" }` | `{ edades: "Debe indicar la edad de cada visitante" }` (\*) | Lo esperado | Triangulación | Se valida la cantidad, y las edades solo se comparan si la cantidad es válida | ✅ Pasa |
| V07 | 7 previas + 4 | `{ cantidad: "No se pueden comprar más de 10..." }` | `{}` | Lo esperado | Implementación obvia | Se evalúa el máximo si la cantidad es válida (se reutiliza `#validarMaximoPorFecha`) | ✅ Pasa |
| V08 | Sin efectos secundarios | Sin mail, sin Mercado Pago y el repositorio en 0 | Pasó sin cambios | Lo esperado | Confirmación de borde | — | ✅ Pasa |
| V09 | Fecha `2026-13-45` y 11 entradas | `{ fechaVisita: "Fecha de visita inválida" }` | El esperado más `cantidad: "No se pueden comprar más de 10..."` (\*\*) | Lo esperado | Triangulación | El máximo se evalúa solo si el usuario, la fecha y la cantidad son válidos | ✅ Pasa |

(\*) **V06** repite la lección de F20 en la validación por campo: una cantidad inválida no se puede comparar con las edades.

(\*\*) **V09:** con una fecha inexistente, el máximo se calculaba igual sobre esa fecha. Una regla que depende de otro campo no tiene que evaluarse si ese campo es inválido.

**Refactor:**
- **V01 a V09:** cada Green agregó una condición en su lugar dentro de `validarCampos()`. Al terminar la sección, las reglas estaban **duplicadas**: una vez en los métodos privados de `comprar()` y otra en `validarCampos()`. La cobertura lo mostró: bajó al 96%, porque algunas ramas de `validarCampos()` no tenían una prueba propia.
- **Cierre de la sección:** todas las reglas pasaron a una **tabla única** (`REGLAS`), en el orden del ADR 6. Cada regla indica en qué campo informa su error, de qué campos depende (`requiere`) y cuándo se incumple.
  - `comprar()` lanza el error de la primera regla que no se cumple, igual que antes.
  - `validarCampos()` recorre la tabla y guarda el primer error de cada campo, salteando las reglas cuyo campo ya tiene un error o que dependen de un campo inválido.
  - Las 58 pruebas anteriores siguieron pasando sin cambios, así que el comportamiento de `comprar()` y el orden de las validaciones no cambiaron.
  - La cobertura volvió al 100%: cada regla tiene una sola definición, cubierta por las pruebas F, y las V cubren cómo se combinan.

**Commits** (rama `TP_6`):

| Paso | RED | GREEN | REFACTOR |
|---|---|---|---|
| V01 | `961b9ea` | `d116672` | — |
| V02 | `6362721` | `2f19a3d` | — |
| V03 | `d8eaeb3` | `7b8f6a6` | — |
| V04 | `52b0afe` | `04e660d` | — |
| V05 | `b5d4b02` | `5f04547` | — |
| V06 | `b922fca` | `5451d90` | — |
| V07 | `30d29c8` | `be495f0` | — |
| V08 | `2fe0a65` (pasó sin cambios) | — | — |
| V09 | `034b86e` | `ef5ada8` | — |
| Cierre de la sección | — | — | `22693d3` (tabla única de reglas) |

**Resultado final:** 9 de 9 pruebas pasan.


## Resumen

| Sección | Pruebas | Pasan | Fallan |
|---|---|---|---|
| A. Precio de cada entrada | 9 | 9 | 0 |
| B. Días de apertura | 5 | 5 | 0 |
| C. Compras que deben pasar | 18 | 18 | 0 |
| D. Compras que deben fallar | 26 | 26 | 0 |
| E. Validación por campo | 9 | 9 | 0 |
| **Total** | **67** | **67** | **0** |

**Cobertura** (`npm run test:coverage`): 100% de sentencias (98/98), ramas (31/31), funciones (34/34) y líneas (93/93) en los cinco módulos de `src/logica/` (`calculadoraPrecios.js`, `calendarioParque.js`, `fechas.js`, `servicioCompraEntradas.js` y `valores.js`). Después del refactor de la sección E hay menos ramas y más funciones que antes, porque cada regla de validación pasó a ser una función de la tabla `REGLAS` en lugar de un `if`. Evidencia: [`reportes/cobertura.txt`](reportes/cobertura.txt) y [`reportes/cobertura.png`](reportes/cobertura.png). **Lint** (`npm run lint`): sin errores.
