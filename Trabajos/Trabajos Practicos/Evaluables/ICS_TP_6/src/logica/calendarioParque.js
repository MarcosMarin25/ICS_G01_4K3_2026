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
    if (fechaLocal.getMonth() === 11 && fechaLocal.getDate() === 25) {
      return false;
    }
    return fechaLocal.getDay() !== LUNES;
  }
}

module.exports = CalendarioParque;
