const { TIPO_PASE, EDAD_MAXIMA_MENOR } = require("./valores");

const PRECIO_REGULAR = 10000;
const PRECIO_VIP = 20000;

const EDAD_MAXIMA_GRATIS = 3;
const EDAD_MINIMA_MAYOR = 60;

const PORCENTAJE_DESCUENTO = 50;
const PORCENTAJE_TOTAL = 100;

// Devuelve el precio de una entrada según la edad del visitante y el tipo de pase.
class CalculadoraPrecios {
  precioEntrada(edad, tipoPase) {
    const precioBase = tipoPase === TIPO_PASE.VIP ? PRECIO_VIP : PRECIO_REGULAR;

    if (edad <= EDAD_MAXIMA_GRATIS) {
      return 0;
    }
    if (edad <= EDAD_MAXIMA_MENOR || edad >= EDAD_MINIMA_MAYOR) {
      return precioBase * (PORCENTAJE_TOTAL - PORCENTAJE_DESCUENTO) / PORCENTAJE_TOTAL;
    }
    return precioBase;
  }
}

module.exports = CalculadoraPrecios;
