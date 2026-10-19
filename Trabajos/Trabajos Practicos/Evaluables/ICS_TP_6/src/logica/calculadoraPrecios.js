class CalculadoraPrecios {
  precioEntrada(edad, tipoPase) {
    if (edad <= 3) {
      return 0;
    }
    if (tipoPase === "VIP") {
      return 20000;
    }
    return 10000;
  }
}

module.exports = CalculadoraPrecios;
