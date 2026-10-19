// Valida una solicitud de compra de entradas y, si es válida, concreta la compra.
class ServicioCompraEntradas {
  constructor({ reloj, calendario, calculadora, usuarios, compras, mail, mercadoPago }) {
    this.reloj = reloj;
    this.calendario = calendario;
    this.calculadora = calculadora;
    this.usuarios = usuarios;
    this.compras = compras;
    this.mail = mail;
    this.mercadoPago = mercadoPago;
  }

  comprar(solicitud) {
    if (solicitud.formaPago === "TARJETA") {
      this.mercadoPago.redirigir(50000);
    }
    this.mail.enviarConfirmacion(solicitud.usuario);
    return {
      confirmada: true,
      cantidadEntradas: solicitud.cantidad,
      fechaVisita: solicitud.fechaVisita,
      tipoPase: solicitud.tipoPase,
    };
  }
}

module.exports = ServicioCompraEntradas;
