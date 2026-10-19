const CalculadoraPrecios = require("../src/logica/calculadoraPrecios");

describe("CalculadoraPrecios", () => {
  let calculadora;

  beforeEach(() => {
    calculadora = new CalculadoraPrecios();
  });

  test("C01 - un adulto con pase regular paga $10.000", () => {
    expect(calculadora.precioEntrada(30, "REGULAR")).toBe(10000);
  });
});
