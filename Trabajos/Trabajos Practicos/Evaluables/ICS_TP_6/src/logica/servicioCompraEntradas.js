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

// Hasta esta edad, un visitante necesita una entrada de adulto para la misma fecha (R9).
const EDAD_MAXIMA_MENOR = 15;

const contarAdultos = (edades) => edades.filter((edad) => edad > EDAD_MAXIMA_MENOR).length;

const esHoy = (solicitud, { hoy }) => crearFechaLocal(solicitud.fechaVisita).getTime() === hoy.getTime();

/**
 * Reglas de validación de la solicitud, en el orden en que se aplican (ADR 6): usuario, datos
 * obligatorios, valores válidos, reglas de fecha y máximo por fecha. Es la única definición de
 * cada regla: comprar() corta en la primera que no se cumple, y validarCampos() informa el primer
 * error de cada campo.
 * - campo: dónde informa el error validarCampos().
 * - requiere: campos que tienen que ser válidos para poder evaluar la regla.
 */
const REGLAS = [
  // 1. Usuario registrado
  {
    campo: "usuario",
    mensaje: "Solo los usuarios registrados pueden comprar entradas",
    seIncumple: (solicitud, { usuarios }) => !usuarios.estaRegistrado(solicitud.usuario),
  },

  // 2. Datos obligatorios
  {
    campo: "fechaVisita",
    mensaje: "Debe indicar la fecha de visita",
    seIncumple: (solicitud) => !solicitud.fechaVisita,
  },
  {
    campo: "tipoPase",
    mensaje: "Debe indicar el tipo de pase",
    seIncumple: (solicitud) => !solicitud.tipoPase,
  },
  {
    campo: "formaPago",
    mensaje: "Debe seleccionar una forma de pago",
    seIncumple: (solicitud) => !solicitud.formaPago,
  },

  // 3. Valores válidos. La cantidad se valida completa antes que las edades (F11, F20).
  {
    campo: "fechaVisita",
    mensaje: "Fecha de visita inválida",
    seIncumple: (solicitud) => !esFechaExistente(solicitud.fechaVisita),
  },
  {
    campo: "tipoPase",
    mensaje: "El tipo de pase debe ser VIP o regular",
    seIncumple: (solicitud) => !Object.values(TIPO_PASE).includes(solicitud.tipoPase),
  },
  {
    campo: "formaPago",
    mensaje: "La forma de pago debe ser tarjeta o efectivo",
    seIncumple: (solicitud) => !Object.values(FORMA_PAGO).includes(solicitud.formaPago),
  },
  {
    campo: "cantidad",
    mensaje: "La cantidad de entradas debe ser un número entero",
    seIncumple: (solicitud) => !Number.isInteger(solicitud.cantidad),
  },
  {
    campo: "cantidad",
    mensaje: "La cantidad de entradas debe ser al menos 1",
    seIncumple: (solicitud) => solicitud.cantidad < 1,
  },
  {
    campo: "edades",
    requiere: ["cantidad"],
    mensaje: "Debe indicar la edad de cada visitante",
    seIncumple: (solicitud) => solicitud.edades.length !== solicitud.cantidad,
  },
  {
    campo: "edades",
    requiere: ["cantidad"],
    mensaje: "Edad inválida",
    seIncumple: (solicitud) => solicitud.edades.some((edad) => !Number.isInteger(edad) || edad < 0),
  },

  // 4. Reglas de fecha
  {
    campo: "fechaVisita",
    mensaje: "La fecha de visita no puede ser anterior a hoy",
    seIncumple: (solicitud, { hoy }) => crearFechaLocal(solicitud.fechaVisita) < hoy,
  },
  {
    campo: "fechaVisita",
    mensaje: "El parque está cerrado en la fecha seleccionada",
    seIncumple: (solicitud, { calendario }) => !calendario.estaAbierto(solicitud.fechaVisita),
  },
  {
    campo: "fechaVisita",
    mensaje: "Solo se pueden comprar entradas con hasta un mes de anticipación",
    seIncumple: (solicitud, { hoy }) => crearFechaLocal(solicitud.fechaVisita) > mismoDiaDelMesSiguiente(hoy),
  },
  {
    campo: "fechaVisita",
    mensaje: "Las entradas para hoy se pueden comprar hasta las 17:30",
    seIncumple: (solicitud, contexto) =>
      esHoy(solicitud, contexto) && minutosDelDia(contexto.ahora) > LIMITE_MISMO_DIA_EN_MINUTOS,
  },

  // 5. Máximo por usuario y por fecha. El error se informa en la cantidad.
  {
    campo: "cantidad",
    requiere: ["usuario", "fechaVisita"],
    mensaje: "No se pueden comprar más de 10 entradas para una misma fecha",
    seIncumple: (solicitud, { compras }) =>
      compras.cantidadComprada(solicitud.usuario, solicitud.fechaVisita) + solicitud.cantidad
        > MAXIMO_ENTRADAS_POR_FECHA,
  },

  // 6. Los menores necesitan una entrada de adulto para la misma fecha (R9).
  {
    campo: "edades",
    requiere: ["cantidad", "usuario", "fechaVisita"],
    mensaje: "Los menores de 16 años necesitan una entrada de adulto para la misma fecha",
    seIncumple: (solicitud, { compras }) =>
      contarAdultos(solicitud.edades) === 0
        && compras.adultosComprados(solicitud.usuario, solicitud.fechaVisita) === 0,
  },
];

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
 * @property {(usuario: string, fecha: string, cantidad: number, adultos: number) => void} registrar
 *   Guarda una compra con su cantidad de entradas y cuántas son de adultos (R9).
 * @property {(usuario: string, fecha: string) => number} cantidadComprada Entradas ya compradas para la fecha.
 * @property {(usuario: string, fecha: string) => number} adultosComprados Entradas de adulto ya compradas
 *   para la fecha (R9).
 *
 * @typedef {Object} ServicioMail
 * @property {(usuario: string, compra: Object) => void} enviarConfirmacion Envía el mail de confirmación
 *   con el detalle de la compra (el mismo resultado que devuelve comprar()).
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
   * y envía el mail de confirmación. Si es inválida, lanza el error de la primera regla
   * que no se cumple y no hace nada de eso.
   */
  comprar(solicitud) {
    const contexto = this.#contexto();
    const reglaIncumplida = REGLAS.find((regla) => regla.seIncumple(solicitud, contexto));
    if (reglaIncumplida) {
      throw new Error(reglaIncumplida.mensaje);
    }

    const entradas = this.#emitirEntradas(solicitud);
    const montoTotal = entradas.reduce((total, entrada) => total + entrada.precio, 0);

    this.compras.registrar(
      solicitud.usuario, solicitud.fechaVisita, solicitud.cantidad, contarAdultos(solicitud.edades));
    if (solicitud.formaPago === FORMA_PAGO.TARJETA) {
      this.mercadoPago.redirigir(montoTotal);
    }
    const resultado = {
      confirmada: true,
      cantidadEntradas: solicitud.cantidad,
      fechaVisita: solicitud.fechaVisita,
      tipoPase: solicitud.tipoPase,
      montoTotal,
      entradas,
    };
    this.mail.enviarConfirmacion(solicitud.usuario, resultado);
    return resultado;
  }

  /**
   * Aplica las mismas reglas que comprar(), pero en lugar de cortar en la primera devuelve
   * el primer error de cada campo, por ejemplo { fechaVisita: "...", cantidad: "..." }, o {}.
   * Una regla no se evalúa si su campo ya tiene un error o si depende de un campo inválido.
   * No tiene efectos secundarios: la interfaz la usa para validar mientras se completa el formulario.
   */
  validarCampos(solicitud) {
    const contexto = this.#contexto();
    const errores = {};
    for (const regla of REGLAS) {
      const sePuedeEvaluar = !errores[regla.campo]
        && (regla.requiere ?? []).every((campo) => !errores[campo]);
      if (sePuedeEvaluar && regla.seIncumple(solicitud, contexto)) {
        errores[regla.campo] = regla.mensaje;
      }
    }
    return errores;
  }

  // Lo que necesitan las reglas además de la solicitud. El reloj se consulta una sola vez.
  #contexto() {
    const ahora = this.reloj.ahora();
    return {
      ahora,
      hoy: inicioDelDia(ahora),
      usuarios: this.usuarios,
      calendario: this.calendario,
      compras: this.compras,
    };
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
