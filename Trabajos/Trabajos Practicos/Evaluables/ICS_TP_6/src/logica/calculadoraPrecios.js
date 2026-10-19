class CalculadoraPrecios {
  precioEntrada(edad, tipoPase) {
    let precio = 10000;
    if (tipoPase === "VIP") {
      precio = 20000;
    }

    if (edad <= 3) {
      return 0;
    }
    if (edad <= 15 || edad >= 60) {
      return precio / 2;
    }
    return precio;
  }
}

module.exports = CalculadoraPrecios;
