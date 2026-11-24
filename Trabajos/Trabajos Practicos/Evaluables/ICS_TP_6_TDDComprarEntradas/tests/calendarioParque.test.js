const CalendarioParque = require("../src/logica/calendarioParque");

describe("CalendarioParque", () => {
  let calendario;

  beforeEach(() => {
    calendario = new CalendarioParque();
  });

  test("K01 - un martes el parque está abierto", () => {
    expect(calendario.estaAbierto("2026-10-20")).toBe(true);
  });

  test("K02 - un domingo el parque está abierto", () => {
    expect(calendario.estaAbierto("2026-10-18")).toBe(true);
  });

  test("K03 - un lunes el parque está cerrado", () => {
    expect(calendario.estaAbierto("2026-10-19")).toBe(false);
  });

  test("K04 - el 25 de diciembre el parque está cerrado", () => {
    expect(calendario.estaAbierto("2026-12-25")).toBe(false);
  });

  test("K05 - el 1 de enero el parque está cerrado", () => {
    expect(calendario.estaAbierto("2027-01-01")).toBe(false);
  });
});
