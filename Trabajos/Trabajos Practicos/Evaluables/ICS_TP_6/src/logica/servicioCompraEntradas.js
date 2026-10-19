const {
  crearFechaLocal, esFechaExistente, inicioDelDia, mismoDiaDelMesSiguiente, minutosDelDia, MINUTOS_POR_HORA,
} = require("./fechas");
const { TIPO_PASE, FORMA_PAGO } = require("./valores");

// Para visitar el día actual se puede comprar hasta las 17:30 inclusive (R5).
const HORA_LIMITE_MISMO_DIA = 17;
const MINUTO_LIMITE_MISMO_DIA = 30;
const LIMITE_MISMO_DIA_EN_MINUTOS = HORA_LIMITE_MISMO_DIA * MINUTOS_POR_HORA + MINUTO_LIMITE_MISMO_DIA;

// Un usuario puede comprar como máximo 10 entradas para una misma fecha (CA 7, R6).
const MAXIMO_ENTRADAS_POR_FECHA = 10;

/**
 * Interfaces que el servicio espera de sus dependencias (inversión de dependencias:
 * el servicio depende de estas abstracciones, no de Mercado Pago ni de un mail reales).
 *
 * @typedef {Object} Reloj
 * @property {() => Date} ahora Fecha y hora actuales.
 *
 * @typedef {Object} Calendario
 * @property {(fecha: string) => boolean} estaAbierto Indica si el parque abre en la fecha "AAAA-MM-DD".
 *
 * @typedef {Object} Calculadora
 * @property {(edad: number, tipoPase: string) => number} precioEntrada Precio de una entrada.
 *
 * @typedef {Object} RepositorioUsuarios
 * @property {(usuario: string) => boolean} estaRegistrado Indica si el usuario está registrado.
 *
 * @typedef {Object} RepositorioCompras
 * @property {(usuario: string, fecha: string, cantidad: number) => void} registrar Guarda una compra.
 * @property {(usuario: string, fecha: string) => number} cantidadComprada Entradas ya compradas para la fecha.
 *
 * @typedef {Object} ServicioMail
 * @property {(usuario: string) => void} enviarConfirmacion Envía el mail de confirmación.
 *
 * @typedef {Object} PasarelaPago
 * @property {(monto: number) => void} redirigir Redirige al pago con tarjeta por el monto indicado.
 */

// Valida una solicitud de compra de entradas y, si es válida, concreta la compra.
class ServicioCompraEntradas {
  /**
   * @param {Object} dependencias
   * @param {Reloj} dependencias.reloj
   * @param {Calendario} dependencias.calendario
   * @param {Calculadora} dependencias.calculadora
   * @param {RepositorioUsuarios} dependencias.usuarios
   * @param {RepositorioCompras} dependencias.compras
   * @param {ServicioMail} dependencias.mail
   * @param {PasarelaPago} dependencias.mercadoPago
   */
  constructor({ reloj, calendario, calculadora, usuarios, compras, mail, mercadoPago }) {
    this.reloj = reloj;
    this.calendario = calendario;
    this.calculadora = calculadora;
    this.usuarios = usuarios;
    this.compras = compras;
    this.mail = mail;
    this.mercadoPago = mercadoPago;
  }

  /**
   * Valida la solicitud y, si es válida, registra la compra, redirige al pago con tarjeta
   * y envía el mail de confirmación. Si es inválida, lanza un error y no hace nada de eso.
   * Las validaciones siguen un orden fijo: usuario, datos obligatorios, valores, reglas de fecha
   * y máximo por fecha.
   */
  comprar(solicitud) {
    this.#validarUsuario(solicitud);
    this.#validarDatosObligatorios(solicitud);
    this.#validarValores(solicitud);
    this.#validarReglasDeFecha(solicitud);
    this.#validarMaximoPorFecha(solicitud);

    const entradas = this.#emitirEntradas(solicitud);
    const montoTotal = entradas.reduce((total, entrada) => total + entrada.precio, 0);

    this.compras.registrar(solicitud.usuario, solicitud.fechaVisita, solicitud.cantidad);
    if (solicitud.formaPago === FORMA_PAGO.TARJETA) {
      this.mercadoPago.redirigir(montoTotal);
    }
    this.mail.enviarConfirmacion(solicitud.usuario);
    return {
      confirmada: true,
      cantidadEntradas: solicitud.cantidad,
      fechaVisita: solicitud.fechaVisita,
      tipoPase: solicitud.tipoPase,
      montoTotal,
      entradas,
    };
  }

