// Fake (Meszaros): repositorio en memoria que funciona de verdad, pero sin base de datos.
// Acumula, por usuario y por fecha, las entradas compradas y cuántas de ellas son de adultos.
class RepositorioComprasFalso {
  constructor() {
    this.compras = new Map();
  }

  registrar(usuario, fecha, cantidad, adultos = 0) {
    const clave = `${usuario}|${fecha}`;
    this.compras.set(clave, {
      cantidad: this.cantidadComprada(usuario, fecha) + cantidad,
      adultos: this.adultosComprados(usuario, fecha) + adultos,
    });
  }

  cantidadComprada(usuario, fecha) {
    return this.compras.get(`${usuario}|${fecha}`)?.cantidad ?? 0;
  }

  adultosComprados(usuario, fecha) {
    return this.compras.get(`${usuario}|${fecha}`)?.adultos ?? 0;
  }
}

module.exports = RepositorioComprasFalso;
