# TP 6 - TDD: Registro de ejecución de las pruebas

Este documento registra, para cada prueba, el resultado esperado y lo que dio al correrla en cada paso del ciclo **Red → Green → Refactor**.

- **Esperado:** el valor que pide la prueba (definido en `pruebas_comprar_entradas.md`).
- **Obtenido en Red:** lo que devolvió el código **antes** de implementar la funcionalidad. La prueba tiene que fallar.
- **Obtenido en Green:** lo que devolvió el código después de escribir lo mínimo para que pase.
- **Commits:** cada paso tiene su commit en la rama `TP_6`, así se puede ver el código en ese momento.

Cuando una prueba pasa sin cambiar el código (pruebas de borde), se indica "pasó sin cambios": el código escrito para una prueba anterior ya cubría ese caso.

La evidencia de la última ejecución completa está en `reportes/reporte-pruebas.html`, que se genera solo cada vez que se corre `npm test`.


## A. Precio de cada entrada (`CalculadoraPrecios`)

| # | Prueba | Esperado | Obtenido en Red | Obtenido en Green | Cambio en el código | Estado |
|---|---|---|---|---|---|---|
| C01 | Adulto con pase regular (30, regular) | 10000 | `undefined` | 10000 | `return 10000` | ✅ Pasa |
| C02 | Adulto con pase VIP (30, VIP) | 20000 | 10000 | 20000 | Precio según el tipo de pase | ✅ Pasa |
| C03 | Niño de 1 año (1, VIP) | 0 | 20000 | 0 | Hasta 3 años no paga | ✅ Pasa |
| C04 | Niño de 3 años (3, VIP) | 0 | Pasó sin cambios | 0 | — | ✅ Pasa |
| C05 | Niño de 4 años (4, regular) | 5000 | 10000 | 5000 | Hasta 15 años paga la mitad | ✅ Pasa |
| C06 | Menor de 15 años (15, VIP) | 10000 | Pasó sin cambios | 10000 | — | ✅ Pasa |
| C07 | Persona de 16 años (16, regular) | 10000 | Pasó sin cambios | 10000 | — | ✅ Pasa |
| C08 | Persona de 59 años (59, VIP) | 20000 | Pasó sin cambios | 20000 | — | ✅ Pasa |
| C09 | Persona de 60 años (60, regular) | 5000 | 10000 | 5000 | Desde 60 años paga la mitad | ✅ Pasa |

**Refactor:** los números sueltos (10000, 20000, 3, 15, 60) se reemplazaron por constantes con nombre (`PRECIO_REGULAR`, `EDAD_MAXIMA_GRATIS`, etc.). Las 9 pruebas siguieron pasando.

**Resultado final:** 9 de 9 pruebas pasan.

| Paso | Commit |
|---|---|
| C01 red / green | `b277085` / `91d8764` |
| C02 red / green | `468ac50` / `c28f45d` |
| C03 red / green | `8132c73` / `a8bc25d` |
| C04 (pasó sin cambios) | `e1e1719` |
| C05 red / green | `e70ea35` / `74b8406` |
| C06 a C08 (pasaron sin cambios) | `1c539f9` |
| C09 red / green | `4377afd` / `c84276f` |
| Refactor | `37d9a4b` |


## B. Días de apertura (`CalendarioParque`)

_Pendiente._


## C. Compras que deben pasar (`ServicioCompraEntradas`)

_Pendiente._


## D. Compras que deben fallar (validaciones)

_Pendiente._


## Resumen

| Sección | Pruebas | Pasan | Fallan |
|---|---|---|---|
| A. Precio de cada entrada | 9 | 9 | 0 |
| B. Días de apertura | 5 | — | — |
| C. Compras que deben pasar | 14 | — | — |
| D. Compras que deben fallar | 21 | — | — |
| **Total** | **49** | **9** | **0** |
