// Funciones de fecha compartidas por el calendario y el servicio de compra.

// Crea la fecha en la zona horaria local. new Date("AAAA-MM-DD") la interpreta en UTC
// y en Argentina (UTC-3) cae el día anterior.
function crearFechaLocal(fecha) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

// Indica si la fecha "AAAA-MM-DD" existe en el calendario. Date no rechaza fechas imposibles:
// las corre en silencio ("2026-02-30" da el 02/03 y "2026-13-45" da el 14/02/2027).
// Por eso se crea la fecha y se verifica que el año, el mes y el día sean los ingresados.
function esFechaExistente(fecha) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const creada = crearFechaLocal(fecha);
  return creada.getFullYear() === anio && creada.getMonth() === mes - 1 && creada.getDate() === dia;
}

// Devuelve la fecha a las 00:00, para comparar días sin tener en cuenta la hora.
function inicioDelDia(momento) {
  return new Date(momento.getFullYear(), momento.getMonth(), momento.getDate());
}

// Devuelve el mismo día del mes siguiente. Si ese mes no tiene ese día, devuelve su último día
// (desde el 31/01 da el 28/02). Sumar un mes con new Date(anio, mes + 1, dia) desde el 31/01
// daría el 03/03, porque Date corre los días que sobran al mes siguiente.
function mismoDiaDelMesSiguiente(fecha) {
  const anio = fecha.getFullYear();
  const mesSiguiente = fecha.getMonth() + 1;
  // El día 0 de un mes es el último día del mes anterior.
  const ultimoDiaMesSiguiente = new Date(anio, mesSiguiente + 1, 0).getDate();
  return new Date(anio, mesSiguiente, Math.min(fecha.getDate(), ultimoDiaMesSiguiente));
}

const MINUTOS_POR_HORA = 60;

// Devuelve cuántos minutos pasaron desde las 00:00 (por ejemplo, 17:30 son 1050).
function minutosDelDia(momento) {
  return momento.getHours() * MINUTOS_POR_HORA + momento.getMinutes();
}

module.exports = {
  crearFechaLocal,
  esFechaExistente,
  inicioDelDia,
  mismoDiaDelMesSiguiente,
  minutosDelDia,
  MINUTOS_POR_HORA,
};
