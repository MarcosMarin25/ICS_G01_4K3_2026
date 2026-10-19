# TP 6 - TDD: Pruebas de la User Story "Comprar entradas"

## User Story

| Comprar entradas | 8 |
Como visitante quiero comprar una entrada para asegurar mi visita al parque 

### Criterios de aceptación

1. Debe indicar la fecha de visita deseada, la cantidad de entradas requeridas, la edad de cada visitante y el tipo de pase (VIP o regular).
2. La fecha de visita puede ser del día actual o futura.
3. Debe enviar un mensaje de confirmación vía mail.
4. Debe redirigir a Mercado Pago al confirmar la compra si el pago es con tarjeta de crédito.
5. La fecha de la visita debe estar dentro de los días en que el parque está abierto.
6. Debe seleccionar la forma de pago: efectivo (pago en boletería) o tarjeta.
7. La cantidad de entradas requeridas no debe ser mayor a 10.
8. Al finalizar la compra se debe informar la cantidad de entradas compradas y la fecha.
9. Solo se permite la compra de entradas a usuarios registrados.

### Pruebas de usuario

- Comprar una entrada con fecha dentro de los días disponibles, cantidad menor a 10, edad de todos los visitantes, tipo de pase, pago con tarjeta mediante Mercado Pago y recepción del mail de confirmación **(pasa)**.
- Comprar entradas sin seleccionar forma de pago **(falla)**.
- Comprar entradas con una fecha en la que el parque está cerrado **(falla)**.
- Comprar entradas con una cantidad mayor a 10 **(falla)**.


## Reglas aclaradas por el PO (FAQ)

### Reglas que se prueban

| Regla | Detalle |
|---|---|
| R1. Días de apertura | Abre todos los días menos los **lunes**, el **25 de diciembre** y el **1 de enero**. |
| R2. Precio de las entradas | **VIP: $20.000** y **regular: $10.000** (el FAQ 6 lo llama pase "Común"). Para esta US, el precio es la única diferencia entre los pases. |
| R3. Descuentos por edad | **Hasta 3 años inclusive: no pagan.** **Hasta 15 años inclusive: 50% off.** **Desde 60 años inclusive: 50% off.** |
| R4. Horizonte de compra | Se compra con **no más de un mes** de anticipación. |
| R5. Límite horario para el mismo día | Para visitar el día actual se puede comprar **hasta las 17:30** (1 h 30 min antes del cierre de las 19:00). |
| R6. Máximo de 10 entradas por fecha | Un usuario puede comprar **como máximo 10 entradas para una misma fecha**, sumando todas sus compras para esa fecha. |
| R7. Menores de hasta 3 años cuentan en el máximo | Los menores que no pagan **entran dentro de las 10** entradas. |
| R8. Entrada de $0 | A los menores de hasta 3 años se les **emite igual una entrada**, con precio **$0**. |

### Reglas que no se prueban con pruebas unitarias

| Regla | FAQ | Por qué | Cómo se resolvió |
|---|---|---|---|
| El calendario debe mostrar deshabilitados los días cerrados | FAQ 2 | Es comportamiento de la interfaz. La lógica que decide qué días están cerrados sí se prueba (R1, K01 a K05), y el servicio igual rechaza una fecha cerrada por si llega una (F02 a F04). | Calendario propio en la web: cada día se habilita o deshabilita según las mismas reglas de la lógica (`validarCampos()`), sin repetirlas. |
| Paleta de colores y fuente Lato | FAQ 3 | Es diseño visual. | Paleta oficial `#386641`, `#6A994E`, `#A7C957`, `#F2E8CF`, `#BC4749` en variables CSS, con contraste WCAG AA verificado, y fuente Lato. |
| Simular Mercado Pago con una pantalla "Mercado Pago Compra Exitosa" | FAQ 4 | Se resuelve en la interfaz. En las pruebas, Mercado Pago se reemplaza por un espía que registra si fue llamado y con qué monto (P01, P02, F22). | Pantalla simulada con el monto pagado. |
| Simular el mail con un modal "Mail enviado a ..." | FAQ 5 | Se resuelve en la interfaz. En las pruebas, el mail se reemplaza por un espía que registra a quién se envió (P01, P02, F22). | Modal con el mail del usuario de la sesión. |
| Logo de EcoHarmony Park | FAQ 17 | Es diseño visual. | Propuesta del grupo en SVG con la paleta oficial, pendiente de validación del PO. |
| Sesión y usuario mockeados | FAQ 19 | La autenticación real no es parte de esta US. La regla de negocio (solo usuarios registrados) sí se prueba con un stub (F19, V02). | Sesión simulada con dos usuarios de prueba. |
| App mobile / web responsive | FAQ 24 | Es diseño visual. | Diseño *mobile first*, verificado a 360 px y a 1280 px. |
| Solo DNI | — | No aplica: esta US no pide documento. Es de "Inscribirme a actividad". | — |


## Supuestos de diseño para las pruebas

- La lógica se reparte en tres piezas, cada una con sus pruebas:
  - `CalculadoraPrecios`: calcula el precio de una entrada según la edad y el tipo de pase.
  - `CalendarioParque`: indica si el parque abre en una fecha dada.
  - `ServicioCompraEntradas`: valida la solicitud y concreta la compra con el método `comprar(solicitud)`.
- La solicitud contiene: `usuario`, `fechaVisita`, `cantidad`, `edades` (una por visitante), `tipoPase` y `formaPago`.
- Las dependencias externas se reemplazan por dobles de prueba (mocks/stubs), así las pruebas son rápidas y no dependen de servicios reales:
  - `RepositorioUsuarios`: indica si un usuario está registrado. El PO permite empezar con la sesión y el usuario mockeados.
  - `RepositorioCompras`: indica cuántas entradas compró ya un usuario para una fecha.
  - `ServicioMail`: registra si se envió el mail de confirmación.
  - `PasarelaMercadoPago`: registra si se pidió la redirección al pago y con qué monto.
  - `Reloj`: da la **fecha y hora** actuales de forma fija, para que las pruebas no cambien según el momento en que se corren.
