// Persistencia básica en SQLite, con el módulo node:sqlite que trae Node (sin dependencias).
// Los repositorios cumplen las interfaces RepositorioUsuarios y RepositorioCompras de
// ServicioCompraEntradas, que son sincrónicas como DatabaseSync: el servicio no cambia.
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const EN_MEMORIA = ":memory:";

const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS usuarios (
    email TEXT PRIMARY KEY COLLATE NOCASE
  );
  CREATE TABLE IF NOT EXISTS compras (
    id           INTEGER PRIMARY KEY,
    usuario      TEXT    NOT NULL COLLATE NOCASE REFERENCES usuarios (email),
    fecha_visita TEXT    NOT NULL,
    cantidad     INTEGER NOT NULL,
    creada_en    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`;

// Abre (o crea) la base, crea las tablas y da de alta los usuarios de la sesión simulada (FAQ 19).
function abrirBaseDeDatos(ruta, usuariosRegistrados) {
  if (ruta !== EN_MEMORIA) {
    fs.mkdirSync(path.dirname(ruta), { recursive: true });
  }
  const bd = new DatabaseSync(ruta);
  bd.exec(ESQUEMA);
  const insertar = bd.prepare("INSERT OR IGNORE INTO usuarios (email) VALUES (?)");
  usuariosRegistrados.forEach((email) => insertar.run(email));
  return bd;
}

class RepositorioUsuariosSQLite {
  constructor(bd) {
    this.consultaRegistrado = bd.prepare("SELECT 1 FROM usuarios WHERE email = ?");
    this.consultaTodos = bd.prepare("SELECT email FROM usuarios ORDER BY rowid");
  }

  estaRegistrado(usuario) {
    return this.consultaRegistrado.get(usuario) !== undefined;
  }

  listar() {
    return this.consultaTodos.all().map((fila) => fila.email);
  }
}

class RepositorioComprasSQLite {
  constructor(bd) {
    this.insertar = bd.prepare("INSERT INTO compras (usuario, fecha_visita, cantidad) VALUES (?, ?, ?)");
    this.consultaCantidad = bd.prepare(
      "SELECT COALESCE(SUM(cantidad), 0) AS cantidad FROM compras WHERE usuario = ? AND fecha_visita = ?");
  }

  registrar(usuario, fecha, cantidad) {
    this.insertar.run(usuario, fecha, cantidad);
  }

  cantidadComprada(usuario, fecha) {
    return this.consultaCantidad.get(usuario, fecha).cantidad;
  }
}

module.exports = { abrirBaseDeDatos, EN_MEMORIA, RepositorioUsuariosSQLite, RepositorioComprasSQLite };
