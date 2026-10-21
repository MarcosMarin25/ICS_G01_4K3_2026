// API del servidor: comprar entradas (POST /api/compras), el usuario logueado (GET /api/sesion)
// y los usuarios registrados (GET /api/usuarios). Usa la misma clase ServicioCompraEntradas,
// con la base de datos real.
const ServicioCompraEntradas = require("../logica/servicioCompraEntradas");
const CalendarioParque = require("../logica/calendarioParque");
const CalculadoraPrecios = require("../logica/calculadoraPrecios");
const { RepositorioUsuariosSQLite, RepositorioComprasSQLite } = require("./baseDeDatos");

const HTTP_OK = 200;
const HTTP_SOLICITUD_INVALIDA = 400;

const RELOJ_REAL = { ahora: () => new Date() };

function responderJson(respuesta, estado, cuerpo) {
  respuesta.writeHead(estado, { "Content-Type": "application/json; charset=utf-8" });
  respuesta.end(JSON.stringify(cuerpo));
}

async function leerJson(pedido) {
  let texto = "";
  for await (const parte of pedido) {
    texto += parte;
  }
  return JSON.parse(texto || "{}");
}

/**
 * Crea la función que atiende la API. Devuelve true si el pedido era de la API.
 * @param {Object} dependencias
 * @param {import("node:sqlite").DatabaseSync} dependencias.bd
 * @param {{ enviarConfirmacion: (destinatario: string, compra: Object) => Promise<void> }} dependencias.mail
 * @param {{ ahora: () => Date }} [dependencias.reloj] Se inyecta en las pruebas (ADR 3).
 * @param {string|null} [dependencias.usuarioLogueado] Mail del usuario de la sesión (USUARIO_LOGUEADO del .env,
 *   FAQ 19). Si está, las compras se hacen siempre a su nombre, aunque la solicitud diga otro usuario.
 */
function crearApi({ bd, mail, reloj = RELOJ_REAL, usuarioLogueado = null }) {
  const usuarios = new RepositorioUsuariosSQLite(bd);
  const compras = new RepositorioComprasSQLite(bd);
  const calendario = new CalendarioParque();
  const calculadora = new CalculadoraPrecios();

  async function comprar(pedido, respuesta) {
    // comprar() es sincrónico y el mail no: se anota el pedido de confirmación y se envía
    // después, cuando la compra ya quedó guardada. Si el mail falla, la compra no se pierde.
    let confirmacion = null;
    const servicio = new ServicioCompraEntradas({
      reloj, calendario, calculadora, usuarios, compras,
      mail: { enviarConfirmacion: (usuario, compra) => { confirmacion = { usuario, compra }; } },
      mercadoPago: { redirigir() {} }, // sigue simulado en la interfaz (FAQ 4)
    });

    let resultado;
    try {
      const solicitud = await leerJson(pedido);
      if (usuarioLogueado) {
        solicitud.usuario = usuarioLogueado;
      }
      resultado = servicio.comprar(solicitud);
    } catch (error) {
      // Un TypeError o un SyntaxError son una solicitud mal armada, no una regla de negocio.
      const malFormada = error instanceof TypeError || error instanceof SyntaxError;
      responderJson(respuesta, HTTP_SOLICITUD_INVALIDA, {
        error: malFormada ? "La solicitud no tiene el formato esperado" : error.message,
      });
      return;
    }

    const estadoMail = { enviado: true, destinatario: confirmacion.usuario };
    try {
      await mail.enviarConfirmacion(confirmacion.usuario, confirmacion.compra);
    } catch (error) {
      Object.assign(estadoMail, { enviado: false, error: error.message });
    }
    responderJson(respuesta, HTTP_OK, { ...resultado, mail: estadoMail });
  }

  return async function atenderApi(pedido, respuesta, ruta) {
    if (pedido.method === "GET" && ruta === "/api/sesion") {
      responderJson(respuesta, HTTP_OK, { usuario: usuarioLogueado });
      return true;
    }
    if (pedido.method === "GET" && ruta === "/api/usuarios") {
      responderJson(respuesta, HTTP_OK, usuarios.listar());
      return true;
    }
    if (pedido.method === "POST" && ruta === "/api/compras") {
      await comprar(pedido, respuesta);
      return true;
    }
    return false;
  };
}

module.exports = { crearApi };
