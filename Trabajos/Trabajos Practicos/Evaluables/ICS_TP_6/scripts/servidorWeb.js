// Servidor estático mínimo para abrir la interfaz web con `npm run web`.
// Hace falta porque el navegador no deja que una página abierta como file:// lea con fetch()
// los módulos de src/logica. Solo sirve archivos de src/ y solo escucha en la máquina local.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PUERTO = 8080;
const RAIZ = path.resolve(__dirname, "..");
const CARPETA_PUBLICA = path.join(RAIZ, "src");
const PAGINA_INICIAL = "/src/web/";

const HTTP_OK = 200;
const HTTP_REDIRECCION = 302;
const HTTP_NO_ENCONTRADO = 404;

const TIPOS_DE_CONTENIDO = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function responderNoEncontrado(respuesta) {
  respuesta.writeHead(HTTP_NO_ENCONTRADO, { "Content-Type": "text/plain; charset=utf-8" });
  respuesta.end("No encontrado");
}

const servidor = http.createServer((pedido, respuesta) => {
  const ruta = decodeURIComponent(new URL(pedido.url, "http://localhost").pathname);
  if (ruta === "/") {
    respuesta.writeHead(HTTP_REDIRECCION, { Location: PAGINA_INICIAL });
    respuesta.end();
    return;
  }

  const archivo = path.join(RAIZ, ruta.endsWith("/") ? `${ruta}index.html` : ruta);
  // path.join resuelve los "..": si la ruta final queda fuera de src/, no se sirve.
  if (!archivo.startsWith(CARPETA_PUBLICA + path.sep)) {
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

servidor.listen(PUERTO, "127.0.0.1", () => {
  console.log(`EcoHarmony Park - Comprar entradas: http://localhost:${PUERTO}${PAGINA_INICIAL}`);
});
