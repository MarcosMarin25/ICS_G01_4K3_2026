// Servidor mínimo para abrir la interfaz web con `npm run web`.
// Hace falta porque el navegador no deja que una página abierta como file:// lea con fetch()
// los módulos de src/logica. Solo sirve archivos de src/ y solo escucha en la máquina local.
// Además atiende la API de src/servidor: guarda las compras en SQLite y envía el mail real.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { abrirBaseDeDatos } = require("../src/servidor/baseDeDatos");
const { crearTransporteSmtp, ServicioMailSmtp, MENSAJE_SIN_CONFIGURAR } = require("../src/servidor/servicioMail");
const { crearApi } = require("../src/servidor/api");

const PUERTO_POR_DEFECTO = 8080;
const PUERTO_ALTERNO = 8081;
const PUERTO = Number(process.env.PORT) || PUERTO_POR_DEFECTO;
const RAIZ = path.resolve(__dirname, "..");
const CARPETA_PUBLICA = path.join(RAIZ, "src");
const CARPETA_SERVIDOR = path.join(RAIZ, "src", "servidor");
const PAGINA_INICIAL = "/src/web/";
const RUTA_BASE_DE_DATOS = path.join(RAIZ, "datos", "ecoharmony.db");
const USUARIOS_POR_DEFECTO = "visitante@mail.com,otro@mail.com";

// Configuración del mail y de los usuarios en .env.local y .env (ver .env.example).
// .env.local tiene prioridad sobre .env para credenciales privadas que no se suben a git.
try {
  process.loadEnvFile(path.join(RAIZ, ".env.local"));
} catch {
  // .env.local es opcional
}
try {
  process.loadEnvFile(path.join(RAIZ, ".env"));
} catch {
  console.warn("No se encontró el archivo .env (ver .env.example).");
}
const usuariosRegistrados = (process.env.USUARIOS_REGISTRADOS ?? USUARIOS_POR_DEFECTO)
  .split(",").map((email) => email.trim()).filter(Boolean);
const transporte = crearTransporteSmtp(process.env);
const atenderApi = crearApi({
  bd: abrirBaseDeDatos(RUTA_BASE_DE_DATOS, usuariosRegistrados),
  mail: new ServicioMailSmtp({ transporte, remitente: process.env.MAIL_REMITENTE }),
});

const HTTP_OK = 200;
const HTTP_REDIRECCION = 302;
const HTTP_NO_ENCONTRADO = 404;
const HTTP_ERROR_INTERNO = 500;
const HTTP_NO_IMPLEMENTADO = 501;
const HTTP_BAD_GATEWAY = 502;

const TIPOS_DE_CONTENIDO = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

function responderNoEncontrado(respuesta) {
  respuesta.writeHead(HTTP_NO_ENCONTRADO, { "Content-Type": "text/plain; charset=utf-8" });
  respuesta.end("No encontrado");
}

const servidor = http.createServer(async (pedido, respuesta) => {
  const ruta = decodeURIComponent(new URL(pedido.url, "http://localhost").pathname);

  if (pedido.method === "POST" && ruta === "/api/mercadopago/preferencia") {
    const token = process.env.MP_ACCESS_TOKEN || process.env.TOKEN_MP;
    if (!token) {
      respuesta.writeHead(HTTP_NO_IMPLEMENTADO, { "Content-Type": "application/json; charset=utf-8" });
      respuesta.end(JSON.stringify({ error: "Falta configurar MP_ACCESS_TOKEN" }));
      return;
    }
    let cuerpo = "";
    pedido.on("data", (pedazo) => {
      cuerpo += pedazo;
    });
    pedido.on("end", async () => {
      try {
        const { monto, cantidadEntradas, fechaVisita, tipoPase, origen } = JSON.parse(cuerpo);
        const respuestaMp = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: [
              {
                title: `EcoHarmony Park - ${cantidadEntradas} entrada(s) ${tipoPase} (${fechaVisita})`,
                quantity: 1,
                currency_id: "ARS",
                unit_price: Number(monto),
              },
            ],
            back_urls: {
              success: `${origen}/src/web/?mp_status=approved`,
              failure: `${origen}/src/web/?mp_status=rejected`,
              pending: `${origen}/src/web/?mp_status=pending`,
            },
            ...(origen.startsWith("https://") ? { auto_return: "approved" } : {}),
          }),
        });
        const datos = await respuestaMp.json();
        if (!respuestaMp.ok) {
          respuesta.writeHead(HTTP_BAD_GATEWAY, { "Content-Type": "application/json; charset=utf-8" });
          respuesta.end(JSON.stringify({ error: datos.message || "Error al crear preferencia en MP" }));
          return;
        }
        respuesta.writeHead(HTTP_OK, { "Content-Type": "application/json; charset=utf-8" });
        respuesta.end(JSON.stringify({
          id: datos.id,
          sandboxUrl: datos.init_point || datos.sandbox_init_point,
          initPoint: datos.init_point,
        }));
      } catch {
        respuesta.writeHead(HTTP_ERROR_INTERNO, { "Content-Type": "application/json; charset=utf-8" });
        respuesta.end(JSON.stringify({ error: "Error interno al conectar con Mercado Pago" }));
      }
    });
    return;
  }

  if (await atenderApi(pedido, respuesta, ruta)) {
    return;
  }
  if (ruta === "/") {
    respuesta.writeHead(HTTP_REDIRECCION, { Location: PAGINA_INICIAL });
    respuesta.end();
    return;
  }

  const archivo = path.join(RAIZ, ruta.endsWith("/") ? `${ruta}index.html` : ruta);
  // path.join resuelve los "..": si la ruta final queda fuera de src/, no se sirve.
  // El código del servidor tampoco se publica.
  if (!archivo.startsWith(CARPETA_PUBLICA + path.sep) || archivo.startsWith(CARPETA_SERVIDOR + path.sep)) {
    responderNoEncontrado(respuesta);
    return;
  }

  fs.readFile(archivo, (error, contenido) => {
    if (error) {
      responderNoEncontrado(respuesta);
      return;
    }
    const tipo = TIPOS_DE_CONTENIDO[path.extname(archivo)] ?? "application/octet-stream";
    respuesta.writeHead(HTTP_OK, { "Content-Type": tipo });
    respuesta.end(contenido);
  });
});

let puertoActual = PUERTO;

servidor.on("error", (error) => {
  if ((error.code === "EACCES" || error.code === "EADDRINUSE") && puertoActual === PUERTO && !process.env.PORT) {
    puertoActual = PUERTO_ALTERNO;
    servidor.listen(puertoActual, "127.0.0.1", () => {
      console.log(`EcoHarmony Park - Comprar entradas: http://localhost:${puertoActual}${PAGINA_INICIAL}`);
      console.log(`Usuarios registrados: ${usuariosRegistrados.join(", ")}`);
    });
  } else {
    throw error;
  }
});

servidor.listen(puertoActual, "127.0.0.1", () => {
  console.log(`EcoHarmony Park - Comprar entradas: http://localhost:${puertoActual}${PAGINA_INICIAL}`);
  console.log(`Usuarios registrados: ${usuariosRegistrados.join(", ")}`);
});

// Verifica las credenciales SMTP al arrancar, para no enterarse recién en la primera compra.
if (transporte) {
  transporte.verify()
    .then(() => console.log(`SMTP listo (${process.env.SMTP_HOST})`))
    .catch((error) => console.error(`No se pudo conectar al SMTP: ${error.message}`));
} else {
  console.warn(MENSAJE_SIN_CONFIGURAR);
}