- En el código, el tipo de pase toma los valores `"VIP"` o `"REGULAR"` y la forma de pago `"TARJETA"` o `"EFECTIVO"`. Cualquier otro valor es inválido.
- El pase que la US llama "regular" es el que el FAQ 6 llama "Común": son el mismo pase. Para ser coherentes con la US, en el código se usa `"REGULAR"` y en la web se muestra "Regular".
- El tipo de pase se elige una vez por compra y vale para todas sus entradas.
- El máximo es **10 entradas inclusive** (≤ 10). El criterio 7 dice "no debe ser mayor a 10" y la prueba de usuario del enunciado dice "cantidad menor a 10". Se toma el criterio de aceptación porque es la regla, y la prueba de usuario se lee como un ejemplo que pasa. P07 prueba el borde de 10.
- El criterio 2 del enunciado original dice "fecha de visita guiada". Se transcribe como "fecha de visita", porque esta US no trata sobre visitas guiadas.
- Los descuentos no se acumulan. A cada edad le corresponde un solo precio:

  | Edad | Precio |
  |---|---|
  | 0 a 3 | $0 |
  | 4 a 15 | 50% |
  | 16 a 59 | 100% |
  | 60 o más | 50% |

- La cantidad de entradas y las edades deben ser números enteros; valores decimales (flotantes) son inválidos. La edad mínima válida es 0 años: un bebé menor de 1 año tiene edad 0 y por R3 no paga. Una edad negativa es inválida. No se define una edad máxima porque el PO no la especifica: toda edad entera mayor o igual a 0 es válida. Se descartó usar un tope arbitrario (por ejemplo 120) o la esperanza de vida (81,44 años en mujeres, INDEC 2020), porque es un promedio y no un límite, y se rechazaría a visitantes reales. La cantidad de edades ingresadas debe coincidir exactamente con la cantidad de entradas solicitadas: no pueden faltar ni sobrar.
- La fecha de visita tiene el formato `AAAA-MM-DD` y tiene que ser una fecha que exista en el calendario. Son inválidas tanto `2026-13-45` (mes y día fuera de rango) como `2026-02-30` (mes y día en rango, pero febrero no tiene 30 días). JavaScript no rechaza esas fechas: las convierte en silencio (`new Date(2026, 1, 30)` da el 02/03/2026 y `new Date(2026, 12, 45)` da el 14/02/2027). Por eso la validación comprueba que el año, el mes y el día de la fecha creada sean los mismos que se ingresaron.
- "No más de un mes" significa hasta el mismo día del mes siguiente, inclusive. Por ejemplo, desde el 15/10 se puede comprar hasta el 15/11. Si el mes siguiente no tiene ese día, el límite es el último día del mes siguiente: desde el 31/01 se puede comprar hasta el 28/02.
- El límite de las 17:30 es inclusive y aplica solo a compras para el día actual. Para una fecha futura se puede comprar a cualquier hora.
- El máximo de 10 entradas es por usuario y por fecha: las compras de otros usuarios no cuentan.
- Cuando la compra es válida, queda registrada en el repositorio de compras, para que cuente en el máximo de las compras siguientes.
- Si la compra es inválida, el servicio lanza un error de validación con un mensaje descriptivo, y no envía el mail, no redirige a Mercado Pago y no registra la compra.
- Las validaciones siguen un orden fijo, y el servicio informa **solo el primer error** que encuentra:
  1. Usuario registrado (F19).
  2. Datos obligatorios presentes: fecha de visita (F06), tipo de pase (F17) y forma de pago (F01).
  3. Valores válidos: fecha existente (F25, F27), tipo de pase (F18), forma de pago (F23), cantidad entera (F20) y mayor o igual a 1 (F10, F11), una edad por entrada (F14, F24) y edades enteras mayores o iguales a 0 (F15, F21).
  4. Reglas de fecha: no anterior a hoy (F05), parque abierto (F02, F03, F04), hasta un mes de anticipación (F07, F26) y límite de las 17:30 para el día actual (F08).
  5. Máximo de 10 entradas por usuario y por fecha (F09, F12, F13, F22).

  El orden importa cuando una solicitud tiene más de un dato inválido. F11 (`cantidad: -1, edades: []`) y F20 (`cantidad: 2.5` con 3 edades) esperan el error de la cantidad y no el de las edades, por eso la cantidad se valida completa antes de compararla con las edades. Por el mismo motivo, F26 usa el 2027-03-02 y no el 2027-03-01: el 01/03 es lunes y daría primero el error de parque cerrado. Los datos se revisan antes que las reglas de negocio, para no consultar el calendario, el reloj o el repositorio con datos que no tienen sentido.
- Para que la interfaz pueda avisar los errores **en el momento**, mientras el usuario completa el formulario, el servicio ofrece además `validarCampos(solicitud)`. Este método aplica las **mismas reglas** que `comprar()`, pero en lugar de cortar en el primer error devuelve un objeto con **el primer error de cada campo** (por ejemplo `{ fechaVisita: "...", cantidad: "..." }`), o `{}` si no hay errores. No registra la compra, no envía el mail y no redirige. Una regla que depende de otro campo no se evalúa si ese campo es inválido:
  - Las edades no se comparan con la cantidad si la cantidad es inválida.
  - El máximo por fecha no se evalúa si el usuario, la fecha o la cantidad son inválidos.
  - Los errores de las reglas de fecha y del máximo se informan en el campo `fechaVisita` y en el campo `cantidad`, respectivamente.
- Para los ejemplos, "ahora" es el **jueves 2026-10-15 a las 10:00**. Las pruebas de feriados cambian el reloj al **domingo 2026-12-20 a las 10:00**, para que el 25/12 y el 1/1 queden dentro del mes de anticipación.


## Parte 1: Pruebas en lenguaje natural

