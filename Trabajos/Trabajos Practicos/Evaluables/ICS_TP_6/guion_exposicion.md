# Guion de la exposición: TP 6, TDD (Comprar entradas)

Duración objetivo: **12 minutos** de exposición más preguntas. Conviene repartir los bloques entre los integrantes y ensayar con cronómetro al menos una vez.

| # | Bloque | Tiempo | Qué se muestra |
|---|---|---|---|
| 1 | La User Story y las reglas | 1 min | `pruebas_comprar_entradas.md` |
| 2 | Cómo se diseñaron las pruebas | 2 min | Tabla de valores límite y trazabilidad |
| 3 | Arquitectura y dobles de prueba | 2 min | Diagrama de este guion y `tests/dobles/` |
| 4 | **Demo en vivo de un ciclo TDD** | 3 min | Terminal y editor |
| 5 | Evidencia | 2 min | `git log`, el reporte HTML, la cobertura y el lint |
| 6 | Decisiones clave y lecciones | 2 min | `decisiones_de_diseno.md` y la web |

---

## Antes de la exposición (lista de control)

- [ ] `npm install` hecho en la máquina que se va a usar.
- [ ] `npm test` da 91 de 91, `npm run test:coverage` da 100% y `npm run lint` no da errores.
- [ ] La rama de la demo creada y probada (ver el bloque 4).
- [ ] La terminal y el editor con letra grande (mínimo 18 pt) y el tema claro, porque se lee mejor en el proyector.
- [ ] Abiertos en pestañas: `pruebas_comprar_entradas.md`, `decisiones_de_diseno.md`, `reportes/reporte-pruebas.html`, `reportes/cobertura.png` y la web (`npm run web`).
- [ ] La web funcionando en http://localhost:8080/src/web/, con una fecha válida a mano (martes a domingo, no feriado, dentro del mes).
- [ ] Plan B de la demo listo (ver el bloque 4).

---

## 1. La User Story y las reglas (1 min)

> COMO visitante QUIERO comprar una entrada PARA asegurar mi visita al parque.

Puntos para decir:
- Son 9 criterios de aceptación y 8 reglas aclaradas por el PO (R1 a R8) más el supuesto R9 (menores con un adulto): días de apertura, precios, descuentos por edad, horizonte de un mes, límite de las 17:30, máximo de 10 por fecha, los menores cuentan en el máximo, la entrada de $0 y menores con entrada de adulto.
- Antes de programar se encontraron y se resolvieron ambigüedades, que quedaron escritas como **supuestos**:
  - "No mayor a 10" (criterio) contra "menor a 10" (prueba de usuario): se tomó ≤ 10.
  - La edad mínima es 0 (un bebé no paga) y no hay edad máxima, porque el PO no la define.
  - "Un mes" a fin de mes: desde el 31/01 se puede comprar hasta el 28/02.

---

## 2. Cómo se diseñaron las pruebas (2 min)

Puntos para decir:
- **Las 91 pruebas (76 unitarias de lógica y 15 de integración)** se diseñaron en lenguaje natural y en pseudocódigo, con técnicas de caja negra: **partición de equivalencias** y **valores límite**. Son las mismas técnicas del TP 8/9.
- En cada borde se prueban los dos lados. Mostrar la tabla de "Diseño de las pruebas" en `decisiones_de_diseno.md`. Ejemplos para decir en voz alta:
  - 3 años paga $0 y 4 años paga la mitad (C04 y C05).
  - A las 17:30 se puede comprar para hoy, y a las 17:31 no (P05 y F08).
  - 7 + 3 = 10 entradas pasa, y 7 + 4 = 11 falla (P13 y F12).
- **Trazabilidad:** cada criterio y cada regla tiene al menos una prueba. Mostrar la tabla al final de `pruebas_comprar_entradas.md`.
- Cada prueba cambia **un solo dato** de una solicitud válida (`solicitudValida()`), así que si falla se sabe exactamente por qué.

---

## 3. Arquitectura y dobles de prueba (2 min)

```
                    ┌───────────────────────────┐
  solicitud ──────▶ │  ServicioCompraEntradas   │ ──▶ resultado (o error)
                    │  valida y concreta compra │
                    └─────────────┬─────────────┘
         ┌──────────────┬─────────┼──────────┬───────────┬──────────┬─────────────┐
         ▼              ▼         ▼          ▼           ▼          ▼             ▼
   CalendarioParque  Calculadora  Reloj   Usuarios    Compras     Mail       Mercado Pago
     (real)          Precios      (stub)  (stub)      (fake)      (spy)      (spy)
                     (real)
```

