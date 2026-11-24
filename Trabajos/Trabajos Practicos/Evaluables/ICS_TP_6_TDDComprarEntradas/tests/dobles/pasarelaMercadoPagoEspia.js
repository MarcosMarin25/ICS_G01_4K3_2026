// Spy (Meszaros): reemplaza a Mercado Pago y registra si se pidió la redirección al pago
// y con qué monto, para que la prueba lo verifique después.
class PasarelaMercadoPagoEspia {
  constructor() {
    this.montos = [];
  }

  redirigir(monto) {
    this.montos.push(monto);
  }

  fueLlamada() {
    return this.montos.length > 0;
  }

  fueLlamadaConMonto(monto) {
    return this.montos.includes(monto);
  }
}

module.exports = PasarelaMercadoPagoEspia;