Las pruebas están en el orden sugerido para el ciclo **Red → Green → Refactor**: primero las piezas más chicas (precio y calendario), después el camino feliz de la compra y al final cada regla de validación, una por una.

### A. Precio de cada entrada (`CalculadoraPrecios`)

| # | Prueba | Datos de entrada | Resultado esperado | Regla |
|---|---|---|---|---|
| C01 | Adulto con pase regular | Edad 30, `"REGULAR"` | $10.000 | R2 |
| C02 | Adulto con pase VIP | Edad 30, `"VIP"` | $20.000 | R2 |
| C03 | Bebé de 0 años no paga (borde inferior) | Edad 0, `"VIP"` | $0 | R3, R8 |
| C04 | Niño de 3 años no paga (borde) | Edad 3, `"VIP"` | $0 | R3, R8 |
| C05 | Niño de 4 años paga la mitad (borde) | Edad 4, `"REGULAR"` | $5.000 | R3 |
| C06 | Persona de 15 años paga la mitad (borde) | Edad 15, `"VIP"` | $10.000 | R3 |
| C07 | Persona de 16 años paga entero (borde) | Edad 16, `"REGULAR"` | $10.000 | R3 |
| C08 | Persona de 59 años paga entero (borde) | Edad 59, `"VIP"` | $20.000 | R3 |
| C09 | Persona de 60 años paga la mitad (borde) | Edad 60, `"REGULAR"` | $5.000 | R3 |

### B. Días de apertura (`CalendarioParque`)

| # | Prueba | Datos de entrada | Resultado esperado | Regla |
|---|---|---|---|---|
| K01 | Un martes está abierto | 2026-10-20 (martes) | Abierto | R1 |
| K02 | Un domingo está abierto | 2026-10-18 (domingo) | Abierto | R1 |
| K03 | Un lunes está cerrado | 2026-10-19 (lunes) | Cerrado | R1 |
| K04 | Navidad está cerrado | 2026-12-25 (viernes) | Cerrado | R1 |
| K05 | Año Nuevo está cerrado | 2027-01-01 (viernes) | Cerrado | R1 |

### C. Compras que deben pasar (`ServicioCompraEntradas`)

| # | Prueba | Datos de entrada | Resultado esperado | Criterio / Regla |
|---|---|---|---|---|
| P01 | Compra válida con tarjeta (prueba de usuario del enunciado) | Usuario registrado, 2026-10-20, 3 entradas, edades [30, 28, 8], pase VIP, tarjeta | La compra se confirma, se redirige a Mercado Pago por $50.000 y se envía el mail de confirmación | CA 1, 3, 4, 6 |
| P02 | Compra válida en efectivo | Igual a P01 pero con pago en efectivo | La compra se confirma, se envía el mail y no se redirige a Mercado Pago | CA 3, 4, 6 |
| P03 | Se informa cantidad y fecha al finalizar | Compra válida de 3 entradas para el 2026-10-20 | El resultado informa "3 entradas" y la fecha "2026-10-20" | CA 8 |
| P04 | Compra para hoy antes de las 17:30 | Fecha = hoy (2026-10-15), hora 10:00 | La compra se confirma | CA 2, R5 |
| P05 | Compra para hoy justo a las 17:30 (borde) | Fecha = hoy, hora 17:30 | La compra se confirma | R5 |
| P06 | Compra justo un mes antes (borde) | Hoy 2026-10-15, fecha 2026-11-15 (domingo) | La compra se confirma | R4 |
| P07 | Cantidad igual al máximo permitido (borde) | 10 entradas con 10 edades | La compra se confirma | CA 7, R6 |
| P08 | Compra de una sola entrada (borde inferior) | 1 entrada con 1 edad | La compra se confirma | CA 7 |
| P09 | Compra con pase regular | Compra válida con pase `"REGULAR"` | La compra se confirma con tipo de pase `"REGULAR"` | CA 1, R2 |
| P10 | Monto total con descuentos por edad | Edades [35, 10, 2, 65], pase `"REGULAR"` | Total $20.000 ($10.000 + $5.000 + $0 + $5.000) | R2, R3 |
| P11 | El menor de hasta 3 años recibe su entrada de $0 | Edades [30, 2], pase VIP | Se emiten 2 entradas: una de $20.000 y otra de $0 | R8 |
| P12 | Edad de 0 años es válida (borde inferior) | Edades [30, 0], pase `"VIP"` | La compra se confirma y la entrada del bebé es de $0 | CA 1, R3, R8 |
| P13 | Varias compras que suman 10 para la misma fecha | El usuario ya compró 7 para el 2026-10-20 y compra 3 más | La compra se confirma | R6 |
| P14 | El máximo es por fecha | El usuario ya compró 10 para el 2026-10-20 y compra 3 para el 2026-10-21 | La compra se confirma | R6 |
| P15 | La compra confirmada queda registrada | Compra válida de 3 entradas para el 2026-10-20 | El repositorio de compras indica 3 entradas del usuario para el 2026-10-20 | R6 |
| P16 | Compra para mañana después de las 17:30 | Hoy 2026-10-15 a las 18:00, fecha 2026-10-16 (viernes) | La compra se confirma: el límite de las 17:30 aplica solo al día actual | R5 |
| P17 | Las compras de otro usuario no cuentan en el máximo | Otro usuario registrado ya compró 10 para el 2026-10-20 y el usuario compra 3 para esa fecha | La compra se confirma: el máximo es por usuario | R6 |
| P18 | Horizonte de un mes a fin de mes (borde) | Hoy 2027-01-31 a las 10:00, fecha 2027-02-28 (domingo) | La compra se confirma: el límite es el último día de febrero | R4 |

### D. Compras que deben fallar (validaciones)

