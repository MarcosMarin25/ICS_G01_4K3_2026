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

module.exports = { crearFechaLocal, inicioDelDia };
