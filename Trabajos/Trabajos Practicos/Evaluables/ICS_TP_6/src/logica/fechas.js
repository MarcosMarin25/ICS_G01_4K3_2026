// Funciones de fecha compartidas por el calendario y el servicio de compra.

// Crea la fecha en la zona horaria local. new Date("AAAA-MM-DD") la interpreta en UTC
// y en Argentina (UTC-3) cae el día anterior.
function crearFechaLocal(fecha) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

// Devuelve la fecha a las 00:00, para comparar días sin tener en cuenta la hora.
function inicioDelDia(momento) {
  return new Date(momento.getFullYear(), momento.getMonth(), momento.getDate());
}

const MINUTOS_POR_HORA = 60;

// Devuelve cuántos minutos pasaron desde las 00:00 (por ejemplo, 17:30 son 1050).
function minutosDelDia(momento) {
  return momento.getHours() * MINUTOS_POR_HORA + momento.getMinutes();
}

module.exports = { crearFechaLocal, inicioDelDia, minutosDelDia, MINUTOS_POR_HORA };
