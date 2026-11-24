// Stub (Meszaros): devuelve una fecha y hora fijas, para que las pruebas no dependan
// del momento en que se corren. Formato: "AAAA-MM-DDTHH:MM", en la zona horaria local.
class RelojFijo {
  constructor(ahora) {
    this.fijar(ahora);
  }

  fijar(ahora) {
    const [fecha, hora] = ahora.split("T");
    const [anio, mes, dia] = fecha.split("-").map(Number);
    const [horas, minutos] = hora.split(":").map(Number);
    this.momento = new Date(anio, mes - 1, dia, horas, minutos);
  }

  ahora() {
    return new Date(this.momento);
  }
}

module.exports = RelojFijo;
