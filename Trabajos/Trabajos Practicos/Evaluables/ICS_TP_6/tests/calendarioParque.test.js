const CalendarioParque = require("../src/logica/calendarioParque");

describe("CalendarioParque", () => {
  let calendario;

  beforeEach(() => {
    calendario = new CalendarioParque();
  });

  test("K01 - un martes el parque está abierto", () => {
    expect(calendario.estaAbierto("2026-10-20")).toBe(true);
  });
});
