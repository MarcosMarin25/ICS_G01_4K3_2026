const PRECIO_REGULAR = 10000;
const PRECIO_VIP = 20000;

const EDAD_MAXIMA_GRATIS = 3;
const EDAD_MAXIMA_MENOR = 15;
const EDAD_MINIMA_MAYOR = 60;

// Devuelve el precio de una entrada según la edad del visitante y el tipo de pase.
class CalculadoraPrecios {
  precioEntrada(edad, tipoPase) {
    const precioBase = tipoPase === "VIP" ? PRECIO_VIP : PRECIO_REGULAR;

    if (edad <= EDAD_MAXIMA_GRATIS) {
      return 0;
    }
    if (edad <= EDAD_MAXIMA_MENOR || edad >= EDAD_MINIMA_MAYOR) {
      return precioBase / 2;
    }
    return precioBase;
  }
}

module.exports = CalculadoraPrecios;
