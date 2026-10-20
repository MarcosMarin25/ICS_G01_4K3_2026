// Envío real del mail de confirmación por SMTP (por ejemplo, el relay de Brevo), con Nodemailer.
const nodemailer = require("nodemailer");
const { TIPO_PASE } = require("../logica/valores");

const PUERTO_SMTP = 587; // STARTTLS
const MENSAJE_SIN_CONFIGURAR = "El envío de mails no está configurado: completá las variables SMTP_* del archivo .env";

const formatoPesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function fechaLegible(texto) {
  const [anio, mes, dia] = texto.split("-");
  return `${dia}/${mes}/${anio}`;
}

function nombreCategoria(edad) {
  if (edad <= 3) return "Bebé, hasta 3 años";
  if (edad <= 15) return "Menor, 4 a 15 años";
  if (edad <= 59) return "Adulto, 16 a 59 años";
  return "Mayor, 60 años o más";
}

// Arma el mail con lo que pide la US y el FAQ 18: cantidad de entradas, fecha, el detalle de cada
// entrada con su subtotal y el total. Recibe el resultado de comprar().
function armarMailConfirmacion({ cantidadEntradas, fechaVisita, tipoPase, entradas, montoTotal }) {
  const pase = tipoPase === TIPO_PASE.VIP ? "VIP" : "regulares";
  const lineas = entradas.map(({ edad, precio }, i) =>
    `Visitante ${i + 1} (${nombreCategoria(edad)}): ${precio === 0 ? "sin cargo" : formatoPesos.format(precio)}`);
  return {
    asunto: "EcoHarmony Park - Confirmación de compra",
    texto: [
      `¡Gracias por tu compra! Compraste ${cantidadEntradas} ${cantidadEntradas === 1 ? "entrada" : "entradas"} `
        + `${pase} para el ${fechaLegible(fechaVisita)}.`,
      "",
      ...lineas,
      "",
      `Total: ${formatoPesos.format(montoTotal)}`,
    ].join("\n"),
  };
}

// Crea el transporte SMTP a partir de las variables del .env, o null si falta algún dato.
function crearTransporteSmtp({ SMTP_HOST, SMTP_PUERTO, SMTP_USUARIO, SMTP_CLAVE }) {
  if (!SMTP_HOST || !SMTP_USUARIO || !SMTP_CLAVE) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PUERTO ?? PUERTO_SMTP),
    auth: { user: SMTP_USUARIO, pass: SMTP_CLAVE },
  });
}

class ServicioMailSmtp {
  constructor({ transporte, remitente }) {
    this.transporte = transporte;
    this.remitente = remitente;
  }

  async enviarConfirmacion(destinatario, compra) {
    if (!this.transporte) {
      throw new Error(MENSAJE_SIN_CONFIGURAR);
    }
    const { asunto, texto } = armarMailConfirmacion(compra);
    await this.transporte.sendMail({ from: this.remitente, to: destinatario, subject: asunto, text: texto });
  }
}

module.exports = { armarMailConfirmacion, crearTransporteSmtp, ServicioMailSmtp, MENSAJE_SIN_CONFIGURAR };