| # | Prueba | Datos de entrada | Resultado esperado | Criterio / Regla |
|---|---|---|---|---|
| F01 | Sin forma de pago | Forma de pago vacía | Error "Debe seleccionar una forma de pago" | CA 6 |
| F02 | Parque cerrado un lunes | Fecha = 2026-10-19 (lunes) | Error "El parque está cerrado en la fecha seleccionada" | CA 5, R1 |
| F03 | Parque cerrado en Navidad | Hoy 2026-12-20, fecha 2026-12-25 | Error "El parque está cerrado en la fecha seleccionada" | CA 5, R1 |
| F04 | Parque cerrado en Año Nuevo | Hoy 2026-12-20, fecha 2027-01-01 | Error "El parque está cerrado en la fecha seleccionada" | CA 5, R1 |
| F05 | Fecha pasada | Fecha = 2026-10-14 (ayer) | Error "La fecha de visita no puede ser anterior a hoy" | CA 2 |
| F06 | Sin fecha de visita | Fecha vacía | Error "Debe indicar la fecha de visita" | CA 1 |
| F07 | Más de un mes de anticipación | Hoy 2026-10-15, fecha 2026-11-17 (martes) | Error "Solo se pueden comprar entradas con hasta un mes de anticipación" | R4 |
| F08 | Compra para hoy después de las 17:30 | Fecha = hoy, hora 17:31 | Error "Las entradas para hoy se pueden comprar hasta las 17:30" | R5 |
| F09 | Cantidad mayor a 10 | 11 entradas | Error "No se pueden comprar más de 10 entradas para una misma fecha" | CA 7, R6 |
| F10 | Cantidad cero | 0 entradas | Error "La cantidad de entradas debe ser al menos 1" | CA 1, 7 |
| F11 | Cantidad negativa | -1 entradas | Error "La cantidad de entradas debe ser al menos 1" | CA 1, 7 |
| F12 | Varias compras que superan 10 para la misma fecha | El usuario ya compró 7 para el 2026-10-20 y compra 4 más | Error "No se pueden comprar más de 10 entradas para una misma fecha" | R6 |
| F13 | Los menores de hasta 3 años cuentan en el máximo | El usuario ya compró 9 para el 2026-10-20 y compra 2 más, edades [30, 2] | Error "No se pueden comprar más de 10 entradas para una misma fecha" | R7 |
| F14 | Faltan edades | 3 entradas y solo 2 edades | Error "Debe indicar la edad de cada visitante" | CA 1 |
| F15 | Edad negativa | Una edad negativa (-1) | Error "Edad inválida" | CA 1 |
| F16 | _Retirada_ | — | — | — |
| F17 | Sin tipo de pase | Tipo de pase vacío | Error "Debe indicar el tipo de pase" | CA 1 |
| F18 | Tipo de pase inválido | Tipo de pase = `"PREMIUM"` | Error "El tipo de pase debe ser VIP o regular" | CA 1 |
| F19 | Usuario no registrado | Usuario que no existe | Error "Solo los usuarios registrados pueden comprar entradas" | CA 9 |
| F20 | Cantidad decimal | 2.5 entradas | Error "La cantidad de entradas debe ser un número entero" | CA 1, 7 |
| F21 | Edad decimal | Edades [30, 10.5, 8] | Error "Edad inválida" | CA 1 |
| F22 | Una compra rechazada no tiene efectos secundarios | El usuario ya compró 7 para el 2026-10-20 y compra 4 más (falla en la última validación) | Error "No se pueden comprar más de 10 entradas para una misma fecha". No se envía el mail, no se redirige a Mercado Pago y el repositorio sigue indicando 7 | CA 3, 4, R6 |
| F23 | Forma de pago inválida | Forma de pago = `"CHEQUE"` | Error "La forma de pago debe ser tarjeta o efectivo" | CA 6 |
| F24 | Sobran edades | 3 entradas y 4 edades | Error "Debe indicar la edad de cada visitante" | CA 1 |
| F25 | Fecha con mes o día fuera de rango | Fecha = `"2026-13-45"` | Error "Fecha de visita inválida" | CA 1 |
| F26 | Más de un mes de anticipación a fin de mes | Hoy 2027-01-31 a las 10:00, fecha 2027-03-02 (martes) | Error "Solo se pueden comprar entradas con hasta un mes de anticipación" | R4 |
| F27 | Fecha que no existe | Fecha = `"2026-02-30"` | Error "Fecha de visita inválida" | CA 1 |

**Nota sobre F16.** F16 probaba que una edad 0 era inválida. Cuando se cambió el supuesto de la edad mínima (un bebé menor de 1 año tiene edad 0 y no paga), ese caso pasó a ser válido. Ahora lo cubre P12 (`[30, 0]` se confirma con una entrada de $0) y C03 usa la edad 0 como borde inferior. El código F16 no se reutiliza, para que cada código conserve un solo significado en todos los documentos. El borde inválido de la edad lo cubre F15 (-1).

**Nota sobre F26.** El 2027-03-01 es lunes y el parque está cerrado, así que se usa el 2027-03-02 para que el único motivo de rechazo sea el horizonte. Esta prueba detecta un defecto concreto: sumar un mes con `setMonth(mes + 1)` desde el 31/01 da el 03/03, porque febrero no tiene día 31, y con esa implementación el 02/03 se aceptaría.

**Nota sobre F25 y F27.** Son dos clases de equivalencia distintas de fechas inválidas. En F25 el mes y el día están fuera de rango (mes 13). En F27 cada valor está en rango, pero la combinación no existe (30 de febrero). F27 es necesaria porque una validación que solo revise los rangos (mes de 1 a 12, día de 1 a 31) aceptaría el `2026-02-30`, y `Date` la convertiría en el 02/03 sin dar error.

### E. Validación por campo (`validarCampos`)

