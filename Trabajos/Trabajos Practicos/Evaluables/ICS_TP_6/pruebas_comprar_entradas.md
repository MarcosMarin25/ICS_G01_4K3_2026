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
| R2. Precio de las entradas | **VIP: $20.000** y **regular: $10.000**. Para esta US, el precio es la única diferencia entre los pases. |
| R3. Descuentos por edad | **Hasta 3 años inclusive: no pagan.** **Hasta 15 años inclusive: 50% off.** **Desde 60 años inclusive: 50% off.** |
| R4. Horizonte de compra | Se compra con **no más de un mes** de anticipación. |
| R5. Límite horario para el mismo día | Para visitar el día actual se puede comprar **hasta las 17:30** (1 h 30 min antes del cierre de las 19:00). |
| R6. Máximo de 10 entradas por fecha | Un usuario puede comprar **como máximo 10 entradas para una misma fecha**, sumando todas sus compras para esa fecha. |
| R7. Menores de hasta 3 años cuentan en el máximo | Los menores que no pagan **entran dentro de las 10** entradas. |
| R8. Entrada de $0 | A los menores de hasta 3 años se les **emite igual una entrada**, con precio **$0**. |

### Reglas que no se prueban con pruebas unitarias

| Regla | Por qué |
|---|---|
| El calendario debe mostrar deshabilitados los días cerrados | Es comportamiento de la interfaz. La lógica que decide qué días están cerrados sí se prueba (R1), y el servicio igual rechaza una fecha cerrada por si llega una. |
| Paleta de colores y fuente Lato | Es diseño visual. |
| App mobile / web responsive | Es diseño visual. |
| Simular Mercado Pago con una pantalla "Mercado Pago Compra Exitosa" y el mail con un modal "Mail enviado a ..." | Se resuelve en el desarrollo de la interfaz. En las pruebas, Mercado Pago y el mail se reemplazan por espías que registran si fueron llamados. |
| Solo DNI | No aplica: esta US no pide documento. Es de "Inscribirme a actividad". |


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
- El tipo de pase se elige una vez por compra y vale para todas sus entradas.
- Los descuentos no se acumulan. A cada edad le corresponde un solo precio:

  | Edad | Precio |
  |---|---|
  | 1 a 3 | $0 |
  | 4 a 15 | 50% |
  | 16 a 59 | 100% |
  | 60 o más | 50% |

- La edad mínima válida es 1 año. Una edad 0 o negativa es inválida.
- "No más de un mes" significa hasta el mismo día del mes siguiente, inclusive. Por ejemplo, desde el 15/10 se puede comprar hasta el 15/11.
- El límite de las 17:30 es inclusive y aplica solo a compras para el día actual.
- Si la compra es inválida, el servicio lanza un error de validación con un mensaje descriptivo, y no envía el mail ni redirige a Mercado Pago.
- Para los ejemplos, "ahora" es el **jueves 2026-10-15 a las 10:00**. Las pruebas de feriados cambian el reloj al **domingo 2026-12-20 a las 10:00**, para que el 25/12 y el 1/1 queden dentro del mes de anticipación.


## Parte 1: Pruebas en lenguaje natural

Las pruebas están en el orden sugerido para el ciclo **Red → Green → Refactor**: primero las piezas más chicas (precio y calendario), después el camino feliz de la compra y al final cada regla de validación, una por una.

### A. Precio de cada entrada (`CalculadoraPrecios`)

