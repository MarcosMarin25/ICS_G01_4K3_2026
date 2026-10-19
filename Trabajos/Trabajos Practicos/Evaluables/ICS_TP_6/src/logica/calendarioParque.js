const LUNES = 1;

// Crea la fecha en la zona horaria local. new Date("AAAA-MM-DD") la interpreta en UTC
// y en Argentina (UTC-3) cae el día anterior.
function crearFechaLocal(fecha) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

// Indica si el parque abre en una fecha dada.
class CalendarioParque {
  estaAbierto(fecha) {
    const fechaLocal = crearFechaLocal(fecha);
    const feriados = [[11, 25], [0, 1]];
    const esFeriado = feriados.some(([mes, dia]) =>
      fechaLocal.getMonth() === mes && fechaLocal.getDate() === dia);
    if (esFeriado) {
      return false;
    }
    return fechaLocal.getDay() !== LUNES;
  }
}

module.exports = CalendarioParque;
