// Valores válidos de la solicitud de compra y rangos de edad compartidos, en un solo lugar.

const TIPO_PASE = Object.freeze({
  VIP: "VIP",
  REGULAR: "REGULAR",
});

const FORMA_PAGO = Object.freeze({
  TARJETA: "TARJETA",
  EFECTIVO: "EFECTIVO",
});

// Hasta esta edad inclusive, un visitante es menor: paga 50% (R3) y necesita una entrada de
// adulto para la misma fecha (R9). Desde la edad siguiente es adulto.
const EDAD_MAXIMA_MENOR = 15;

// Cantidad de entradas de adulto entre las edades de una compra (R9).
const contarAdultos = (edades) => edades.filter((edad) => edad > EDAD_MAXIMA_MENOR).length;

module.exports = { TIPO_PASE, FORMA_PAGO, EDAD_MAXIMA_MENOR, contarAdultos };