Puntos para decir:
- **Tres clases, una responsabilidad cada una** (SRP): precios, calendario y compra.
- El servicio **recibe sus dependencias por el constructor** y depende de interfaces, no de Mercado Pago ni de un mail reales: es la **inversión de dependencias**. Por eso las pruebas corren en 2 segundos, sin red.
- **Dobles según Meszaros:**
  - El reloj y los usuarios son **stubs**: devuelven respuestas fijas.
  - Las compras son un **fake**: un repositorio en memoria que funciona de verdad.
  - El mail y Mercado Pago son **spies**: registran cómo se los llamó, y la prueba lo verifica después.
- **El reloj inyectado** hace que las pruebas den lo mismo cualquier día (la R de FIRST).


---

## 4. Demo en vivo de un ciclo TDD (3 min)

**Qué se agrega:** que un rechazo de negocio lance un `ErrorValidacion` propio y no un `Error` común. Es la mejora que quedó pendiente en el ADR 5. Motivación para contar: el Red de F06 mostró que sin una validación el servicio explotaba con un `TypeError`, y con un tipo propio se distingue un rechazo esperado de un bug.

### Preparación (antes de la clase)

```bash
git switch TP_6
git switch -c demo-tdd
npm test            # 91 de 91
```

La demo se hace en la rama `demo-tdd`, así no afecta la entrega. Ensayarla completa al menos una vez y después volver a empezar: `git switch TP_6`, `git branch -D demo-tdd` y repetir la preparación.

### Paso 1. RED (1 min)

Agregar al principio de `tests/servicioCompraEntradas.test.js`:

```js
const ErrorValidacion = require("../src/logica/errorValidacion");
```

Y al final del `describe` de validaciones:

```js
  test("F28 - un rechazo de negocio es un ErrorValidacion", () => {
    expect(() => servicio.comprar(solicitudValida({ formaPago: null })))
      .toThrow(ErrorValidacion);
  });
```

Correr `npm test`. Salida real del ensayo:

```
Cannot find module '../src/logica/errorValidacion' from 'tests/servicioCompraEntradas.test.js'
```

Decir: "Falla porque la clase no existe. Es el Red de crear un módulo nuevo, igual que en K01 y P01". Crear `src/logica/errorValidacion.js`:

```js
// Error de negocio: la solicitud de compra es inválida. Distingue un rechazo esperado de un bug.
class ErrorValidacion extends Error {}

module.exports = ErrorValidacion;
```

Correr `npm test` de nuevo. Ahora es una **falla de aserción**, que es el Red que nos interesa mostrar:

```
● ServicioCompraEntradas - validaciones › F28 - un rechazo de negocio es un ErrorValidacion
  Expected constructor: ErrorValidacion
  Received constructor: Error
  Received message: "Debe seleccionar una forma de pago"
```

Decir: "El servicio rechaza bien la solicitud, pero con un `Error` común".

### Paso 2. GREEN (1 min)

En `src/logica/servicioCompraEntradas.js`, importar la clase debajo de `require("./valores")`:

```js
const ErrorValidacion = require("./errorValidacion");
```

Y reemplazar `throw new Error(` por `throw new ErrorValidacion(`. Hay un solo `throw` en todo el servicio, el de la tabla de reglas, así que es un único cambio. Correr `npm test`:

```
Tests:       68 passed, 68 total
```

Decir: "Implementación obvia: el cambio es mecánico y se escribe directo. Como todas las reglas están en una sola tabla, un único `throw` cubre todas las validaciones".

### Paso 3. REFACTOR (30 s)

Correr `npm run lint` y `npm run test:coverage`: no da errores y la cobertura sigue en 100%, con `errorValidacion.js` incluido. Decir: "No hay duplicación ni nombres para mejorar, así que este ciclo no tiene refactor. Que no haya refactor también es una decisión válida, y la dejamos registrada".

Si sobra tiempo, mostrar que las 26 pruebas F siguen pasando sin cambios: `ErrorValidacion` hereda de `Error`, así que `toThrow("mensaje")` sigue funcionando.

### Plan B, si falla la demo

Mostrar un ciclo real ya commiteado, el de K03 (lunes cerrado):

```bash
git show 1940ef0   # RED: la prueba del lunes
git show ffe3b12   # GREEN: se arma la fecha local y se cierra el lunes
git show 3cf98c5   # REFACTOR: se extraen LUNES y crearFechaLocal
```