| # | Prueba | Datos de entrada | Resultado esperado | Criterio / Regla |
|---|---|---|---|---|
| V01 | Una solicitud válida no tiene errores | Solicitud válida | `{}` | CA 1 |
| V02 | Usuario no registrado | Usuario que no existe | `{ usuario: "Solo los usuarios registrados pueden comprar entradas" }` | CA 9 |
| V03 | Errores de varios campos a la vez | Tipo de pase vacío y forma de pago `"CHEQUE"` | `{ tipoPase: "Debe indicar el tipo de pase", formaPago: "La forma de pago debe ser tarjeta o efectivo" }` | CA 1, 6 |
| V04 | Las reglas de fecha se informan en la fecha | Fecha = 2026-10-19 (lunes) | `{ fechaVisita: "El parque está cerrado en la fecha seleccionada" }` | CA 5, R1 |
| V05 | Edad inválida | Edades [30, -1, 8] | `{ edades: "Edad inválida" }` | CA 1 |
| V06 | Las edades no se comparan si la cantidad es inválida | 2.5 entradas con 3 edades | `{ cantidad: "La cantidad de entradas debe ser un número entero" }` (sin error en `edades`) | CA 1, 7 |
| V07 | El máximo por fecha se informa en la cantidad | El usuario ya compró 7 para el 2026-10-20 y pide 4 más | `{ cantidad: "No se pueden comprar más de 10 entradas para una misma fecha" }` | CA 7, R6 |
| V08 | Validar no tiene efectos secundarios | Solicitud válida | No se envía el mail, no se redirige y el repositorio sigue en 0 | CA 3, 4 |
| V09 | El máximo no se evalúa si la fecha es inválida | Fecha `"2026-13-45"` y 11 entradas | `{ fechaVisita: "Fecha de visita inválida" }` (sin error en `cantidad`) | CA 1, 7 |

## Parte 2: Pruebas en pseudocódigo

Las pruebas siguen el formato de Jest: `describe` agrupa las pruebas, `test` define cada una con su descripción y `expect` verifica el resultado. Cada prueba lleva adelante el número que tiene en la Parte 1.

### Preparación común

```js
const AHORA         = "2026-10-15T10:00";   // jueves
const HOY           = "2026-10-15";
const AYER          = "2026-10-14";
const FECHA_ABIERTA = "2026-10-20";          // martes
const FECHA_CERRADA = "2026-10-19";          // lunes
const USUARIO       = "visitante@mail.com";
const OTRO_USUARIO  = "otro@mail.com";

let reloj, calendario, calculadora, compras, mail, mercadoPago, servicio;

beforeEach(() => {
  reloj       = new RelojFijo(AHORA);
  calendario  = new CalendarioParque();
  calculadora = new CalculadoraPrecios();
  compras     = new RepositorioComprasFalso();        // arranca sin compras previas
  mail        = new ServicioMailEspia();
  mercadoPago = new PasarelaMercadoPagoEspia();
  const usuarios = new RepositorioUsuariosFalso([USUARIO, OTRO_USUARIO]);

  servicio = new ServicioCompraEntradas({
    reloj, calendario, calculadora, usuarios, compras, mail, mercadoPago,
  });
});

// Devuelve una solicitud válida. Cada prueba cambia solo el dato que le interesa.
function solicitudValida(cambios = {}) {
  return {
    usuario:     USUARIO,
    fechaVisita: FECHA_ABIERTA,
    cantidad:    3,
    edades:      [30, 28, 8],
    tipoPase:    "VIP",
    formaPago:   "TARJETA",
    ...cambios,
  };
}
```

### A. Precio de cada entrada

```js
describe("CalculadoraPrecios", () => {
  test("C01 - un adulto con pase regular paga $10.000", () => {
    expect(calculadora.precioEntrada(30, "REGULAR")).toBe(10000);
  });

  test("C02 - un adulto con pase VIP paga $20.000", () => {
    expect(calculadora.precioEntrada(30, "VIP")).toBe(20000);
  });

  test("C03 - un bebé de 0 años no paga", () => {
    expect(calculadora.precioEntrada(0, "VIP")).toBe(0);
  });

  test("C04 - un niño de 3 años no paga", () => {
    expect(calculadora.precioEntrada(3, "VIP")).toBe(0);
  });

  test("C05 - un niño de 4 años paga la mitad", () => {
    expect(calculadora.precioEntrada(4, "REGULAR")).toBe(5000);
  });

  test("C06 - una persona de 15 años paga la mitad", () => {
    expect(calculadora.precioEntrada(15, "VIP")).toBe(10000);
  });

  test("C07 - una persona de 16 años paga entero", () => {
    expect(calculadora.precioEntrada(16, "REGULAR")).toBe(10000);
  });

  test("C08 - una persona de 59 años paga entero", () => {
    expect(calculadora.precioEntrada(59, "VIP")).toBe(20000);
  });

  test("C09 - una persona de 60 años paga la mitad", () => {
    expect(calculadora.precioEntrada(60, "REGULAR")).toBe(5000);
  });
});
```

### B. Días de apertura

```js
describe("CalendarioParque", () => {
  test("K01 - un martes el parque está abierto", () => {
    expect(calendario.estaAbierto("2026-10-20")).toBe(true);
  });

  test("K02 - un domingo el parque está abierto", () => {
    expect(calendario.estaAbierto("2026-10-18")).toBe(true);
  });

  test("K03 - un lunes el parque está cerrado", () => {
    expect(calendario.estaAbierto("2026-10-19")).toBe(false);
  });

  test("K04 - el 25 de diciembre el parque está cerrado", () => {
    expect(calendario.estaAbierto("2026-12-25")).toBe(false);
  });

  test("K05 - el 1 de enero el parque está cerrado", () => {
    expect(calendario.estaAbierto("2027-01-01")).toBe(false);
  });
});
```

### C. Compras que deben pasar

