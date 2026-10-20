# TP 6 - TDD: Decisiones de diseño

User Story **Comprar entradas** (EcoHarmony Park), implementada con TDD (Red → Green → Refactor).

Este documento justifica las decisiones de diseño de la implementación. Las decisiones importantes siguen un formato ADR (*Architecture Decision Record*) liviano: **contexto**, **decisión**, **alternativas consideradas** y **consecuencias**. Las secciones que siguen a los ADR describen el diseño de las pruebas, el proceso, la guía de estilo, la trazabilidad y las métricas.

Documentos relacionados:

| Documento | Contenido |
|---|---|
| [`pruebas_comprar_entradas.md`](pruebas_comprar_entradas.md) | User Story, criterios de aceptación, reglas del PO, supuestos y las 89 pruebas (en lenguaje natural y en pseudocódigo), con trazabilidad |
| [`registro_ejecucion_pruebas.md`](registro_ejecucion_pruebas.md) | Para cada prueba: lo obtenido en Red y en Green, la estrategia usada, el refactor y el commit de cada paso |
| [`reportes/reporte-pruebas.html`](reportes/reporte-pruebas.html) | Reporte de la última ejecución de `npm test` |

---

## Índice de decisiones

| # | Decisión |
|---|---|
| ADR 1 | Separar la lógica en tres clases con responsabilidad única |
| ADR 2 | Inyectar las dependencias y reemplazarlas por dobles de prueba |
| ADR 3 | Inyectar el reloj |
| ADR 4 | Manejar las fechas en la zona horaria local, sin `new Date("AAAA-MM-DD")` |
| ADR 5 | Rechazar una solicitud inválida con una excepción y sin efectos secundarios |
| ADR 6 | Validar en un orden fijo e informar solo el primer error |
| ADR 7 | Validar en el servicio, que es la frontera de entrada, y no en la calculadora |
| ADR 8 | Descuentos que no se acumulan: un solo precio por edad |
| ADR 9 | Montos en pesos enteros |
| ADR 10 | Centralizar los valores válidos y las funciones de fecha |
| ADR 11 | Interfaz web que reutiliza la lógica sin duplicarla, y que no se prueba con Jest |
| ADR 12 | Validación por campo para avisar los errores en el momento, con una tabla única de reglas |
| ADR 13 | Back básico: mail real por SMTP y compras guardadas en SQLite |
| ADR 14 | Menores con un adulto: el repositorio guarda la cantidad de adultos, no las edades |

---

## ADR 1. Separar la lógica en tres clases con responsabilidad única

**Contexto.** La User Story mezcla tres asuntos que cambian por motivos distintos: cuánto cuesta una entrada (R2 y R3), qué días abre el parque (R1) y qué condiciones tiene que cumplir una compra (los criterios de aceptación y R4 a R7).

**Decisión.** Se separan en tres clases, cada una con una sola responsabilidad (Principio de Responsabilidad Única, SRP):

| Clase | Responsabilidad | Reglas |
|---|---|---|
| `CalculadoraPrecios` | Precio de una entrada según la edad y el tipo de pase | R2, R3, R8 |
| `CalendarioParque` | Si el parque abre en una fecha | R1 |
| `ServicioCompraEntradas` | Validar la solicitud y, si es válida, concretar la compra (registrarla, redirigir al pago y enviar el mail) | CA 1 a 9, R4 a R7 |

Además hay dos módulos de apoyo, que salieron de refactors: `fechas.js` (funciones de fecha compartidas) y `valores.js` (valores válidos de pase y de forma de pago). Ver el ADR 10.

**Alternativas consideradas.**
- **Una sola función `comprar()` con todo adentro.** Se descartó: cada regla nueva obligaría a tocar la misma función, las pruebas de precio necesitarían armar una solicitud completa, y un cambio en los precios podría romper la validación de fechas.
- **Separar también las validaciones en una clase `ValidadorSolicitud`.** Se evaluó en el refactor final de la sección D. Se descartó porque las validaciones necesitan cuatro de las siete dependencias del servicio (reloj, calendario, usuarios y compras), y moverlas a otra clase habría duplicado la inyección sin bajar el acoplamiento. Primero se optó por métodos privados con nombre, uno por paso, y después por una tabla de reglas dentro del mismo servicio (ADR 6 y ADR 12).

**Consecuencias.**
- Cada clase se prueba por separado: la calculadora y el calendario no necesitan dobles de prueba.
- El servicio usa el calendario y la calculadora reales, porque son lógica propia, rápida y determinista. Los dobles se reservan para lo que es externo o no determinista (ADR 2).
- Un cambio de precios solo toca `CalculadoraPrecios`, y uno de feriados solo toca `CalendarioParque`.

---

## ADR 2. Inyectar las dependencias y reemplazarlas por dobles de prueba

**Contexto.** Para concretar una compra, el servicio necesita saber si el usuario está registrado, cuántas entradas compró antes, la fecha y hora actuales, y además tiene que enviar un mail y redirigir a Mercado Pago. En una prueba unitaria, nada de eso puede depender de una base de datos, de la red ni de servicios externos: las pruebas serían lentas, frágiles y no repetibles.

**Decisión.** El servicio recibe todas sus dependencias por el constructor:

```js
new ServicioCompraEntradas({ reloj, calendario, calculadora, usuarios, compras, mail, mercadoPago });
```

El servicio depende de **interfaces** (qué métodos espera), no de implementaciones concretas. Las interfaces están documentadas con JSDoc en `src/logica/servicioCompraEntradas.js`. Es el **Principio de Inversión de Dependencias** (DIP): la lógica de negocio no conoce a Mercado Pago ni al proveedor de mail.

En las pruebas, las dependencias externas se reemplazan por **dobles de prueba** (en `tests/dobles/`, fuera de `src/`), clasificados según la taxonomía de Gerard Meszaros:

| Doble | Tipo | Qué hace | Para qué se usa |
|---|---|---|---|
| `RelojFijo` | **Stub** | Devuelve una fecha y hora fijas, que se pueden cambiar con `fijar()` | Darle al servicio respuestas controladas |
| `RepositorioUsuariosFalso` | **Stub** | Responde `estaRegistrado()` a partir de una lista fija | Darle al servicio respuestas controladas |
| `RepositorioComprasFalso` | **Fake** | Repositorio en memoria que funciona de verdad (`registrar()`, `cantidadComprada()` y `adultosComprados()`) | Simular la persistencia sin base de datos |
| `ServicioMailEspia` | **Spy** | Registra a quién se envió la confirmación y con qué detalle de la compra (`fueEnviadoA()` y `compraEnviadaA()`) | Verificar después si se llamó y a quién |
| `PasarelaMercadoPagoEspia` | **Spy** | Registra si se pidió la redirección y con qué monto | Verificar después si se llamó y con qué monto |

Diferencias, según Meszaros:
- **Stub:** devuelve respuestas preparadas para que el código bajo prueba pueda avanzar. No verifica nada.
- **Fake:** una implementación que funciona de verdad pero simplificada (acá, en memoria).
- **Spy:** registra cómo fue usado, y la prueba lo consulta **después** de actuar.
- **Mock:** trae las expectativas programadas **antes** de actuar y falla solo si no se cumplen. No se usaron mocks: los espías dejan las aserciones en la prueba, a la vista, siguiendo el patrón AAA.

