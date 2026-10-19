// Valores válidos de la solicitud de compra, en un solo lugar.

const TIPO_PASE = Object.freeze({
  VIP: "VIP",
  REGULAR: "REGULAR",
});

const FORMA_PAGO = Object.freeze({
  TARJETA: "TARJETA",
  EFECTIVO: "EFECTIVO",
});

module.exports = { TIPO_PASE, FORMA_PAGO };