| # | Prueba | Datos de entrada | Resultado esperado | Regla |
|---|---|---|---|---|
| C01 | Adulto con pase regular | Edad 30, regular | $10.000 | R2 |
| C02 | Adulto con pase VIP | Edad 30, VIP | $20.000 | R2 |
| C03 | Niño de 1 año no paga (borde inferior) | Edad 1, VIP | $0 | R3, R8 |
| C04 | Niño de 3 años no paga (borde) | Edad 3, VIP | $0 | R3, R8 |
| C05 | Niño de 4 años paga la mitad (borde) | Edad 4, regular | $5.000 | R3 |
| C06 | Menor de 15 años paga la mitad (borde) | Edad 15, VIP | $10.000 | R3 |
| C07 | Persona de 16 años paga entero (borde) | Edad 16, regular | $10.000 | R3 |
| C08 | Persona de 59 años paga entero (borde) | Edad 59, VIP | $20.000 | R3 |
| C09 | Persona de 60 años paga la mitad (borde) | Edad 60, regular | $5.000 | R3 |

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
| P09 | Compra con pase regular | Compra válida con pase regular | La compra se confirma con tipo de pase regular | CA 1, R2 |
| P10 | Monto total con descuentos por edad | Edades [35, 10, 2, 65], pase regular | Total $20.000 ($10.000 + $5.000 + $0 + $5.000) | R2, R3 |
| P11 | El menor de hasta 3 años recibe su entrada de $0 | Edades [30, 2], pase VIP | Se emiten 2 entradas: una de $20.000 y otra de $0 | R8 |
| P12 | Edad de 1 año es válida (borde inferior) | Edades [30, 1] | La compra se confirma | CA 1, R3 |
| P13 | Varias compras que suman 10 para la misma fecha | El usuario ya compró 7 para el 2026-10-20 y compra 3 más | La compra se confirma | R6 |
| P14 | El máximo es por fecha | El usuario ya compró 10 para el 2026-10-20 y compra 3 para el 2026-10-21 | La compra se confirma | R6 |

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
| F16 | Edad cero | Una edad 0 | Error "Edad inválida" | CA 1 |
| F17 | Sin tipo de pase | Tipo de pase vacío | Error "Debe indicar el tipo de pase" | CA 1 |
| F18 | Tipo de pase inválido | Tipo de pase = "premium" | Error "El tipo de pase debe ser VIP o regular" | CA 1 |
| F19 | Usuario no registrado | Usuario que no existe | Error "Solo los usuarios registrados pueden comprar entradas" | CA 9 |


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

let reloj, calendario, calculadora, compras, mail, mercadoPago, servicio;

beforeEach(() => {
  reloj       = new RelojFijo(AHORA);
  calendario  = new CalendarioParque();
  calculadora = new CalculadoraPrecios();
  compras     = new RepositorioComprasFalso();        // arranca sin compras previas
  mail        = new ServicioMailEspia();
  mercadoPago = new PasarelaMercadoPagoEspia();
  const usuarios = new RepositorioUsuariosFalso([USUARIO]);

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

  test("C03 - un niño de 1 año no paga", () => {
    expect(calculadora.precioEntrada(1, "VIP")).toBe(0);
  });

  test("C04 - un niño de 3 años no paga", () => {
    expect(calculadora.precioEntrada(3, "VIP")).toBe(0);
  });

  test("C05 - un niño de 4 años paga la mitad", () => {
    expect(calculadora.precioEntrada(4, "REGULAR")).toBe(5000);
  });

  test("C06 - un menor de 15 años paga la mitad", () => {
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

  test("P12 - acepta una edad de 1 año", () => {
    const resultado = servicio.comprar(solicitudValida({ cantidad: 2, edades: [30, 1] }));

    expect(resultado.confirmada).toBe(true);
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

  test("F16 - rechaza una edad de 0", () => {
    expect(() => servicio.comprar(solicitudValida({ edades: [30, 0, 8] })))
      .toThrow("Edad inválida");
  });

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
});
```


## Trazabilidad: criterios y reglas → pruebas

| Criterio de aceptación / Regla del PO | Pruebas |
|---|---|
| CA 1. Datos obligatorios (fecha, cantidad, edades, tipo de pase) | P01, P09, P12, F06, F10, F11, F14, F15, F16, F17, F18 |
| CA 2. Fecha actual o futura | P04, F05 |
| CA 3. Mail de confirmación | P01, P02 |
| CA 4. Redirección a Mercado Pago con tarjeta | P01, P02 |
| CA 5. Parque abierto en la fecha | F02, F03, F04 |
| CA 6. Forma de pago efectivo o tarjeta | P01, P02, F01 |
| CA 7. Máximo 10 entradas | P07, P08, F09, F10, F11 |
| CA 8. Informar cantidad y fecha | P03 |
| CA 9. Solo usuarios registrados | F19 |
| R1. Días de apertura | K01, K02, K03, K04, K05, F02, F03, F04 |
| R2. Precio de las entradas | C01, C02, P01, P09, P10 |
| R3. Descuentos por edad | C03 a C09, P10, P12 |
| R4. Horizonte de un mes | P06, F07 |
| R5. Límite de las 17:30 para el mismo día | P04, P05, F08 |
| R6. Máximo de 10 entradas por fecha | P07, P13, P14, F09, F12 |
| R7. Menores de hasta 3 años cuentan en el máximo | F13 |
| R8. Entrada de $0 | C03, C04, P11 |