```js
describe("ServicioCompraEntradas - compras válidas", () => {
  test("P01 - una compra válida con tarjeta redirige a Mercado Pago y envía el mail", () => {
    const resultado = servicio.comprar(solicitudValida());

    expect(resultado.confirmada).toBe(true);
    expect(mercadoPago.fueLlamadaConMonto(50000)).toBe(true);   // 20000 + 20000 + 10000
    expect(mail.fueEnviadoA(USUARIO)).toBe(true);
  });

  test("P02 - una compra en efectivo envía el mail y no redirige a Mercado Pago", () => {
    const resultado = servicio.comprar(solicitudValida({ formaPago: "EFECTIVO" }));

    expect(resultado.confirmada).toBe(true);
    expect(mercadoPago.fueLlamada()).toBe(false);
    expect(mail.fueEnviadoA(USUARIO)).toBe(true);
  });

  test("P03 - al finalizar informa la cantidad de entradas y la fecha", () => {
    const resultado = servicio.comprar(solicitudValida());

    expect(resultado.cantidadEntradas).toBe(3);
    expect(resultado.fechaVisita).toBe(FECHA_ABIERTA);
  });

  test("P04 - permite comprar para hoy antes de las 17:30", () => {
    const resultado = servicio.comprar(solicitudValida({ fechaVisita: HOY }));   // reloj en 10:00

    expect(resultado.confirmada).toBe(true);
  });

  test("P05 - permite comprar para hoy justo a las 17:30", () => {
    reloj.fijar("2026-10-15T17:30");

    const resultado = servicio.comprar(solicitudValida({ fechaVisita: HOY }));

    expect(resultado.confirmada).toBe(true);
  });

  test("P06 - permite comprar justo un mes antes", () => {
    const resultado = servicio.comprar(solicitudValida({ fechaVisita: "2026-11-15" }));

    expect(resultado.confirmada).toBe(true);
  });

  test("P07 - permite comprar 10 entradas", () => {
    const resultado = servicio.comprar(solicitudValida({
      cantidad: 10,
      edades:   [30, 30, 30, 30, 30, 10, 10, 10, 10, 10],
    }));

    expect(resultado.confirmada).toBe(true);
    expect(resultado.cantidadEntradas).toBe(10);
  });

  test("P08 - permite comprar una sola entrada", () => {
    const resultado = servicio.comprar(solicitudValida({ cantidad: 1, edades: [25] }));

    expect(resultado.confirmada).toBe(true);
  });

  test("P09 - permite comprar con pase regular", () => {
    const resultado = servicio.comprar(solicitudValida({ tipoPase: "REGULAR" }));

    expect(resultado.confirmada).toBe(true);
    expect(resultado.tipoPase).toBe("REGULAR");
  });

  test("P10 - el monto total aplica los descuentos por edad", () => {
    const resultado = servicio.comprar(solicitudValida({
      cantidad: 4,
      edades:   [35, 10, 2, 65],
      tipoPase: "REGULAR",
    }));

    expect(resultado.montoTotal).toBe(20000);   // 10000 + 5000 + 0 + 5000
  });

  test("P11 - un menor de hasta 3 años recibe una entrada de $0", () => {
    const resultado = servicio.comprar(solicitudValida({ cantidad: 2, edades: [30, 2] }));

    expect(resultado.entradas.length).toBe(2);
    expect(resultado.entradas[0].precio).toBe(20000);
    expect(resultado.entradas[1].precio).toBe(0);
  });

  test("P12 - acepta una edad de 0 años y emite su entrada de $0", () => {
    const resultado = servicio.comprar(solicitudValida({ cantidad: 2, edades: [30, 0] }));

    expect(resultado.confirmada).toBe(true);
    expect(resultado.entradas[1].precio).toBe(0);
  });

  test("P13 - permite varias compras que suman 10 entradas para la misma fecha", () => {
    compras.registrar(USUARIO, FECHA_ABIERTA, 7);

    const resultado = servicio.comprar(solicitudValida());   // 3 entradas más

    expect(resultado.confirmada).toBe(true);
  });

  test("P14 - el máximo de 10 se cuenta por fecha", () => {
    compras.registrar(USUARIO, FECHA_ABIERTA, 10);

    const resultado = servicio.comprar(solicitudValida({ fechaVisita: "2026-10-21" }));

    expect(resultado.confirmada).toBe(true);
  });

  test("P15 - la compra confirmada queda registrada", () => {
    servicio.comprar(solicitudValida());   // 3 entradas para FECHA_ABIERTA

    expect(compras.cantidadComprada(USUARIO, FECHA_ABIERTA)).toBe(3);
  });

  test("P16 - permite comprar para mañana después de las 17:30", () => {
    reloj.fijar("2026-10-15T18:00");

    const resultado = servicio.comprar(solicitudValida({ fechaVisita: "2026-10-16" }));

    expect(resultado.confirmada).toBe(true);
  });

  test("P17 - las compras de otro usuario no cuentan en el máximo de 10", () => {
    compras.registrar(OTRO_USUARIO, FECHA_ABIERTA, 10);

    const resultado = servicio.comprar(solicitudValida());   // 3 entradas para USUARIO

    expect(resultado.confirmada).toBe(true);
  });

  test("P18 - a fin de mes permite comprar hasta el último día del mes siguiente", () => {
    reloj.fijar("2027-01-31T10:00");

    const resultado = servicio.comprar(solicitudValida({ fechaVisita: "2027-02-28" }));

    expect(resultado.confirmada).toBe(true);
  });
});
```

### D. Compras que deben fallar