Contar la trampa de UTC: `new Date("2026-10-19")` da domingo en Argentina.

> Si después el grupo decide incorporar `ErrorValidacion` a la entrega, hay que agregar F28 a `pruebas_comprar_entradas.md`, al registro y a la trazabilidad antes de mergear `demo-tdd`.

---

## 5. Evidencia (2 min)

```bash
git log --oneline -- "Trabajos/Trabajos Practicos/Evaluables/ICS_TP_6" | head -20
npm test
npm run test:coverage
npm run lint
```

Puntos para decir:
- **Cada paso tiene su commit:** 39 RED, 39 GREEN y 14 REFACTOR en las secciones B a E, más 19 confirmaciones de borde. La sección A está en los commits del PR #5.
- El registro de ejecución tiene, para cada prueba, **lo que realmente salió en el Red**, la estrategia y el hash del commit.
- **Cobertura:** 100% (98/98 sentencias y 31/31 ramas). Mostrar `reportes/cobertura.png`. **Lint:** sin errores.
- Mostrar `reportes/reporte-pruebas.html` en el navegador.

---

## 6. Decisiones clave y lecciones (2 min)

Elegir tres o cuatro, según el tiempo:
- **Los Red que enseñaron algo:**
  - F20 (cantidad 2.5) mostró que **el orden de las validaciones importa**.
  - F26 detectó un defecto real: sumar un mes desde el 31/01 daba el 03/03.
  - F25 y F27 mostraron que `Date` convierte en silencio el 30 de febrero en el 2 de marzo.
- **Validación en la frontera:** el servicio valida y la calculadora solo calcula.
- **Sin efectos secundarios:** una compra rechazada no cobra, no envía mail y no registra nada (F22), y se verificó con una **mutación**.
- **La web** (mostrarla 30 segundos):
  - Reutiliza la misma lógica probada, sin duplicarla.
  - **Calendario propio (FAQ 2):** los lunes, feriados, días pasados y los de más de un mes aparecen deshabilitados. No repite reglas: le pregunta a `validarCampos()` por cada día.
  - **Valida en el momento:** con 11 entradas aparece el error del máximo apenas la fecha es válida. Los mensajes salen de `validarCampos()`, que se hizo con TDD (V01 a V09) y usa la misma tabla de reglas que `comprar()`.
  - Mercado Pago y el mail son simulados, como pidió el PO.
  - No se prueba con Jest porque no tiene reglas de negocio: es otro nivel de prueba (*end-to-end*).
- **Lección:** TDD es una técnica de **diseño**. Las pruebas definieron la interfaz del servicio y obligaron a inyectar el reloj y las dependencias.

---

## Preguntas probables y respuestas

**¿Qué es TDD y en qué se diferencia de escribir las pruebas después?**
TDD es una técnica de diseño, no solo de testing. La prueba define la interfaz y el comportamiento **antes** de que exista el código, y eso lleva a un código desacoplado y testeable. Por ejemplo, el reloj inyectado salió de necesitar pruebas repetibles. Con pruebas escritas después, el código ya está acoplado y las pruebas se adaptan a él.

**¿Por qué algunas pruebas pasaron sin cambios? ¿Eso es TDD?**
No son ciclos Red: son **confirmaciones de valores límite**. La generalización llegó antes, por triangulación, y estas pruebas confirman que el borde quedó bien. No forzamos un Red artificial, y quedaron documentadas como tales. Cumplen una función real:
- P05 (17:30) impide que F08 se implemente con `>=`.
- F22 la verificamos con una mutación: al mover el registro antes de validar, falló.

**¿Por qué en la sección C hubo tantas confirmaciones?**
Porque todavía no existía ninguna validación: una compra válida ya se aceptaba. Esas pruebas son el lado válido de cada borde, y en la sección D funcionaron como red de seguridad.

**¿Cuál es la diferencia entre un mock, un stub, un spy y un fake?**
- **Stub:** devuelve respuestas fijas (el reloj, los usuarios).
- **Fake:** una implementación simplificada que funciona de verdad (el repositorio de compras en memoria).
- **Spy:** registra cómo se lo usó, y la prueba lo consulta después (el mail, Mercado Pago).
- **Mock:** trae las expectativas programadas antes de actuar. No lo usamos, para que las aserciones queden visibles en la prueba.