**Alternativas consideradas.**
- **Crear las dependencias dentro del servicio** (`new MercadoPago()`). Se descartó: acopla la lógica a un proveedor concreto y hace imposible probarla sin red.
- **Usar `jest.fn()` y `jest.mock()`.** Se descartó para estos dobles: las clases propias tienen nombre, documentan la interfaz esperada y se pueden reutilizar fuera de Jest.

**Consecuencias.**
- Las 76 pruebas unitarias de la lógica corren en unos 2 segundos y no necesitan red, base de datos ni configuración. Las 13 de integración del servidor (S01 a S13) usan una base SQLite en memoria y un transporte de mail que no se conecta a la red.
- Se puede cambiar Mercado Pago por otra pasarela, o el proveedor de mail, sin tocar `ServicioCompraEntradas`.
- La integración real con Mercado Pago y con el mail queda fuera de las pruebas unitarias (ver "Fuera del alcance de las pruebas unitarias").

---

## ADR 3. Inyectar el reloj

**Contexto.** Varias reglas dependen del momento actual: la fecha de visita no puede ser pasada (CA 2), hay un horizonte de un mes (R4) y un límite de las 17:30 para el día actual (R5). Si el servicio usara `new Date()` directamente, el resultado de las pruebas cambiaría según el día y la hora en que se corran: una prueba que pasa hoy fallaría mañana.

**Decisión.** La fecha y la hora actuales se obtienen de una dependencia `reloj` con el método `ahora()`. En las pruebas, `RelojFijo` fija el momento en el jueves 2026-10-15 a las 10:00, y cada prueba puede cambiarlo con `reloj.fijar()`. Por ejemplo, 17:30 y 17:31 para el límite horario, o 2026-12-20 para los feriados.

**Alternativas consideradas.**
- **`jest.useFakeTimers()` con `setSystemTime()`.** Se descartó: oculta la dependencia del tiempo en lugar de hacerla explícita en el diseño, y ata la lógica a una herramienta de prueba.
- **Pasar la fecha actual como parámetro de `comprar()`.** Se descartó: la solicitud viene del usuario, y el momento actual no puede ser un dato que el usuario elija.

**Consecuencias.** Las pruebas son **deterministas y repetibles** (la R de FIRST): dan el mismo resultado cualquier día. Los bordes horarios (17:30 y 17:31) y los de calendario (fin de mes, feriados) se prueban con exactitud.

---

## ADR 4. Manejar las fechas en la zona horaria local, sin `new Date("AAAA-MM-DD")`

**Contexto.** La fecha de visita llega como texto `"AAAA-MM-DD"`. JavaScript tiene dos trampas con las fechas, y las dos aparecieron durante el TDD:

1. **Zona horaria.** `new Date("2026-10-19")` interpreta la cadena en **UTC**. En Argentina (UTC-3) eso cae el día anterior. Evidencia obtenida en la máquina de desarrollo (zona `America/Buenos_Aires`):

   ```
   new Date("2026-10-19").getDay() = 0   (domingo)
   new Date(2026, 9, 19).getDay()  = 1   (lunes)
   ```

   Con el primer parseo, el parque cerraría los domingos en lugar de los lunes.

2. **Fechas imposibles convertidas en silencio.** `Date` no rechaza una fecha que no existe: la corre. `new Date(2026, 1, 30)` (30 de febrero) da el 02/03/2026, y `new Date(2026, 12, 45)` da el 14/02/2027. Lo mismo pasa al sumar un mes desde el 31/01: `new Date(2027, 1, 31)` da el 03/03.

**Decisión.** Toda la lógica de fechas está en `src/logica/fechas.js`:

| Función | Qué resuelve |
|---|---|
| `crearFechaLocal(fecha)` | Arma la fecha con año, mes y día, en la zona local (trampa 1) |
| `esFechaExistente(fecha)` | Crea la fecha y verifica que el año, el mes y el día sean los ingresados (trampa 2) |
| `mismoDiaDelMesSiguiente(fecha)` | Límite de un mes; si el mes siguiente no tiene ese día, devuelve su último día (trampa 2) |
| `inicioDelDia(momento)` | Compara días sin tener en cuenta la hora |
| `minutosDelDia(momento)` | Compara horas (límite de las 17:30) |

**Alternativas consideradas.**
- **Una biblioteca de fechas** (date-fns, Luxon o Day.js). Se descartó: para cinco funciones chicas no se justifica una dependencia, y escribirlas con TDD permitió probar cada trampa.
- **Validar el mes y el día solo por rango** (mes de 1 a 12, día de 1 a 31). Fue el Green de F25, y F27 (`"2026-02-30"`) mostró que no alcanzaba. Se reemplazó por la verificación de ida y vuelta.
- **Sumar un mes con `new Date(año, mes + 1, día)`.** Fue el Green de F07, y F26 mostró que fallaba a fin de mes.

**Consecuencias.** El día de la semana sale bien en cualquier zona horaria, porque la fecha se arma en la zona local. Las pruebas K03, F25, F26 y F27 documentan cada trampa. El calendario y el servicio comparten la misma función de parseo.

---

## ADR 5. Rechazar una solicitud inválida con una excepción y sin efectos secundarios

**Contexto.** Una solicitud inválida (sin forma de pago, para un lunes, con 11 entradas, etc.) no puede concretarse a medias: no puede quedar registrada, cobrarse ni confirmarse por mail.

**Decisión.**
- `comprar()` lanza un `Error` con un **mensaje descriptivo** para el usuario, el mismo que definen las pruebas F (por ejemplo, "Debe seleccionar una forma de pago").
- **Todas las validaciones corren antes de cualquier efecto secundario.** Recién cuando la solicitud pasó las cinco etapas de validación, el servicio registra la compra, redirige a Mercado Pago (si el pago es con tarjeta) y envía el mail.

**Evidencia.** F22 verifica, con los espías y con el fake, que una compra rechazada no envía el mail, no redirige y no registra nada. Elige a propósito un caso que falla en la **última** validación, después de pasar todas las demás. F22 pasó sin cambios en el código, y para comprobar que igual protege se hizo un experimento de mutación sin commitear: al mover `compras.registrar()` al principio de `comprar()`, F22 falló (`Expected: 7, Received: 11`), igual que P07 y P13.

**Alternativas consideradas.**
- **Devolver un resultado `{ confirmada: false, error }`.** Se descartó: el código que llama podría ignorar el error sin darse cuenta. Con una excepción, una solicitud inválida no puede pasar desapercibida.
- **Juntar todos los errores en una lista.** Para `comprar()` se descartó: los criterios y las pruebas piden un mensaje por caso, y varios errores dependen de otros (no tiene sentido validar la fecha si no se indicó). Ver el ADR 6. Para la interfaz, en cambio, se agregó `validarCampos()`, que informa el primer error de cada campo sin comprar nada (ADR 12).
- **Una clase propia `ErrorValidacion extends Error`.** Permitiría distinguir un error de negocio de un bug. El Red de F06 mostró por qué importa: sin la validación, el servicio no daba un error de negocio, sino que explotaba con `TypeError: Cannot read properties of null (reading 'split')`. **No se implementó**, porque ninguna prueba lo exige y en TDD no se escribe código que ninguna prueba pida. Queda como mejora: primero se agregaría la prueba al documento de pruebas y después la clase.