```js
describe("ServicioCompraEntradas - validaciones", () => {
  test("F01 - rechaza la compra sin forma de pago", () => {
    expect(() => servicio.comprar(solicitudValida({ formaPago: null })))
      .toThrow("Debe seleccionar una forma de pago");
  });

  test("F02 - rechaza la compra para un lunes", () => {
    expect(() => servicio.comprar(solicitudValida({ fechaVisita: FECHA_CERRADA })))
      .toThrow("El parque está cerrado en la fecha seleccionada");
  });

  test("F03 - rechaza la compra para el 25 de diciembre", () => {
    reloj.fijar("2026-12-20T10:00");

    expect(() => servicio.comprar(solicitudValida({ fechaVisita: "2026-12-25" })))
      .toThrow("El parque está cerrado en la fecha seleccionada");
  });

  test("F04 - rechaza la compra para el 1 de enero", () => {
    reloj.fijar("2026-12-20T10:00");

    expect(() => servicio.comprar(solicitudValida({ fechaVisita: "2027-01-01" })))
      .toThrow("El parque está cerrado en la fecha seleccionada");
  });

  test("F05 - rechaza una fecha pasada", () => {
    expect(() => servicio.comprar(solicitudValida({ fechaVisita: AYER })))
      .toThrow("La fecha de visita no puede ser anterior a hoy");
  });

  test("F06 - rechaza la compra sin fecha de visita", () => {
    expect(() => servicio.comprar(solicitudValida({ fechaVisita: null })))
      .toThrow("Debe indicar la fecha de visita");
  });

  test("F07 - rechaza una fecha con más de un mes de anticipación", () => {
    expect(() => servicio.comprar(solicitudValida({ fechaVisita: "2026-11-17" })))
      .toThrow("Solo se pueden comprar entradas con hasta un mes de anticipación");
  });

  test("F08 - rechaza comprar para hoy después de las 17:30", () => {
    reloj.fijar("2026-10-15T17:31");

    expect(() => servicio.comprar(solicitudValida({ fechaVisita: HOY })))
      .toThrow("Las entradas para hoy se pueden comprar hasta las 17:30");
  });

  test("F09 - rechaza más de 10 entradas", () => {
    expect(() => servicio.comprar(solicitudValida({
      cantidad: 11,
      edades:   Array(11).fill(30),
    }))).toThrow("No se pueden comprar más de 10 entradas para una misma fecha");
  });

  test("F10 - rechaza una cantidad de 0 entradas", () => {
    expect(() => servicio.comprar(solicitudValida({ cantidad: 0, edades: [] })))
      .toThrow("La cantidad de entradas debe ser al menos 1");
  });

  test("F11 - rechaza una cantidad negativa", () => {
    expect(() => servicio.comprar(solicitudValida({ cantidad: -1, edades: [] })))
      .toThrow("La cantidad de entradas debe ser al menos 1");
  });

  test("F12 - rechaza varias compras que superan 10 entradas para la misma fecha", () => {
    compras.registrar(USUARIO, FECHA_ABIERTA, 7);

    expect(() => servicio.comprar(solicitudValida({
      cantidad: 4,
      edades:   [30, 28, 8, 40],
    }))).toThrow("No se pueden comprar más de 10 entradas para una misma fecha");
  });

  test("F13 - los menores de hasta 3 años cuentan en el máximo de 10", () => {
    compras.registrar(USUARIO, FECHA_ABIERTA, 9);

    expect(() => servicio.comprar(solicitudValida({ cantidad: 2, edades: [30, 2] })))
      .toThrow("No se pueden comprar más de 10 entradas para una misma fecha");
  });

  test("F14 - rechaza la compra si falta la edad de algún visitante", () => {
    expect(() => servicio.comprar(solicitudValida({ cantidad: 3, edades: [30, 28] })))
      .toThrow("Debe indicar la edad de cada visitante");
  });

  test("F15 - rechaza una edad negativa", () => {
    expect(() => servicio.comprar(solicitudValida({ edades: [30, -1, 8] })))
      .toThrow("Edad inválida");
  });

  // F16 retirada: la edad 0 pasó a ser válida (ver P12 y la nota de la Parte 1).

  test("F17 - rechaza la compra sin tipo de pase", () => {
    expect(() => servicio.comprar(solicitudValida({ tipoPase: null })))
      .toThrow("Debe indicar el tipo de pase");
  });

  test("F18 - rechaza un tipo de pase inválido", () => {
    expect(() => servicio.comprar(solicitudValida({ tipoPase: "PREMIUM" })))
      .toThrow("El tipo de pase debe ser VIP o regular");
  });

  test("F19 - rechaza la compra de un usuario no registrado", () => {
    expect(() => servicio.comprar(solicitudValida({ usuario: "desconocido@mail.com" })))
      .toThrow("Solo los usuarios registrados pueden comprar entradas");
  });

  test("F20 - rechaza una cantidad de entradas decimal (flotante)", () => {
    expect(() => servicio.comprar(solicitudValida({ cantidad: 2.5 })))
      .toThrow("La cantidad de entradas debe ser un número entero");
  });

  test("F21 - rechaza una edad decimal (flotante)", () => {
    expect(() => servicio.comprar(solicitudValida({ edades: [30, 10.5, 8] })))
      .toThrow("Edad inválida");
  });

  test("F22 - una compra rechazada no envía el mail, no redirige ni registra la compra", () => {
    compras.registrar(USUARIO, FECHA_ABIERTA, 7);

    expect(() => servicio.comprar(solicitudValida({
      cantidad: 4,
      edades:   [30, 28, 8, 40],
    }))).toThrow("No se pueden comprar más de 10 entradas para una misma fecha");

    expect(mail.fueEnviadoA(USUARIO)).toBe(false);
    expect(mercadoPago.fueLlamada()).toBe(false);
    expect(compras.cantidadComprada(USUARIO, FECHA_ABIERTA)).toBe(7);
  });

  test("F23 - rechaza una forma de pago inválida", () => {
    expect(() => servicio.comprar(solicitudValida({ formaPago: "CHEQUE" })))
      .toThrow("La forma de pago debe ser tarjeta o efectivo");
  });

  test("F24 - rechaza la compra si sobran edades", () => {
    expect(() => servicio.comprar(solicitudValida({ cantidad: 3, edades: [30, 28, 8, 40] })))
      .toThrow("Debe indicar la edad de cada visitante");
  });

  test("F25 - rechaza una fecha de visita con mes o día fuera de rango", () => {
    expect(() => servicio.comprar(solicitudValida({ fechaVisita: "2026-13-45" })))
      .toThrow("Fecha de visita inválida");
  });

  test("F26 - a fin de mes rechaza una fecha posterior al último día del mes siguiente", () => {
    reloj.fijar("2027-01-31T10:00");

    expect(() => servicio.comprar(solicitudValida({ fechaVisita: "2027-03-02" })))
      .toThrow("Solo se pueden comprar entradas con hasta un mes de anticipación");
  });

  test("F27 - rechaza una fecha de visita que no existe", () => {
    expect(() => servicio.comprar(solicitudValida({ fechaVisita: "2026-02-30" })))
      .toThrow("Fecha de visita inválida");
  });
});
```

