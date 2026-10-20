// Pruebas de integración del servidor: la base SQLite (en memoria), el armado y el envío del mail
// (con un transporte de Nodemailer que no se conecta a la red) y la API.
const http = require("http");
const nodemailer = require("nodemailer");
const {
  abrirBaseDeDatos, EN_MEMORIA, RepositorioUsuariosSQLite, RepositorioComprasSQLite,
} = require("../src/servidor/baseDeDatos");
const {
  armarMailConfirmacion, crearTransporteSmtp, ServicioMailSmtp, MENSAJE_SIN_CONFIGURAR,
} = require("../src/servidor/servicioMail");
const { crearApi } = require("../src/servidor/api");
const RelojFijo = require("./dobles/relojFijo");

const USUARIO = "visitante@mail.com";
const FECHA_ABIERTA = "2026-10-20"; // martes

const COMPRA = {
  confirmada: true,
  cantidadEntradas: 2,
  fechaVisita: FECHA_ABIERTA,
  tipoPase: "VIP",
  montoTotal: 20000,
  entradas: [{ edad: 30, precio: 20000 }, { edad: 2, precio: 0 }],
};

let bd;

beforeEach(() => {
  bd = abrirBaseDeDatos(EN_MEMORIA, [USUARIO, "otro@mail.com"]);
});

afterEach(() => bd.close());

describe("Servidor - base de datos", () => {
  test("S01 - un usuario dado de alta está registrado, sin distinguir mayúsculas", () => {
    const usuarios = new RepositorioUsuariosSQLite(bd);

    expect(usuarios.estaRegistrado("Visitante@Mail.com")).toBe(true);
    expect(usuarios.estaRegistrado("desconocido@mail.com")).toBe(false);
    expect(usuarios.listar()).toEqual([USUARIO, "otro@mail.com"]);
  });

  test("S02 - suma las entradas guardadas por usuario y por fecha", () => {
    const compras = new RepositorioComprasSQLite(bd);
    compras.registrar(USUARIO, FECHA_ABIERTA, 3);
    compras.registrar(USUARIO, FECHA_ABIERTA, 4);
    compras.registrar("otro@mail.com", FECHA_ABIERTA, 5);

    expect(compras.cantidadComprada(USUARIO, FECHA_ABIERTA)).toBe(7);
    expect(compras.cantidadComprada(USUARIO, "2026-10-21")).toBe(0);
  });
});

describe("Servidor - mail de confirmación", () => {
  test("S03 - el mail informa la cantidad, la fecha, el subtotal de cada entrada y el total", () => {
    const { asunto, texto } = armarMailConfirmacion(COMPRA);
    const normalizado = texto.replace(/\s/g, " "); // Intl puede usar un espacio duro después del $

    expect(asunto).toBe("EcoHarmony Park - Confirmación de compra");
    expect(normalizado).toContain("Compraste 2 entradas VIP para el 20/10/2026.");
        expect(normalizado).toContain("Visitante 1 (Adulto, 16 a 59 años): $ 20.000");
    expect(normalizado).toContain("Visitante 2 (Bebé, hasta 3 años): sin cargo");
    expect(normalizado).toContain("Total: $ 20.000");
  });

  test("S04 - envía el mail por SMTP al destinatario, desde el remitente configurado", async () => {
    // jsonTransport es un transporte real de Nodemailer que arma el mensaje sin conectarse a la red.
    const transporte = nodemailer.createTransport({ jsonTransport: true });
    const enviados = [];
    const enviar = transporte.sendMail.bind(transporte);
    transporte.sendMail = async (mensaje) => {
      const info = await enviar(mensaje);
      enviados.push(JSON.parse(info.message));
      return info;
    };
    const mail = new ServicioMailSmtp({ transporte, remitente: "EcoHarmony Park <parque@mail.com>" });

    await mail.enviarConfirmacion(USUARIO, COMPRA);

    expect(enviados).toHaveLength(1);
    expect(enviados[0].to).toEqual([{ address: USUARIO, name: "" }]);
    expect(enviados[0].from).toEqual({ address: "parque@mail.com", name: "EcoHarmony Park" });
    expect(enviados[0].subject).toBe("EcoHarmony Park - Confirmación de compra");
  });

  test("S05 - sin SMTP configurado, el envío falla con un mensaje claro", async () => {
    const mail = new ServicioMailSmtp({ transporte: crearTransporteSmtp({}), remitente: undefined });

    await expect(mail.enviarConfirmacion(USUARIO, COMPRA)).rejects.toThrow(MENSAJE_SIN_CONFIGURAR);
    expect(crearTransporteSmtp({ SMTP_HOST: "smtp-relay.brevo.com", SMTP_USUARIO: "u", SMTP_CLAVE: "c" }))
      .not.toBeNull();
  });
});

