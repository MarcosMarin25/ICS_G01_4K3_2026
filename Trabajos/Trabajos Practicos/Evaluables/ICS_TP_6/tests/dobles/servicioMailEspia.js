// Spy (Meszaros): reemplaza al servicio de mail real y registra a quién se envió la confirmación,
// para que la prueba lo verifique después.
class ServicioMailEspia {
  constructor() {
    this.destinatarios = [];
  }

  enviarConfirmacion(usuario) {
    this.destinatarios.push(usuario);
  }

  fueEnviadoA(usuario) {
    return this.destinatarios.includes(usuario);
  }
}

module.exports = ServicioMailEspia;
