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

  test("C05 - un niño de 4 años paga la mitad", () => {
    expect(calculadora.precioEntrada(4, "REGULAR")).toBe(5000);
  });

  test("C06 - un menor de 15 años paga la mitad", () => {
    expect(calculadora.precioEntrada(15, "VIP")).toBe(10000);
  });

  test("C07 - una persona de 16 años paga entero", () => {
    expect(calculadora.precioEntrada(16, "REGULAR")).toBe(10000);
  });

  test("C08 - una persona de 59 años paga entero", () => {
    expect(calculadora.precioEntrada(59, "VIP")).toBe(20000);
  });

  test("C09 - una persona de 60 años paga la mitad", () => {
    expect(calculadora.precioEntrada(60, "REGULAR")).toBe(5000);
  });
});