**Consecuencias.** Una solicitud se procesa entera o no se procesa. La interfaz puede mostrar el mensaje del error tal como viene, sin traducirlo.

---

## ADR 6. Validar en un orden fijo e informar solo el primer error

**Contexto.** Una solicitud puede tener más de un dato inválido. Algunas pruebas dependen de qué error se informa primero:
- **F11** (`cantidad: -1, edades: []`): la cantidad de edades tampoco coincide, pero se espera el error de cantidad.
- **F20** (`cantidad: 2.5` con 3 edades): se espera el error de número entero. En su Red, el código informaba "Debe indicar la edad de cada visitante", y eso demostró que el orden importa.

**Decisión.** Seis etapas, en este orden. Las reglas están definidas en la tabla `REGLAS` de `ServicioCompraEntradas`, en ese mismo orden, y `comprar()` lanza el error de la primera que no se cumple:

| # | Etapa | Pruebas |
|---|---|---|
| 1 | Usuario registrado | F19 |
| 2 | Datos obligatorios presentes: fecha, tipo de pase, forma de pago | F06, F17, F01 |
| 3 | Valores válidos: fecha existente, pase, forma de pago, cantidad entera y ≥ 1, una edad por entrada, edades enteras ≥ 0 | F25, F27, F18, F23, F20, F10, F11, F14, F24, F15, F21 |
| 4 | Reglas de fecha: no pasada, parque abierto, hasta un mes, 17:30 para hoy | F05, F02, F03, F04, F07, F26, F08 |
| 5 | Máximo de 10 por usuario y por fecha | F09, F12, F13, F22 |
| 6 | Menores con una entrada de adulto para la fecha (R9, supuesto del grupo; ADR 14) | F28, F29, F30, F31 |

Al cerrar la sección D, cada etapa quedó en un método privado (`#validarUsuario`, `#validarDatosObligatorios`, etc.), y `comprar()` se leía como una lista de pasos. Al cerrar la sección E, los métodos se reemplazaron por la tabla `REGLAS`, para que `validarCampos()` usara las mismas reglas sin duplicarlas (ADR 12). El orden y los mensajes no cambiaron, y las 58 pruebas anteriores lo garantizan.

**Justificación del orden.**
- **Primero quién compra, después qué compra.** Un usuario no registrado no puede comprar, así que no tiene sentido revisar el resto de la solicitud.
- **Primero los datos, después las reglas.** Las reglas de negocio consultan el calendario, el reloj y el repositorio. No tiene sentido consultarlos con una fecha que no existe o una cantidad decimal.
- **La cantidad se valida completa antes que las edades** (F11, F20): sin una cantidad válida no se puede comparar cuántas edades corresponden.
- **El máximo y la regla de menores con un adulto (R9) van al final** porque son las únicas validaciones que consultan compras anteriores, y son las más costosas en un sistema real.

**Alternativas consideradas.**
- **Validar en el orden de los criterios de aceptación.** Se descartó: ese orden no tiene en cuenta las dependencias entre validaciones, y F11 y F20 fallarían.
- **Una clase `ValidadorSolicitud`.** Ver el ADR 1.

**Consecuencias.** El orden está documentado como supuesto en `pruebas_comprar_entradas.md` y garantizado por las pruebas. Por eso F26 usa el 2027-03-02 y no el 2027-03-01: el 01/03 es lunes y, con este orden, daría primero el error de parque cerrado.

---

## ADR 7. Validar en el servicio, que es la frontera de entrada, y no en la calculadora

**Contexto.** `CalculadoraPrecios` trata como regular cualquier tipo de pase que no sea `"VIP"`: un `"PREMIUM"` o un `null` devolverían el precio regular.

**Decisión.** El tipo de pase se valida en `ServicioCompraEntradas` (F17 y F18), que es por donde entran los datos del usuario. La calculadora solo recibe datos ya validados y se ocupa únicamente de calcular precios.

**Alternativas consideradas.**
- **Que la calculadora también valide.** Se descartó: duplicaría la regla en dos lugares y mezclaría dos responsabilidades (SRP). Si la regla cambiara, habría que actualizarla en los dos lados.

**Consecuencias.** Las validaciones están en un solo lugar, la frontera de entrada. La calculadora sigue siendo simple y sus pruebas (C01 a C09) solo hablan de precios. Los valores válidos se comparten desde `valores.js` (ADR 10), así que la calculadora y el servicio no pueden quedar desalineados.

---

## ADR 8. Descuentos que no se acumulan: un solo precio por edad

**Contexto.** R3 define dos descuentos del 50%: hasta 15 años y desde 60 años. Además, hasta 3 años no se paga. Había que definir si los descuentos se acumulan y qué pasa en los bordes.

**Decisión.** Los descuentos no se acumulan. A cada edad le corresponde un solo precio, según una tabla de rangos sin superposición:

| Edad | Precio | Bordes probados |
|---|---|---|
| 0 a 3 | $0 | C03 (0), C04 (3) |
| 4 a 15 | 50% | C05 (4), C06 (15) |
| 16 a 59 | 100% | C07 (16), C08 (59) |
| 60 o más | 50% | C09 (60) |

La implementación evalúa los rangos de menor a mayor y devuelve el primero que corresponde.

**Alternativas consideradas.**
- **Descuentos acumulables** (por ejemplo, un menor de 3 años con un 50% sobre $0). Se descartó: no tiene sentido para el negocio y el PO no lo pidió.
- **Una edad máxima** (por ejemplo, 120). Se descartó: el PO no la especifica. Usar la esperanza de vida (81,44 años en mujeres, INDEC 2020) tampoco sirve, porque es un promedio y no un límite: rechazaría a visitantes reales. Está documentado como supuesto.

**Consecuencias.** Cada borde de cada rango tiene su prueba, lo que aplica partición de equivalencias y valores límite (ver "Diseño de las pruebas"). La edad 0 es válida (un bebé menor de 1 año), recibe una entrada de $0 (R8, P12) y cuenta en el máximo de 10 (R7, F13).

---

## ADR 9. Montos en pesos enteros

**Contexto.** Los precios son $20.000 (VIP) y $10.000 (regular), con un 50% de descuento. En JavaScript los números son de punto flotante, y operaciones como `0.1 + 0.2` dan `0.30000000000000004`.

**Decisión.** Los montos se manejan en **pesos enteros**, sin centavos. El descuento se expresa como porcentaje entero: `precioBase * (PORCENTAJE_TOTAL - PORCENTAJE_DESCUENTO) / PORCENTAJE_TOTAL`, con `PORCENTAJE_DESCUENTO = 50` y `PORCENTAJE_TOTAL = 100`. Como los precios son múltiplos de 100, el resultado siempre es entero. El total se calcula sumando el precio de cada entrada, y las pruebas lo comparan con `toBe`, es decir, de forma exacta.