**¿Por qué no probaron Mercado Pago de verdad?**
Una prueba unitaria aísla la unidad y no puede depender de la red ni de un servicio externo, ni cobrar. La integración con Mercado Pago es otro nivel de prueba (integración contra su *sandbox*, o *end-to-end*).

**¿Cómo saben que las pruebas son suficientes?**
Por tres cosas combinadas:
- La **trazabilidad** contra todos los criterios y reglas.
- La **partición de equivalencias y los valores límite** en cada regla.
- La **cobertura del 100%**.

La cobertura es necesaria pero no suficiente: dice que cada línea se ejecutó, no que las aserciones sean buenas. Por eso además verificamos F22 con una mutación.

**¿Qué refactorizaron?** (Mostrar ejemplos concretos del registro o de `decisiones_de_diseno.md`.)
- Constantes con nombre (`MAXIMO_ENTRADAS_POR_FECHA`, `PORCENTAJE_DESCUENTO`).
- `fechas.js`, cuando el servicio necesitó el mismo parseo que el calendario.
- `valores.js`, cuando `"VIP"` estaba repetido.
- Las validaciones, primero en métodos privados por paso y después en una tabla única de reglas que comparten `comprar()` y `validarCampos()`. La cobertura lo pidió: con las reglas duplicadas había bajado al 96%.
- Algunos refactors se postergaron a propósito (K04 hasta K05), porque con un solo caso no se veía la generalización.

**¿Por qué el reloj es una dependencia?**
Para que las pruebas sean deterministas y repetibles (la R de FIRST). Con `new Date()`, una prueba que pasa hoy fallaría mañana.

**¿Por qué la calculadora no valida el tipo de pase?**
Por responsabilidad única: la validación vive en el servicio, que es la frontera de entrada. Si la calculadora también validara, la regla estaría duplicada.

**¿Por qué validan en ese orden?**
Primero quién compra, después los datos y por último las reglas de negocio, que consultan el calendario, el reloj y el repositorio. F11 y F20 lo exigen: con una cantidad inválida se espera el error de cantidad y no el de edades. En el Red de F20 salió el mensaje de edades, y eso nos mostró que el orden importaba.

**¿Por qué retiraron F16?**
Cambió un supuesto: un bebé menor de 1 año tiene edad 0 y no paga, así que la edad 0 pasó a ser válida. Ese caso ahora lo cubre P12. No reutilizamos el código F16 para que cada código tenga un solo significado en todos los documentos.

**¿Por qué la sección A tiene los commits en un PR y no en la rama?**
El PR #5 se mergeó con *squash*, que junta todos los commits en uno. Los commits paso a paso siguen visibles en el PR. Desde la sección B se commiteó cada paso directamente en la rama, y se desactivó la opción de *squash merge* en el repositorio (confirmarlo en Settings antes de exponer).

**¿Por qué no probaron la web?**
La web no tiene reglas de negocio: arma la solicitud, llama al servicio (que está probado al 100%) y muestra el resultado. Probarla con Jest sería probar el DOM. Lo visual se prueba con pruebas *end-to-end* (Playwright o Cypress) y revisión manual, y eso lo hicimos en el navegador en escritorio y en celular.

**¿Cómo valida la web en el momento sin duplicar las reglas?**
Agregamos con TDD un método `validarCampos()` (V01 a V09) que devuelve el error de cada campo sin comprar nada. Al terminar los Green, las reglas estaban repetidas entre `comprar()` y `validarCampos()`, y la cobertura bajó al 96%. El refactor las pasó a una tabla única de reglas que usan los dos métodos. Las 58 pruebas anteriores siguieron pasando sin cambios, y eso demuestra que `comprar()` no cambió su comportamiento. Es un ejemplo de refactor guiado por las pruebas y por la cobertura.

**¿Cómo se relaciona con el aseguramiento de calidad?**
La calidad se construye desde el inicio, no se inspecciona al final. TDD reduce defectos (F26 encontró uno antes de que existiera en producción), documenta el comportamiento (las pruebas son una especificación ejecutable) y da una red de seguridad para refactorizar. El lint asegura la guía de estilo y la cobertura mide qué se ejecutó.

**¿Qué harían distinto? ¿Qué limitaciones tiene?**
Respuesta honesta:
- Faltan pruebas de integración (Mercado Pago, mail y base de datos reales) y pruebas *end-to-end* de la web.
- TDD tiene un costo inicial de tiempo, que se recupera en menos defectos y en refactors seguros.
- Empezaríamos sin *squash merge* desde el primer PR.
