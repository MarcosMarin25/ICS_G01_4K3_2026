// Fake (Meszaros): repositorio en memoria que funciona de verdad, pero sin base de datos.
// Acumula las entradas compradas por usuario y por fecha.
class RepositorioComprasFalso {
  constructor() {
    this.compras = new Map();
  }

  registrar(usuario, fecha, cantidad) {
    const clave = `${usuario}|${fecha}`;
    this.compras.set(clave, this.cantidadComprada(usuario, fecha) + cantidad);
  }

  cantidadComprada(usuario, fecha) {
    return this.compras.get(`${usuario}|${fecha}`) ?? 0;
  }
}

module.exports = RepositorioComprasFalso;
