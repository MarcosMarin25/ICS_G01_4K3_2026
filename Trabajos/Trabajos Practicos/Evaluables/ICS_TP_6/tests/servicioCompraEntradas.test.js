const ServicioCompraEntradas = require("../src/logica/servicioCompraEntradas");
const CalendarioParque = require("../src/logica/calendarioParque");
const CalculadoraPrecios = require("../src/logica/calculadoraPrecios");
const RelojFijo = require("./dobles/relojFijo");
const RepositorioUsuariosFalso = require("./dobles/repositorioUsuariosFalso");
const RepositorioComprasFalso = require("./dobles/repositorioComprasFalso");
const ServicioMailEspia = require("./dobles/servicioMailEspia");
const PasarelaMercadoPagoEspia = require("./dobles/pasarelaMercadoPagoEspia");

const AHORA = "2026-10-15T10:00"; // jueves
const HOY = "2026-10-15";
const AYER = "2026-10-14";
const FECHA_ABIERTA = "2026-10-20"; // martes
const FECHA_CERRADA = "2026-10-19"; // lunes
const USUARIO = "visitante@mail.com";
const OTRO_USUARIO = "otro@mail.com";

let reloj;
let compras;
let mail;
let mercadoPago;
let servicio;

beforeEach(() => {
  reloj = new RelojFijo(AHORA);
  compras = new RepositorioComprasFalso(); // arranca sin compras previas
  mail = new ServicioMailEspia();
  mercadoPago = new PasarelaMercadoPagoEspia();

  servicio = new ServicioCompraEntradas({
    reloj,
    calendario: new CalendarioParque(),
    calculadora: new CalculadoraPrecios(),
    usuarios: new RepositorioUsuariosFalso([USUARIO, OTRO_USUARIO]),
    compras,
    mail,
    mercadoPago,
  });
});

// Devuelve una solicitud válida. Cada prueba cambia solo el dato que le interesa.
function solicitudValida(cambios = {}) {
  return {
    usuario: USUARIO,
    fechaVisita: FECHA_ABIERTA,
    cantidad: 3,
    edades: [30, 28, 8],
    tipoPase: "VIP",
    formaPago: "TARJETA",
    ...cambios,
  };
}

describe("ServicioCompraEntradas - compras válidas", () => {
  test("P01 - una compra válida con tarjeta redirige a Mercado Pago y envía el mail", () => {
    const resultado = servicio.comprar(solicitudValida());

    expect(resultado.confirmada).toBe(true);
    expect(mercadoPago.fueLlamadaConMonto(50000)).toBe(true); // 20000 + 20000 + 10000
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
    const resultado = servicio.comprar(solicitudValida({ fechaVisita: HOY })); // reloj en 10:00

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
      edades: [30, 30, 30, 30, 30, 10, 10, 10, 10, 10],
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
      edades: [35, 10, 2, 65],
      tipoPase: "REGULAR",
    }));

    expect(resultado.montoTotal).toBe(20000); // 10000 + 5000 + 0 + 5000
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

    const resultado = servicio.comprar(solicitudValida()); // 3 entradas más

    expect(resultado.confirmada).toBe(true);
  });

  test("P14 - el máximo de 10 se cuenta por fecha", () => {
    compras.registrar(USUARIO, FECHA_ABIERTA, 10);

    const resultado = servicio.comprar(solicitudValida({ fechaVisita: "2026-10-21" }));

    expect(resultado.confirmada).toBe(true);
  });

  test("P15 - la compra confirmada queda registrada", () => {
    servicio.comprar(solicitudValida()); // 3 entradas para FECHA_ABIERTA

    expect(compras.cantidadComprada(USUARIO, FECHA_ABIERTA)).toBe(3);
  });

  test("P16 - permite comprar para mañana después de las 17:30", () => {
    reloj.fijar("2026-10-15T18:00");

    const resultado = servicio.comprar(solicitudValida({ fechaVisita: "2026-10-16" }));

    expect(resultado.confirmada).toBe(true);
  });

  test("P17 - las compras de otro usuario no cuentan en el máximo de 10", () => {
    compras.registrar(OTRO_USUARIO, FECHA_ABIERTA, 10);

    const resultado = servicio.comprar(solicitudValida()); // 3 entradas para USUARIO

    expect(resultado.confirmada).toBe(true);
  });

  test("P18 - a fin de mes permite comprar hasta el último día del mes siguiente", () => {
    reloj.fijar("2027-01-31T10:00");

    const resultado = servicio.comprar(solicitudValida({ fechaVisita: "2027-02-28" }));

    expect(resultado.confirmada).toBe(true);
  });
});

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
});
