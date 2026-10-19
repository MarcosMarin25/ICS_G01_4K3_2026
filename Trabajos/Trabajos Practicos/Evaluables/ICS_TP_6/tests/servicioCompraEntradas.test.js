const ServicioCompraEntradas = require("../src/logica/servicioCompraEntradas");
const CalendarioParque = require("../src/logica/calendarioParque");
const CalculadoraPrecios = require("../src/logica/calculadoraPrecios");
const RelojFijo = require("./dobles/relojFijo");
const RepositorioUsuariosFalso = require("./dobles/repositorioUsuariosFalso");
const RepositorioComprasFalso = require("./dobles/repositorioComprasFalso");
const ServicioMailEspia = require("./dobles/servicioMailEspia");
const PasarelaMercadoPagoEspia = require("./dobles/pasarelaMercadoPagoEspia");

const AHORA = "2026-10-15T10:00"; // jueves
const FECHA_ABIERTA = "2026-10-20"; // martes
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
});