**Alternativas consideradas.**
- **Multiplicar por `0.5`.** Funciona con estos precios, pero introduce un decimal en una operación de dinero y oculta la regla del PO ("50% off").
- **Trabajar en centavos o con una biblioteca decimal.** Se descartó: los precios del PO no tienen centavos.

**Consecuencias.** No hay errores de redondeo y las comparaciones son exactas. Si en el futuro hubiera precios con centavos, habría que pasar a centavos enteros.

---

## ADR 10. Centralizar los valores válidos y las funciones de fecha

**Contexto.** Durante el TDD aparecieron duplicaciones: `"VIP"` estaba escrito en la calculadora y en el servicio, y el parseo de fechas estaba repetido en el calendario y en el servicio.

**Decisión.** Se crearon dos módulos, como resultado de refactors y no diseñados de antemano:
- **`valores.js`**, con `TIPO_PASE` (`VIP`, `REGULAR`) y `FORMA_PAGO` (`TARJETA`, `EFECTIVO`), congelados con `Object.freeze`. Surgió en el refactor de F18.
- **`fechas.js`**, con las funciones del ADR 4. Surgió en el refactor de F05, cuando el servicio necesitó la misma función de parseo que el calendario. Antes de eso, `crearFechaLocal` quedó dentro del calendario a propósito (YAGNI: no se extrae algo que todavía nadie más necesita).

**Alternativas consideradas.**
- **Dejar los literales repetidos.** Se descartó: un cambio en un valor obligaría a buscarlo en varios archivos, y un error de tipeo no lo detectaría nadie.
- **Crear los módulos desde el principio.** Se descartó por YAGNI. En TDD, la estructura surge cuando la duplicación aparece.

**Consecuencias.** Cada valor y cada regla de fecha está definido en un solo lugar.

---

## ADR 11. Interfaz web que reutiliza la lógica sin duplicarla, y que no se prueba con Jest

**Contexto.** El PO pide una interfaz web responsive con la fuente Lato y su paleta de colores, una pantalla simulada "Mercado Pago Compra Exitosa" y un modal "Mail enviado a ...". La lógica de negocio ya está en `src/logica/`, probada al 100%, y está escrita en CommonJS (`require` y `module.exports`), porque así la usan Node y Jest.

**Decisión.**
- **Ubicación y estructura:** la interfaz está en `src/web/` (`index.html`, `estilos.css` y `app.js`). Se abre con `npm run web`, que levanta el servidor de `scripts/servidorWeb.js` en `http://localhost:8080/src/web/` (si el puerto 8080 está ocupado, usa el 8081). El servidor solo escucha en la máquina local, sirve los archivos de `src/` salvo `src/servidor/`, atiende la API de compras (ADR 13) y el adaptador de Mercado Pago.
- **La web no duplica la lógica.** `app.js` tiene un cargador de pocas líneas que lee cada módulo de `src/logica/` con `fetch` y lo ejecuta con su propio `module` y `require`. Así, la página usa exactamente el mismo código que verifican las 76 pruebas unitarias.
- **La validación la hace el servicio, y se ve en el momento.** El formulario tiene `novalidate`. Mientras el usuario completa el formulario, la página llama a `servicio.validarCampos()` (ADR 12) y muestra debajo de cada campo el error que corresponde, con el mismo mensaje que daría `comprar()`:
  - Un campo muestra su error cuando el usuario terminó con él (sale del campo o elige una opción o una fecha). Desde ahí se revalida con cada cambio, así el error desaparece apenas se corrige.
  - Los visitantes se cargan con contadores por categoría (ver "Visitantes por categoría"), así que no hay campos de edad individuales.
  - Al tocar Comprar se muestran los errores de todos los campos y el foco va al primero inválido. `comprar()` sigue siendo la autoridad final.
  - Además, el resumen muestra el precio estimado (usando `CalculadoraPrecios`).
- **Calendario propio con los días no disponibles deshabilitados (FAQ 2).** El `input type="date"` del navegador no permite deshabilitar días sueltos, como los lunes. Por eso la fecha se elige en un calendario propio (`src/web/app.js` y `index.html`):
  - **Sin duplicar reglas.** Un día se puede elegir solo si las reglas de fecha de la lógica no lo rechazan. Para cada día, el calendario llama a `servicio.validarCampos()` con la solicitud actual cambiando solo la fecha; esto funciona porque las reglas de fecha no dependen de otros campos. Así quedan deshabilitados los lunes, el 25/12 y el 1/1 (`CalendarioParque.estaAbierto()`, a través de la regla de parque abierto), los días pasados, los que superan el mes de anticipación y el día de hoy después de las 17:30, con la misma tabla `REGLAS` que usa `comprar()`.
  - **El motivo de cada día deshabilitado** es el mismo mensaje del servicio (por ejemplo, "El parque está cerrado en la fecha seleccionada"). Se muestra al pasar el mouse, lo lee el lector de pantalla y aparece debajo del calendario si se toca el día.
  - **Accesibilidad:** los días deshabilitados tienen `aria-disabled` (aparecen tachados y apagados): se pueden recorrer con el teclado, pero no elegir. Las flechas mueven el foco entre los días y pasan de mes; Enter elige el día. Solo se puede navegar entre el mes actual y el mes del límite de anticipación.
  - **La validación del servicio no cambia:** si por cualquier motivo llega una fecha no disponible, `comprar()` la rechaza (F02 a F08).
- **Dependencias del navegador:**
  - El reloj es el real.
  - La sesión y los usuarios están simulados (FAQ 19: el PO permite la sesión y el usuario mockeados). Los usuarios registrados se cargan del servidor (`GET /api/usuarios`), que los toma de `USUARIOS_REGISTRADOS` del `.env`, y el encabezado muestra el usuario de la sesión.
  - Las compras las concreta y guarda el servidor, en SQLite (`POST /api/compras`, ADR 13). El navegador lleva además una copia en memoria de las compras de la sesión, para avisar en el momento el máximo de 10 y la regla de menores con un adulto.
  - Para Mercado Pago, el servidor local expone un adaptador contra la API de Checkout Pro (`POST /api/mercadopago/preferencia`, que usa el `init_point` de la preferencia o, si falta, el `sandbox_init_point`), con vuelta automática a la pantalla simulada "Mercado Pago Compra Exitosa" (FAQ 4) si no hay `MP_ACCESS_TOKEN` o no hay conexión. `ServicioCompraEntradas` y las pruebas unitarias no cambian, gracias a la inversión de dependencias (ADR 2). La verificación contra el Sandbox es manual (sección H de `pruebas_comprar_entradas.md`).
  - **Orden entre la compra y el pago:** con tarjeta, la web primero concreta la compra en el servidor (que la guarda y envía el mail) y después crea la preferencia y redirige a Mercado Pago. Si el pago se rechaza en Mercado Pago, la compra ya quedó guardada y el mail ya se envió. Es una limitación conocida: en un sistema real, la compra con tarjeta quedaría pendiente hasta que Mercado Pago confirme el pago.
  - El mail es real (ADR 13). El modal muestra "Mail enviado a <mail del usuario>" (FAQ 5) con el mail que `comprar()` le pasa a `mail.enviarConfirmacion()`, es decir, el usuario de la sesión simulada. Si el envío falla, el modal lo informa y aclara que la compra quedó registrada.