### E. Validación por campo

```js
describe("ServicioCompraEntradas - validación por campo", () => {
  test("V01 - una solicitud válida no tiene errores por campo", () => {
    expect(servicio.validarCampos(solicitudValida())).toEqual({});
  });

  test("V02 - informa si el usuario no está registrado", () => {
    expect(servicio.validarCampos(solicitudValida({ usuario: "desconocido@mail.com" })))
      .toEqual({ usuario: "Solo los usuarios registrados pueden comprar entradas" });
  });

  test("V03 - informa a la vez los errores de varios campos", () => {
    expect(servicio.validarCampos(solicitudValida({ tipoPase: null, formaPago: "CHEQUE" })))
      .toEqual({
        tipoPase: "Debe indicar el tipo de pase",
        formaPago: "La forma de pago debe ser tarjeta o efectivo",
      });
  });

  test("V04 - informa las reglas de fecha en el campo de la fecha", () => {
    expect(servicio.validarCampos(solicitudValida({ fechaVisita: FECHA_CERRADA })))
      .toEqual({ fechaVisita: "El parque está cerrado en la fecha seleccionada" });
  });

  test("V05 - informa una edad inválida en el campo de las edades", () => {
    expect(servicio.validarCampos(solicitudValida({ edades: [30, -1, 8] })))
      .toEqual({ edades: "Edad inválida" });
  });

  test("V06 - no compara las edades si la cantidad es inválida", () => {
    expect(servicio.validarCampos(solicitudValida({ cantidad: 2.5 })))
      .toEqual({ cantidad: "La cantidad de entradas debe ser un número entero" });
  });

  test("V07 - informa el máximo por fecha en el campo de la cantidad", () => {
    compras.registrar(USUARIO, FECHA_ABIERTA, 7);

    expect(servicio.validarCampos(solicitudValida({ cantidad: 4, edades: [30, 28, 8, 40] })))
      .toEqual({ cantidad: "No se pueden comprar más de 10 entradas para una misma fecha" });
  });

  test("V08 - validar los campos no registra la compra, no envía el mail ni redirige", () => {
    servicio.validarCampos(solicitudValida());

    expect(mail.fueEnviadoA(USUARIO)).toBe(false);
    expect(mercadoPago.fueLlamada()).toBe(false);
    expect(compras.cantidadComprada(USUARIO, FECHA_ABIERTA)).toBe(0);
  });

  test("V09 - no evalúa el máximo por fecha si la fecha es inválida", () => {
    expect(servicio.validarCampos(solicitudValida({
      fechaVisita: "2026-13-45",
      cantidad: 11,
      edades: Array(11).fill(30),
    }))).toEqual({ fechaVisita: "Fecha de visita inválida" });
  });
});
```


## Trazabilidad: criterios y reglas → pruebas

| Criterio de aceptación / Regla del PO | Pruebas |
|---|---|
| CA 1. Datos obligatorios (fecha, cantidad, edades, tipo de pase) | P01, P09, P12, F06, F10, F11, F14, F15, F17, F18, F20, F21, F24, F25, F27 |
| CA 2. Fecha actual o futura | P04, F05 |
| CA 3. Mail de confirmación | P01, P02, F22 |
| CA 4. Redirección a Mercado Pago con tarjeta | P01, P02, F22 |
| CA 5. Parque abierto en la fecha | F02, F03, F04 |
| CA 6. Forma de pago efectivo o tarjeta | P01, P02, F01, F23 |
| CA 7. Máximo 10 entradas | P07, P08, F09, F10, F11, F20 |
| CA 8. Informar cantidad y fecha | P03 |
| CA 9. Solo usuarios registrados | F19, V02 |
| R1. Días de apertura | K01, K02, K03, K04, K05, F02, F03, F04 |
| R2. Precio de las entradas | C01, C02, P01, P09, P10 |
| R3. Descuentos por edad | C03 a C09, P10, P12 |
| R4. Horizonte de un mes | P06, P18, F07, F26 |
| R5. Límite de las 17:30 para el mismo día | P04, P05, P16, F08 |
| R6. Máximo de 10 entradas por fecha | P07, P13, P14, P15, P17, F09, F12, F22 |
| R7. Menores de hasta 3 años cuentan en el máximo | F13 |
| R8. Entrada de $0 | C03, C04, P11, P12 |

### Supuestos de diseño → pruebas

| Supuesto | Pruebas |
|---|---|
| Cantidad y edades enteras | F20, F21 |
| Edad mínima 0 y edad negativa inválida | C03, P12, F15 |
| Las edades coinciden exactamente con la cantidad | F14, F24 |
| Fecha con formato válido y existente | F25, F27 |
| Horizonte de un mes, incluido el fin de mes | P06, P18, F07, F26 |
| El límite de las 17:30 aplica solo al día actual | P16 |
| El máximo es por usuario y por fecha | P14, P17 |
| La compra válida queda registrada | P15 |
| Una compra inválida no tiene efectos secundarios | F22 |
| Valores válidos de tipo de pase y forma de pago | F18, F23 |
| Validación por campo con las mismas reglas, sin efectos secundarios | V01 a V09 |

### Cantidad de pruebas

| Sección | Códigos | Cantidad |
|---|---|---|
| A. Precio de cada entrada | C01 a C09 | 9 |
| B. Días de apertura | K01 a K05 | 5 |
| C. Compras que deben pasar | P01 a P18 | 18 |
| D. Compras que deben fallar | F01 a F27, sin F16 (retirada) | 26 |
| E. Validación por campo | V01 a V09 | 9 |
| **Total** | | **67** |