  validarCampos() {
    return {};
  }

  #validarUsuario({ usuario }) {
    if (!this.usuarios.estaRegistrado(usuario)) {
      throw new Error("Solo los usuarios registrados pueden comprar entradas");
    }
  }

  #validarDatosObligatorios({ fechaVisita, tipoPase, formaPago }) {
    if (!fechaVisita) {
      throw new Error("Debe indicar la fecha de visita");
    }
    if (!tipoPase) {
      throw new Error("Debe indicar el tipo de pase");
    }
    if (!formaPago) {
      throw new Error("Debe seleccionar una forma de pago");
    }
  }

  #validarValores({ fechaVisita, tipoPase, formaPago, cantidad, edades }) {
    if (!esFechaExistente(fechaVisita)) {
      throw new Error("Fecha de visita inválida");
    }
    if (!Object.values(TIPO_PASE).includes(tipoPase)) {
      throw new Error("El tipo de pase debe ser VIP o regular");
    }
    if (!Object.values(FORMA_PAGO).includes(formaPago)) {
      throw new Error("La forma de pago debe ser tarjeta o efectivo");
    }
    // La cantidad se valida antes que las edades: con una cantidad inválida
    // no tiene sentido comparar cuántas edades se ingresaron (F11, F20).
    if (!Number.isInteger(cantidad)) {
      throw new Error("La cantidad de entradas debe ser un número entero");
    }
    if (cantidad < 1) {
      throw new Error("La cantidad de entradas debe ser al menos 1");
    }
    if (edades.length !== cantidad) {
      throw new Error("Debe indicar la edad de cada visitante");
    }
    if (edades.some((edad) => !Number.isInteger(edad) || edad < 0)) {
      throw new Error("Edad inválida");
    }
  }

  #validarReglasDeFecha(solicitud) {
    const fechaVisita = crearFechaLocal(solicitud.fechaVisita);
    const ahora = this.reloj.ahora();
    const hoy = inicioDelDia(ahora);

    if (fechaVisita < hoy) {
      throw new Error("La fecha de visita no puede ser anterior a hoy");
    }
    if (!this.calendario.estaAbierto(solicitud.fechaVisita)) {
      throw new Error("El parque está cerrado en la fecha seleccionada");
    }
    if (fechaVisita > mismoDiaDelMesSiguiente(hoy)) {
      throw new Error("Solo se pueden comprar entradas con hasta un mes de anticipación");
    }
    const esHoy = fechaVisita.getTime() === hoy.getTime();
    if (esHoy && minutosDelDia(ahora) > LIMITE_MISMO_DIA_EN_MINUTOS) {
      throw new Error("Las entradas para hoy se pueden comprar hasta las 17:30");
    }
  }

  #validarMaximoPorFecha({ usuario, fechaVisita, cantidad }) {
    const yaCompradas = this.compras.cantidadComprada(usuario, fechaVisita);
    if (yaCompradas + cantidad > MAXIMO_ENTRADAS_POR_FECHA) {
      throw new Error("No se pueden comprar más de 10 entradas para una misma fecha");
    }
  }

  // Emite una entrada por visitante, con su precio. Los menores de hasta 3 años reciben una de $0 (R8).
  #emitirEntradas({ edades, tipoPase }) {
    return edades.map((edad) => ({
      edad,
      precio: this.calculadora.precioEntrada(edad, tipoPase),
    }));
  }
}

module.exports = ServicioCompraEntradas;