describe("Servidor - API", () => {
  // Spy del mail asincrónico del servidor. Si se le pasa un error, el envío falla.
  class MailServidorEspia {
    constructor(error = null) {
      this.error = error;
      this.enviados = [];
    }

    async enviarConfirmacion(destinatario, compra) {
      if (this.error) {
        throw this.error;
      }
      this.enviados.push({ destinatario, compra });
    }
  }

  let servidor;

  // Levanta la API en un puerto libre y hace el pedido con fetch. Con reloj null, usa el real.
  async function pedir(mail, metodo, ruta, cuerpo, reloj = new RelojFijo("2026-10-15T10:00")) {
    const atenderApi = crearApi(reloj ? { bd, mail, reloj } : { bd, mail });
    servidor = http.createServer(async (pedido, respuesta) => {
      if (!await atenderApi(pedido, respuesta, new URL(pedido.url, "http://localhost").pathname)) {
        respuesta.writeHead(404);
        respuesta.end();
      }
    });
    await new Promise((listo) => servidor.listen(0, "127.0.0.1", listo));
    const respuesta = await fetch(`http://127.0.0.1:${servidor.address().port}${ruta}`, {
      method: metodo,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null };
  }

  afterEach(() => new Promise((listo) => servidor.close(listo)));

  const solicitudValida = (cambios = {}) => ({
    usuario: USUARIO,
    fechaVisita: FECHA_ABIERTA,
    cantidad: 2,
    edades: [30, 2],
    tipoPase: "VIP",
    formaPago: "EFECTIVO",
    ...cambios,
  });

  test("S06 - una compra válida se guarda y envía el mail con el detalle", async () => {
    const mail = new MailServidorEspia();

    const { estado, cuerpo } = await pedir(mail, "POST", "/api/compras", solicitudValida());

    expect(estado).toBe(200);
    expect(cuerpo).toEqual({ ...COMPRA, mail: { enviado: true, destinatario: USUARIO } });
    expect(mail.enviados).toEqual([{ destinatario: USUARIO, compra: COMPRA }]);
    expect(new RepositorioComprasSQLite(bd).cantidadComprada(USUARIO, FECHA_ABIERTA)).toBe(2);
  });

  test("S07 - una solicitud inválida responde 400 con el mensaje, sin guardar ni enviar", async () => {
    const mail = new MailServidorEspia();

    const { estado, cuerpo } = await pedir(mail, "POST", "/api/compras", solicitudValida({ formaPago: null }));

    expect(estado).toBe(400);
    expect(cuerpo).toEqual({ error: "Debe seleccionar una forma de pago" });
    expect(mail.enviados).toEqual([]);
    expect(new RepositorioComprasSQLite(bd).cantidadComprada(USUARIO, FECHA_ABIERTA)).toBe(0);
  });

  test("S08 - el máximo de 10 por fecha cuenta las compras guardadas en la base", async () => {
    new RepositorioComprasSQLite(bd).registrar(USUARIO, FECHA_ABIERTA, 9);

    const { estado, cuerpo } = await pedir(new MailServidorEspia(), "POST", "/api/compras", solicitudValida());

    expect(estado).toBe(400);
    expect(cuerpo).toEqual({ error: "No se pueden comprar más de 10 entradas para una misma fecha" });
  });

  test("S09 - si el mail falla, la compra queda guardada y se informa el motivo", async () => {
    const mail = new MailServidorEspia(new Error("Invalid login"));

    const { estado, cuerpo } = await pedir(mail, "POST", "/api/compras", solicitudValida());

    expect(estado).toBe(200);
    expect(cuerpo.mail).toEqual({ enviado: false, destinatario: USUARIO, error: "Invalid login" });
    expect(new RepositorioComprasSQLite(bd).cantidadComprada(USUARIO, FECHA_ABIERTA)).toBe(2);
  });

  test("S10 - una solicitud mal armada responde 400", async () => {
    const sinEdades = await pedir(new MailServidorEspia(), "POST", "/api/compras", solicitudValida({ edades: null }));

    expect(sinEdades).toEqual({ estado: 400, cuerpo: { error: "La solicitud no tiene el formato esperado" } });
  });

  test("S11 - informa los usuarios registrados y no atiende otras rutas", async () => {
    const usuarios = await pedir(new MailServidorEspia(), "GET", "/api/usuarios");
    await new Promise((listo) => servidor.close(listo));
    const otra = await pedir(new MailServidorEspia(), "GET", "/api/otra");

    expect(usuarios).toEqual({ estado: 200, cuerpo: [USUARIO, "otro@mail.com"] });
    expect(otra.estado).toBe(404);
  });

  test("S12 - sin un reloj inyectado, valida con la fecha y hora reales", async () => {
    const { cuerpo } = await pedir(new MailServidorEspia(), "POST", "/api/compras",
      solicitudValida({ fechaVisita: "2020-01-07" }), null); // un martes del pasado

    expect(cuerpo).toEqual({ error: "La fecha de visita no puede ser anterior a hoy" });
  });

  test("S13 - un menor solo se puede comprar si en la base ya hay un adulto para la fecha", async () => {
    await pedir(new MailServidorEspia(), "POST", "/api/compras", solicitudValida({ cantidad: 1, edades: [30] }));
    await new Promise((listo) => servidor.close(listo));

    const { estado } = await pedir(new MailServidorEspia(), "POST", "/api/compras",
      solicitudValida({ cantidad: 1, edades: [8] }));

    expect(estado).toBe(200);
  });
});