- **Visitantes por categoría y edad representativa (CA 1).** La web no pide la edad de cada visitante: tiene un contador por categoría (Adultos, Menores, Bebés y Mayores), y cada categoría tiene una edad representativa en el HTML (`data-edad`: 16, 4, 0 y 60, la menor edad de cada rango). El arreglo `edades` que recibe el servicio se arma repitiendo esa edad tantas veces como indica el contador. La lógica no cambia: sigue exigiendo una edad entera por entrada (F14, F21, F24). Consecuencias:
  - El precio de cada entrada y la regla de menores con un adulto (R9) son correctos, porque dependen solo de la categoría.
  - El servicio y la compra guardada reciben la edad representativa, no la edad real de cada visitante. El criterio 1 ("la edad de cada visitante") se cumple a nivel de categoría en la interfaz; la lógica y sus pruebas sí trabajan con edades individuales.
  - Los rangos de cada categoría quedan escritos en la interfaz y en el mail (`src/servidor/servicioMail.js`), además de en `CalculadoraPrecios`: si el PO cambiara un rango de R3, hay que actualizarlos en esos lugares.
- **Tope de 10 en los contadores.** La web deshabilita los botones + cuando la suma llega a 10, con una constante propia (`MAX_ENTRADAS` en `app.js`). El servicio igual valida el máximo (F09, F12) y lo informa en el momento con `validarCampos()`. Es una regla repetida en la interfaz, para evitar que el usuario llegue al error.
- **Paleta oficial del PO (FAQ 3).** Se usa la paleta [386641-6a994e-a7c957-f2e8cf-bc4749](https://coolors.co/palette/386641-6a994e-a7c957-f2e8cf-bc4749), en variables CSS de `:root`. Hasta que apareció el FAQ, la web usaba una paleta provisoria definida por el grupo, que se reemplazó cambiando solo esas variables.

  | Variable | Color | Uso |
  |---|---|---|
  | `--color-primario` | `#386641` | Encabezado, botones principales (texto blanco encima) |
  | `--color-secundario` | `#6A994E` | Bordes y elementos secundarios |
  | `--color-acento` | `#A7C957` | Destacados, total a pagar (texto oscuro encima) |
  | `--color-fondo` | `#F2E8CF` | Fondo general |
  | `--color-error` | `#BC4749` | Mensajes de validación |

  Además, se usan tres colores de apoyo que el PO no define: blanco (`#FFFFFF`) para las tarjetas, `#1F2A1F` para el texto, y el primario como color de éxito.

  **Contraste (WCAG 2.1, nivel AA).** Se calculó la relación de contraste de cada combinación de texto y fondo que usa la página. El mínimo es 4,5:1 para el texto normal, y 3:1 para los íconos y los bordes.

  | Combinación | Contraste | Resultado |
  |---|---|---|
  | Texto blanco sobre primario (encabezado, botones) | 6,68:1 | Cumple |
  | Texto sobre fondo | 12,22:1 | Cumple |
  | Texto sobre acento (total, etiquetas) | 7,90:1 | Cumple |
  | Primario sobre blanco (títulos, precios) | 6,68:1 | Cumple |
  | Error sobre blanco | 5,08:1 | Cumple |
  | Error sobre el fondo rosado de los mensajes | 4,54:1 | Cumple |
  | Acento sobre primario (íconos del encabezado) | 3,54:1 | Cumple (no es texto) |
  | Secundario sobre blanco (bordes) | 3,34:1 | Cumple (no es texto) |
  | **Texto blanco sobre secundario** | **3,34:1** | **No cumple** |

  Por el último caso, el secundario **no se usa como fondo de texto ni como color de texto**. El FAQ lo sugiere para el *hover*, pero los botones tienen texto blanco, así que para el *hover* se usa el primario oscurecido un 20% (8,87:1). Es un ajuste de accesibilidad sobre la paleta oficial, sin agregar colores nuevos.

- **Logo (FAQ 17): propuesta del grupo, pendiente de validación del PO.** El FAQ no define un logo, así que el grupo diseñó uno en SVG con la paleta oficial: una vuelta al mundo con cabinas en los colores de la paleta. Está en `src/web/logo.svg` (logo completo, con el nombre) y `src/web/icono.svg` (solo el ícono), con versiones en imagen (`logo.jpg` e `icono.png`). El encabezado usa `icono.svg`, que tiene fondo blanco y se lee bien sobre el verde, junto al nombre del parque; el mismo ícono es el de la pestaña del navegador. El servidor local sirve los tipos `image/svg+xml`, `image/png` e `image/jpeg`.
  La fuente es Lato (Google Fonts) en todo el sitio. El diseño es *mobile first*:
  - **Formulario:** está dividido en cuatro pasos numerados (fecha, pase, visitantes y forma de pago; el pase va antes para que cada categoría de visitantes ya muestre su precio), con tarjetas seleccionables y botones − y + para la cantidad.
  - **Celular:** se muestra en una sola columna, con una barra fija abajo que deja siempre a mano el total y el botón Comprar.
  - **Escritorio (desde 900 px de ancho):** se muestra en dos columnas, y el resumen, con forma de entrada, queda fijo al costado.
  - **Otros detalles:** los colores derivados (bordes y fondos suaves) se obtienen mezclando la paleta con `color-mix`, sin agregar colores nuevos, y las animaciones se desactivan si el sistema pide reducir el movimiento.

**Por qué no se prueba con Jest.**
- **Toda la lógica de negocio que usa la web ya está probada.** `app.js` no decide nada: arma la solicitud a partir del formulario, llama a `comprar()` y muestra el resultado o el mensaje de error. Probarlo con Jest sería probar el DOM y no reglas de negocio.
- **Es otro nivel de prueba.** El comportamiento visual (diseño responsive, colores, fuente, la pantalla de Mercado Pago, el modal) se verifica con pruebas de extremo a extremo en un navegador real, por ejemplo con Playwright o Cypress. Esas herramientas exceden el alcance de un TP de TDD unitario (ver "Fuera del alcance de las pruebas unitarias").
- **La cobertura se mide solo sobre `src/logica/`** (`collectCoverageFrom` en `package.json`). Incluir `src/web/` bajaría la cobertura sin aportar información sobre la calidad de la lógica, y haría fallar el umbral del 100%.
- **Verificación realizada (20/10/2026, con la interfaz actual).** En Chrome, a 360 px y en escritorio, sin desplazamiento horizontal, con el reloj real (martes 20/10/2026, después de las 17:30):
  - El formulario tiene cuatro pasos: "¿Cuándo nos visitás?", "Elegí tu pase", "¿Quiénes vienen?" y "¿Cómo pagás?".
  - En el calendario aparecen deshabilitados el 19/10 ("La fecha de visita no puede ser anterior a hoy"), el 20/10 ("Las entradas para hoy se pueden comprar hasta las 17:30") y el 26/10 ("El parque está cerrado en la fecha seleccionada").
  - Con pase VIP, al llegar a 10 entradas se deshabilitan todos los botones +. Con 1 adulto y 1 menor, el total es $30.000.
  - Comprar sin forma de pago muestra "Debe seleccionar una forma de pago" en el aviso y debajo del campo (el servidor responde 400 y no guarda nada).
  - La compra válida completa (servidor, mail y Mercado Pago) no se volvió a recorrer en esta verificación: habría enviado un mail real, y además el SMTP del `.env` responde "535 Authentication failed" (ver ADR 13). [Pendiente: repetirla con credenciales válidas.]

**Alternativas consideradas.**
- **Copiar la lógica en `app.js`.** Se descartó: habría dos versiones de las reglas, y la de la web no estaría probada.
- **Cargar los módulos con etiquetas `<script>` comunes.** Se descartó: los scripts clásicos comparten el ámbito global, y las declaraciones `const { TIPO_PASE }` de la calculadora y del servicio chocarían.
- **Un empaquetador (webpack, esbuild) o pasar la lógica a módulos ES.** Se descartó: agrega una herramienta y un paso de compilación, o cambia el formato que usan Jest y Node, solo para servir tres archivos.

**Consecuencias.**
- La web siempre usa la versión probada de la lógica.
- Para abrir la web hace falta `npm run web`. Si se abre el HTML directamente como `file://`, la página avisa que necesita el servidor.
- El calendario propio cumple el FAQ 2 (días cerrados deshabilitados) sin repetir las reglas de fecha: si una regla cambia en la lógica, el calendario la refleja solo.

---

## ADR 12. Validación por campo para avisar los errores en el momento, con una tabla única de reglas

**Contexto.** Se pidió que la interfaz valide cada dato **en el momento**, mientras se completa el formulario, y no recién al comprar. `comprar()` no sirve para eso por dos motivos: corta en el primer error (ADR 6), así que no puede informar el estado de cada campo, y si la solicitud es válida concreta la compra.

**Decisión.**
- **Un método nuevo, `validarCampos(solicitud)`, hecho con TDD** (sección E, V01 a V09). Devuelve el primer error de cada campo, por ejemplo `{ fechaVisita: "...", cantidad: "..." }`, o `{}`. No tiene efectos secundarios (V08).
- **Dependencias entre campos.** Una regla que depende de otro campo no se evalúa si ese campo es inválido. Las edades no se comparan si la cantidad es inválida (V06), y el máximo no se evalúa si el usuario, la fecha o la cantidad son inválidos (V09).
- **Una sola definición de cada regla.** Al terminar los Green de la sección E, las reglas estaban duplicadas entre `comprar()` y `validarCampos()`, y la cobertura bajó al 96%. El refactor las pasó a una **tabla `REGLAS`**, en el orden del ADR 6. Cada regla indica en qué campo informa su error, de qué campos depende (`requiere`) y cuándo se incumple:

  ```js
  { campo: "edades", requiere: ["cantidad"], mensaje: "Edad inválida",
    seIncumple: (solicitud) => solicitud.edades.some((edad) => !Number.isInteger(edad) || edad < 0) }
  ```

  - `comprar()` busca la primera regla que no se cumple y lanza su mensaje.
  - `validarCampos()` recorre toda la tabla y guarda el primer error de cada campo.

**Alternativas consideradas.**
- **Validar en la interfaz, repitiendo las reglas en `app.js`.** Se descartó: duplicaría las reglas sin pruebas y contradice el ADR 11.
- **Llamar a `comprar()` en cada cambio.** Se descartó: solo informa el primer error, y con una solicitud válida compraría de verdad.
- **Mantener los métodos privados y repetir las reglas en `validarCampos()`.** Fue el estado después de los Green, y se refactorizó por la duplicación.

**Consecuencias.**
- La interfaz muestra los mismos mensajes que `comprar()`, desde la misma definición probada.
- Agregar una regla es agregar una fila a la tabla, y queda disponible para los dos métodos.
- Las 58 pruebas anteriores pasaron sin cambios después del refactor, lo que confirma que `comprar()` mantuvo su comportamiento y su orden.

---

## ADR 13. Back básico: mail real por SMTP y compras guardadas en SQLite

**Contexto.** Se pidió que el mail de confirmación sea real y que las compras queden guardadas, con los cambios mínimos. Desde el navegador no se puede enviar un mail por SMTP ni escribir en una base de datos.

**Decisión.**
- **Servidor:** se extiende `scripts/servidorWeb.js`, el mismo de `npm run web`, con una API mínima (`src/servidor/api.js`):
  - `POST /api/compras`: concreta la compra con la misma clase `ServicioCompraEntradas`, la guarda y envía el mail. Responde 200 con el resultado y el estado del mail, o 400 con el mensaje de error.
  - `GET /api/usuarios`: los usuarios de la sesión simulada (FAQ 19).
  
  No se publica el código de `src/servidor/`.
- **Base de datos:** SQLite con `node:sqlite`, el módulo que trae Node, así que no agrega dependencias. Tiene dos tablas: `usuarios` (cargados desde `USUARIOS_REGISTRADOS` del `.env`) y `compras` (usuario, fecha, cantidad). Los repositorios cumplen las interfaces sincrónicas del servicio (ADR 2), así que **el servicio no cambió**.
- **Mail:** Nodemailer por SMTP, con el relay de Brevo configurado en el `.env`. El grupo decidió subir el `.env` con la cuenta de Brevo compartida, para que funcione sin configurar nada, y asumió el riesgo de que la clave quede expuesta en el repositorio. Después se agregó `.env` al `.gitignore`, pero el archivo sigue versionado (el `.gitignore` no saca del repositorio un archivo que ya está en él), y el repositorio es público. Al 20/10/2026, Brevo rechaza esa clave ("535 Authentication failed"), así que el envío real de mails no funciona con el `.env` actual. El servicio le pasa al mail el resultado de la compra (G01, con TDD), y el mail informa la cantidad, la fecha, el subtotal de cada entrada y el total (FAQ 18).
- `comprar()` es sincrónico y el envío no. Por eso la API anota el pedido de confirmación y **envía el mail después de guardar la compra**. Si el mail falla, la compra no se pierde y se informa el motivo (S09).
- En la página, el navegador sigue validando en el momento con la misma lógica (ADR 11 y 12), pero la compra la hace el servidor. Para Mercado Pago, la web usa Checkout Pro cuando hay `MP_ACCESS_TOKEN` y, si no, la pantalla simulada (ADR 11).

**Alternativas consideradas.**
- **Express y una biblioteca de SQLite.** Se descartaron para mantener los cambios al mínimo: el servidor de Node que ya había alcanza.
- **Hacer `comprar()` asincrónico.** Se descartó: obligaba a cambiar todas las pruebas del servicio.

**Consecuencias.** Requiere Node 22.13 o superior. Las pruebas de integración (S01 a S13) no necesitan red ni un archivo de base de datos.

---

## ADR 14. Menores con un adulto: el repositorio guarda la cantidad de adultos, no las edades

**Contexto.** El grupo agregó R9: un menor necesita una entrada de adulto para la misma fecha, en la misma compra o en una anterior del mismo usuario. Para las compras anteriores hay que saber si incluían adultos, y hasta ahora solo se guardaba la cantidad.

**Decisión.** `registrar(usuario, fecha, cantidad, adultos)` guarda cuántas entradas son de adulto, y `adultosComprados(usuario, fecha)` las suma, igual que `cantidadComprada()`. **Qué es un adulto lo decide la lógica** (`contarAdultos()` en `valores.js`, con el mismo `EDAD_MAXIMA_MENOR` que usa la calculadora); el repositorio solo guarda un número. En SQLite es la columna `adultos`.


---

## Diseño de las pruebas

### Partición de equivalencias y valores límite

Las pruebas se diseñaron con técnicas de caja negra, a partir de los criterios de aceptación y de las reglas del PO, **antes** de escribir el código:
- **Partición de equivalencias:** cada entrada se dividió en clases que el sistema debería tratar igual (por ejemplo, edades de 4 a 15: mitad de precio). Se probó al menos un representante de cada clase, válida e inválida.
- **Valores límite:** en cada borde entre clases se probaron los dos lados.

| Regla | Borde | Lado válido | Lado inválido o siguiente clase |
|---|---|---|---|
| Entrada gratis (R3) | 3 / 4 años | C04 (3: $0) | C05 (4: 50%) |
| Menores (R3) | 15 / 16 años | C06 (15: 50%) | C07 (16: 100%) |
| Mayores (R3) | 59 / 60 años | C08 (59: 100%) | C09 (60: 50%) |
| Edad mínima | 0 / -1 | C03, P12 (0) | F15 (-1) |
| Cantidad (CA 7) | 1 y 10 | P08 (1), P07 (10) | F10 (0), F09 (11) |
| Máximo acumulado (R6) | 10 / 11 por fecha | P13 (7 + 3) | F12 (7 + 4), F13 (9 + 2) |
| Límite horario (R5) | 17:30 / 17:31 | P05 (17:30) | F08 (17:31) |
| Horizonte (R4) | Un mes justo | P06 (15/11), P18 (28/02) | F07 (17/11), F26 (02/03) |
| Fecha actual (CA 2) | Hoy / ayer | P04 (hoy) | F05 (ayer) |
| Días de apertura (R1) | Domingo / lunes | K02 (domingo) | K03 (lunes) |
| Menor con adulto (R9) | 16 / 15 años sin adulto | P21 (16: ya es adulto) | F28 (15: menor solo) |

El TP 8/9 (pruebas de caja negra) usa estas mismas técnicas. En este TP ya se aplicaron para diseñar las pruebas de la US implementada.

### Estructura de cada prueba

- **Patrón AAA (Arrange, Act, Assert):** se prepara el escenario (`reloj.fijar()` y `compras.registrar()`), se ejecuta una sola acción (`servicio.comprar()`) y se verifica el resultado.
- **Helper `solicitudValida(cambios)`:** devuelve una solicitud válida, y cada prueba cambia **un solo dato**. Así, si una prueba F falla, el motivo es exactamente el dato que cambió.
- **Un código por prueba** (C, K, P, F, V, G o S) que aparece igual en el diseño, en el test, en el registro y en la trazabilidad.

### Propiedades FIRST

| Propiedad | Cómo se cumple |
|---|---|
| **F**ast (rápidas) | 89 pruebas en unos 2 segundos, sin red. Las unitarias no usan base de datos; las de integración usan SQLite en memoria (ADR 2 y 13) |
| **I**ndependent (independientes) | `beforeEach` crea dobles nuevos para cada prueba, y ninguna depende de otra |
| **R**epeatable (repetibles) | El reloj inyectado (ADR 3) y las fechas locales (ADR 4) dan el mismo resultado cualquier día y en cualquier zona |
| **S**elf-validating (autoverificables) | Cada prueba pasa o falla con `expect`, sin revisión manual |
| **T**imely (oportunas) | Cada prueba se escribió **antes** del código que la hace pasar (TDD) |

---

## Proceso TDD y refactors

### El ciclo

Cada prueba siguió el ciclo **Red → Green → Refactor**, respetando las tres leyes de TDD de Robert C. Martin:
1. No se escribe código de producción sin una prueba que falle.
2. No se escribe más prueba de la necesaria para que falle.
3. No se escribe más código del necesario para que pase.

Para pasar a verde se usaron las estrategias de Kent Beck: **fake it** (devolver una constante), **triangulación** (una segunda prueba obliga a generalizar) e **implementación obvia** (el código es trivial y se escribe directo). Por ejemplo:
- **P01, fake it:** redirigía a Mercado Pago por un 50000 fijo. P10 triangulaba otro total, y el refactor de P10 reemplazó el 50000 por el monto calculado.
- **F09 y F12, triangulación:** F09 se resolvió con `cantidad > 10`, y F12 obligó a sumar las compras previas del usuario.

### Pruebas que pasaron sin cambios

25 pruebas pasaron sin tocar el código (por ejemplo K02, P04 a P08, F11, P19 y V10), registradas en 23 commits: F29 no lleva la etiqueta en su mensaje, y F31 y P21 comparten un commit. **No son ciclos Red**, y no se forzó un Red artificial. Son **confirmaciones de borde**: verifican que la generalización hecha antes ya cubre ese valor límite. Igual cumplen una función:
- **En la sección C**, pasaron porque todavía no existían validaciones. Después funcionaron como red de seguridad: al implementar F08 se verificó que P05 (17:30) siguiera pasando, lo que confirma que el código usa `>` y no `>=`.
- **F22** se verificó con mutación (ADR 5).

### Evidencia en git

Cada paso tiene su commit en la rama `TP_6`, con el sufijo `[RED]`, `[GREEN]` o `[REFACTOR]`, o con "(pasa sin cambios)". El registro de ejecución tiene la tabla de commits de cada sección. La sección A se desarrolló en el PR #5, que se mergeó con *squash*, y sus commits paso a paso se pueden ver en la pestaña *Commits* de ese PR.

### Refactors realizados

| Sección | Refactor | Motivo |
|---|---|---|
| A | Números sueltos → `PRECIO_REGULAR`, `EDAD_MAXIMA_GRATIS`, etc. | Nombres que expresan la regla |
| A | `/ 2` → `PORCENTAJE_DESCUENTO` y `PORCENTAJE_TOTAL` | Lo detectó ESLint (`no-magic-numbers`); expresa "50% off" |
| B (K03) | `LUNES` y `crearFechaLocal()` | Nombre del día y trampa de UTC encapsulada |
| B (K05) | `FERIADOS_FIJOS` (mes de 1 a 12) y `esFeriadoFijo()` | Generalización de la triangulación; `estaAbierto()` queda en una línea |
| C (P10) | Redirigir por el monto calculado | Elimina el 50000 del *fake it* (duplicación entre prueba y código) |
| C (P11) | El total se calcula desde las entradas emitidas | El precio de cada edad se calculaba dos veces |
| C (cierre) | JSDoc de las interfaces de las dependencias | Inversión de dependencias documentada |
| D (F05) | `fechas.js` con `crearFechaLocal()` e `inicioDelDia()` | Parseo duplicado entre el calendario y el servicio |
| D (F08) | Constantes de la hora límite y `minutosDelDia()` | Números mágicos; el reloj se consulta una sola vez |
| D (F09) | `MAXIMO_ENTRADAS_POR_FECHA` | Número mágico |
| D (F18) | `valores.js` con `TIPO_PASE` y `FORMA_PAGO` | Literales duplicados entre la calculadora y el servicio |
| D (F26) | `mismoDiaDelMesSiguiente()` | Lógica de calendario fuera del servicio |
| D (F27) | `esFechaExistente()` | Lógica de calendario fuera del servicio |
| D (cierre) | Validaciones en cinco métodos privados y `#emitirEntradas()` | `comprar()` se lee como una lista de pasos (ADR 6) |
| E (cierre) | Tabla única `REGLAS`, usada por `comprar()` y `validarCampos()` | Las reglas estaban duplicadas; la cobertura había bajado al 96% (ADR 12) |
| I (S13) | `EDAD_MAXIMA_MENOR` y `contarAdultos()` en `valores.js` | Un solo límite de menor para la calculadora, el servicio y la web (ADR 14) |

Algunos refactors se **postergaron a propósito** (K04 hasta K05, P01 hasta P10 y F25 hasta F27): con un solo caso todavía no se veía la forma de la generalización.

---

## Fuera del alcance de las pruebas unitarias

| Qué | Por qué no se prueba con pruebas unitarias | Cómo se probaría |
|---|---|---|
| Mercado Pago real | Es un servicio externo: una prueba unitaria no puede depender de la red ni cobrar de verdad. Se reemplaza por `PasarelaMercadoPagoEspia`. | Verificación manual contra Checkout Pro Sandbox, con las tarjetas de prueba (sección H de `pruebas_comprar_entradas.md`) |
| Envío real del mail | Es un servicio externo. Se reemplaza por `ServicioMailEspia`. | Implementado (ADR 13). Integración con el `jsonTransport` de Nodemailer (S03 a S06, S09); la entrega real a Brevo se verifica a mano |
| Persistencia real de usuarios y compras | Se reemplaza por un stub y un fake. | Implementado con SQLite (ADR 13). Integración con una base en memoria (S01, S02, S06 a S09) |
| Interfaz web en `src/web/` (formulario, calendario con días deshabilitados, paleta, fuente Lato, diseño responsive, pantalla simulada de Mercado Pago y modal del mail) | Es comportamiento visual, y no contiene reglas de negocio: usa la lógica de `src/logica/`, que sí se prueba. La lógica que decide qué días están cerrados se prueba en K01 a K05, y el servicio igual rechaza una fecha cerrada por si llega una (F02 a F04). Ver el ADR 11. | Prueba de extremo a extremo (*end-to-end*) en el navegador (Playwright o Cypress) y revisión visual |

El nivel unitario verifica **la lógica de negocio**. La integración con los servicios externos y la interfaz corresponden a otros niveles de prueba.

---

## Guía de estilo

En el TP 2 el grupo no definió una guía de estilo de código. Para este TP se adoptó una **guía de estilo del grupo, basada en el código existente y verificada con ESLint** (`eslint.config.js`):

| Regla | Qué exige |
|---|---|
| Nombres | camelCase para variables y métodos, PascalCase para clases, MAYÚSCULAS para constantes (`camelcase`, `new-cap`) |
| Idioma | Identificadores, comentarios y mensajes en español |
| Formato | Comillas dobles, punto y coma, sangría de 2 espacios, coma final en literales de varias líneas, líneas de hasta 120 caracteres (`@stylistic/*`) |
| Buenas prácticas | `===` (`eqeqeq`), `const` y `let` en lugar de `var` (`no-var`, `prefer-const`), llaves siempre en los `if` (`curly`) |
| Constantes con nombre | `no-magic-numbers` en `src/`. En `tests/` está desactivada, porque ahí los números son los datos del caso (edades, precios, cantidades) |

La regla `no-magic-numbers` marcó números sueltos en varios Green de la lógica, y su corrección formó parte del refactor siguiente. **Al 20/10/2026, `npm run lint` informa 8 errores**, todos en el código del servidor agregado después: `src/servidor/servicioMail.js` (los números 3, 15 y 59 sin nombre, tres `if` sin llaves y falta el salto de línea final) y `tests/servidor.test.js` (sangría). Están pendientes de corrección.

---

## Trazabilidad

La tabla completa de **criterios de aceptación y reglas del PO → pruebas**, y la de **supuestos de diseño → pruebas**, están en [`pruebas_comprar_entradas.md`](pruebas_comprar_entradas.md#trazabilidad-criterios-y-reglas--pruebas). Cada criterio de aceptación (CA 1 a 9), cada regla del PO (R1 a R8) y el supuesto R9 tienen al menos una prueba.

---

## Métricas finales

| Métrica | Valor |
|---|---|
| Pruebas | **89**: 76 unitarias de la lógica (9 de precios, 5 de calendario, 18 de compras válidas, 26 de validaciones, 9 de validación por campo, 1 del mail y 8 de R9) y 13 de integración del servidor (S01 a S13) |
| Resultado | 89 de 89 pasan |
| Cobertura (`npm run test:coverage`) | **100%** en los cinco módulos de `src/logica/`: sentencias 103/103, ramas 33/33, funciones 37/37 y líneas 96/96. La interfaz (`src/web/`) y el servidor (`src/servidor/`) no se miden (ADR 11 y 13) |
| Lint (`npm run lint`) | 8 errores pendientes en `src/servidor/servicioMail.js` y `tests/servidor.test.js` (ver "Guía de estilo") |
| Tiempo de ejecución | Unos 2 segundos para las 89 pruebas. La primera corrida tarda más porque incluye la carga inicial de Jest |
| Ciclos registrados en `TP_6` (secciones B a E e I) | 42 RED, 42 GREEN y 15 REFACTOR, cada uno en su commit, más 23 commits de confirmaciones de borde (25 pruebas). Las secciones F (G01) y G (S01 a S12) no siguieron el ciclo paso a paso |
| Sección A | 9 pruebas, con los commits de cada paso en el PR #5 |

**La cobertura al 100% es necesaria, pero no suficiente.** Indica que cada línea y cada rama se ejecutó en alguna prueba, pero no que las aserciones sean buenas. La confianza en la suficiencia de las pruebas viene de la combinación de tres cosas: la **trazabilidad** contra los criterios y las reglas, el diseño con **partición de equivalencias y valores límite**, y la verificación por **mutación** de F22, que mostró que una prueba que pasó sin cambios detecta un defecto real.
