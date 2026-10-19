# TP 6 - TDD: Comprar entradas (EcoHarmony Park)

Ingeniería y Calidad de Software, UTN FRC 2026, grupo 1 (4K3). Práctico 6, evaluable.

Implementación con **TDD (Red → Green → Refactor)** de la User Story:

> **Comprar entradas** (8): COMO visitante QUIERO comprar una entrada PARA asegurar mi visita al parque.

| | |
|---|---|
| Pruebas | **67 de 67** pasan (Jest) |
| Cobertura | **100%** de sentencias, ramas, funciones y líneas en `src/logica/` |
| Lint | Sin errores (ESLint) |
| Evidencia del ciclo | Un commit por cada paso RED, GREEN y REFACTOR en la rama `TP_6` |

## Requisitos e instalación

Requiere [Node.js](https://nodejs.org/) 18 o superior.

```bash
cd "Trabajos/Trabajos Practicos/Evaluables/ICS_TP_6"
npm install
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm test` | Corre las 67 pruebas y genera [`reportes/reporte-pruebas.html`](reportes/reporte-pruebas.html) |
| `npm run test:coverage` | Corre las pruebas con cobertura (exige 100%) y genera `coverage/` |
| `npm run lint` | Verifica la guía de estilo con ESLint |
| `npm run web` | Levanta la interfaz web en http://localhost:8080/src/web/ |

## Estructura

```
ICS_TP_6/
├── src/
│   ├── logica/                      Lógica de negocio (probada al 100%)
│   │   ├── calculadoraPrecios.js    Precio de una entrada según la edad y el pase
│   │   ├── calendarioParque.js      Días en que abre el parque
│   │   ├── servicioCompraEntradas.js  Valida la solicitud (también campo por campo) y concreta la compra
│   │   ├── fechas.js                Funciones de fecha (zona local, fechas inexistentes, un mes)
│   │   └── valores.js               Tipos de pase y formas de pago válidos
│   └── web/                         Interfaz web: valida en el momento con la lógica de src/logica
├── tests/
│   ├── calculadoraPrecios.test.js   C01 a C09
│   ├── calendarioParque.test.js     K01 a K05
│   ├── servicioCompraEntradas.test.js  P01 a P18, F01 a F27 y V01 a V09
│   └── dobles/                      Stubs, fake y spies (reloj, usuarios, compras, mail, Mercado Pago)
├── scripts/servidorWeb.js           Servidor local para `npm run web`
└── reportes/                        Reporte HTML de las pruebas y cobertura (cobertura.txt y cobertura.png)
```

## Documentos

| Documento | Contenido |
|---|---|
| [`pruebas_comprar_entradas.md`](pruebas_comprar_entradas.md) | Criterios de aceptación, reglas del PO, supuestos, las 67 pruebas en lenguaje natural y en pseudocódigo, y la trazabilidad |
| [`registro_ejecucion_pruebas.md`](registro_ejecucion_pruebas.md) | Para cada prueba: lo obtenido en Red y en Green, la estrategia usada, el refactor y el commit de cada paso |
| [`decisiones_de_diseno.md`](decisiones_de_diseno.md) | Decisiones de diseño en formato ADR, diseño de las pruebas, proceso TDD y métricas |
| [`reportes/reporte-pruebas.html`](reportes/reporte-pruebas.html) | Reporte de la última ejecución de las pruebas |

## Cómo ver el ciclo TDD en el historial

```bash
git log --oneline -- "Trabajos/Trabajos Practicos/Evaluables/ICS_TP_6"
```

Cada paso tiene su commit, con el sufijo `[RED]`, `[GREEN]` o `[REFACTOR]`, o con "(pasa sin cambios)" en las confirmaciones de borde. Para ver el código en un paso puntual, por ejemplo el Red de K03: `git show 1940ef0`. El registro de ejecución tiene la tabla de commits de cada sección. La sección A (`CalculadoraPrecios`) se mergeó con *squash* desde el [PR #5](https://github.com/MarcosMarin25/ICS_G01_4K3_2026/pull/5), y sus commits paso a paso están en ese PR.
