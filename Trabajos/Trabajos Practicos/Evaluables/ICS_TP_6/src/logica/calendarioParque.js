const LUNES = 1;

// Días en que el parque cierra todos los años (R1). El mes va de 1 a 12.
const FERIADOS_FIJOS = [
  { mes: 12, dia: 25 },
  { mes: 1, dia: 1 },
];

// Crea la fecha en la zona horaria local. new Date("AAAA-MM-DD") la interpreta en UTC
// y en Argentina (UTC-3) cae el día anterior.
function crearFechaLocal(fecha) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

function esFeriadoFijo(fechaLocal) {
  return FERIADOS_FIJOS.some(({ mes, dia }) =>
    fechaLocal.getMonth() + 1 === mes && fechaLocal.getDate() === dia);
}

// Indica si el parque abre en una fecha dada: todos los días menos los lunes y los feriados fijos.
class CalendarioParque {
  estaAbierto(fecha) {
    const fechaLocal = crearFechaLocal(fecha);
    return fechaLocal.getDay() !== LUNES && !esFeriadoFijo(fechaLocal);
  }
}

module.exports = CalendarioParque;
