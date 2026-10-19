// Indica si el parque abre en una fecha dada.
class CalendarioParque {
  estaAbierto(fecha) {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    return new Date(anio, mes - 1, dia).getDay() !== 1;
  }
}

module.exports = CalendarioParque;
