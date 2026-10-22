// Spy (Meszaros): reemplaza al servicio de mail real y registra a quién se envió la confirmación
// y con qué detalle de la compra, para que la prueba lo verifique después.
class ServicioMailEspia {
  constructor() {
    this.destinatarios = [];
    this.compras = [];
  }

  enviarConfirmacion(usuario, compra) {
    this.destinatarios.push(usuario);
    this.compras.push(compra);
  }

  fueEnviadoA(usuario) {
    return this.destinatarios.includes(usuario);
  }

  compraEnviadaA(usuario) {
    return this.compras[this.destinatarios.indexOf(usuario)];
  }
}

module.exports = ServicioMailEspia;
