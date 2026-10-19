const CalculadoraPrecios = require("../src/logica/calculadoraPrecios");

describe("CalculadoraPrecios", () => {
  let calculadora;

  beforeEach(() => {
    calculadora = new CalculadoraPrecios();
  });

  test("C01 - un adulto con pase regular paga $10.000", () => {
    expect(calculadora.precioEntrada(30, "REGULAR")).toBe(10000);
  });

  test("C02 - un adulto con pase VIP paga $20.000", () => {
    expect(calculadora.precioEntrada(30, "VIP")).toBe(20000);
  });

  test("C03 - un niño de 1 año no paga", () => {
    expect(calculadora.precioEntrada(1, "VIP")).toBe(0);
  });

  test("C04 - un niño de 3 años no paga", () => {
    expect(calculadora.precioEntrada(3, "VIP")).toBe(0);
  });
});
