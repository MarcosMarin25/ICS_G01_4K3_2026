// Interfaz web de "Comprar entradas". Toda la lógica de negocio viene de src/logica:
// esta página solo arma la solicitud, llama a ServicioCompraEntradas y muestra el resultado.
(function () {
  "use strict";

  const RUTA_LOGICA = "../logica/";
  const MODULOS = ["valores", "fechas", "calculadoraPrecios", "calendarioParque", "servicioCompraEntradas"];

  // Usuarios registrados de la sesión simulada (el PO permite empezar con la sesión mockeada).
  const USUARIOS_REGISTRADOS = ["visitante@mail.com", "otro@mail.com"];

  // Límite de campos de edad que se dibujan, para no generar cientos si se escribe un número enorme.
  // El límite real de 10 entradas lo valida el servicio.
  const MAXIMO_CAMPOS_EDAD = 20;

  const formatoPesos = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

  const $ = (id) => document.getElementById(id);

  // Los módulos de src/logica están en CommonJS (require y module.exports) porque así los usan
  // Node y Jest. Este cargador lee cada uno y lo ejecuta con su propio `module` y `require`,
  // así la página usa exactamente el mismo código que se probó, sin duplicarlo ni empaquetarlo.
  async function cargarLogica() {
    const modulos = {};
    for (const nombre of MODULOS) {
      const respuesta = await fetch(`${RUTA_LOGICA}${nombre}.js`);
      if (!respuesta.ok) {
        throw new Error(`No se pudo cargar ${nombre}.js`);
      }
      const codigo = `${await respuesta.text()}\n//# sourceURL=${nombre}.js`;
      const modulo = { exports: {} };
      const requerir = (ruta) => modulos[ruta.replace("./", "")];
      new Function("module", "exports", "require", codigo)(modulo, modulo.exports, requerir);
      modulos[nombre] = modulo.exports;
    }
    return modulos;
  }

  // Dependencias reales del navegador para el servicio. Mercado Pago y el mail son simulados,
  // como pidió el PO: no hay integración real (ver decisiones_de_diseno.md).
  function crearDependencias(logica) {
    const CalendarioParque = logica.calendarioParque;
    const CalculadoraPrecios = logica.calculadoraPrecios;
    const compras = new Map();
    const efectos = { montoPagado: null, destinatarioMail: null };

    return {
      efectos,
      dependencias: {
        reloj: { ahora: () => new Date() },
        calendario: new CalendarioParque(),
        calculadora: new CalculadoraPrecios(),
        usuarios: { estaRegistrado: (usuario) => USUARIOS_REGISTRADOS.includes(usuario) },
        compras: {
          registrar(usuario, fecha, cantidad) {
            const clave = `${usuario}|${fecha}`;
            compras.set(clave, (compras.get(clave) ?? 0) + cantidad);
          },
          cantidadComprada: (usuario, fecha) => compras.get(`${usuario}|${fecha}`) ?? 0,
        },
        mail: {
          enviarConfirmacion(usuario) {
            efectos.destinatarioMail = usuario;
          },
        },
        mercadoPago: {
          redirigir(monto) {
            efectos.montoPagado = monto;
          },
        },
      },
    };
  }

  function aTextoDeFecha(fecha) {
    const DIGITOS = 2;
    const dosDigitos = (numero) => String(numero).padStart(DIGITOS, "0");
    return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
  }

  function aFechaLegible(texto) {
    const [anio, mes, dia] = texto.split("-");
    return `${dia}/${mes}/${anio}`;
  }

  function valorElegido(nombre) {
    const elegido = document.querySelector(`input[name="${nombre}"]:checked`);
    return elegido ? elegido.value : null;
  }

  function leerEdades() {
    // Un campo vacío no es "edad 0" (que es válida): se manda NaN para que el servicio lo rechace.
    return [...document.querySelectorAll("#edades input")]
      .map((campo) => (campo.value === "" ? NaN : Number(campo.value)));
  }

  function leerSolicitud() {
    return {
      usuario: $("usuario").value.trim(),
      fechaVisita: $("fecha").value || null,
      cantidad: Number($("cantidad").value),
      edades: leerEdades(),
      tipoPase: valorElegido("tipoPase"),
      formaPago: valorElegido("formaPago"),
    };
  }

  function dibujarCamposDeEdad() {
    const cantidad = Number($("cantidad").value);
    const anteriores = leerEdades();
    const contenedor = $("edades");
    contenedor.replaceChildren();

    const hayCampos = Number.isInteger(cantidad) && cantidad >= 1 && cantidad <= MAXIMO_CAMPOS_EDAD;
    $("campo-edades").hidden = !hayCampos;
    if (!hayCampos) {
      return;
    }
    for (let i = 0; i < cantidad; i++) {
      const id = `edad-${i + 1}`;
      const envoltorio = document.createElement("div");
      const etiqueta = document.createElement("label");
      etiqueta.htmlFor = id;
      etiqueta.textContent = `Visitante ${i + 1}`;
      const campo = document.createElement("input");
      campo.id = id;
      campo.type = "number";
      campo.min = "0";
      campo.step = "1";
      campo.inputMode = "numeric";
      if (!Number.isNaN(anteriores[i]) && anteriores[i] !== undefined) {
        campo.value = anteriores[i];
      }
      envoltorio.append(etiqueta, campo);
      contenedor.append(envoltorio);
    }
  }

  function dibujarDetalle(lista, entradas) {
    lista.replaceChildren(...entradas.map((entrada, i) => {
      const item = document.createElement("li");
      const nombre = document.createElement("span");
      nombre.textContent = `Visitante ${i + 1} (${entrada.edad} años)`;
      const precio = document.createElement("span");
      precio.textContent = formatoPesos.format(entrada.precio);
      item.append(nombre, precio);
      return item;
    }));
  }

  function iniciar(logica) {
    const { efectos, dependencias } = crearDependencias(logica);
    const ServicioCompraEntradas = logica.servicioCompraEntradas;
    const servicio = new ServicioCompraEntradas(dependencias);
    const { calendario, calculadora } = dependencias;

    // El selector de fecha sugiere el rango válido; igual, la validación la hace el servicio.
    const hoy = logica.fechas.inicioDelDia(new Date());
    $("fecha").min = aTextoDeFecha(hoy);
    $("fecha").max = aTextoDeFecha(logica.fechas.mismoDiaDelMesSiguiente(hoy));

    function actualizarResumen() {
      const { edades, tipoPase } = leerSolicitud();
      const edadesValidas = edades.filter((edad) => Number.isInteger(edad) && edad >= 0);
      const entradas = tipoPase
        ? edadesValidas.map((edad) => ({ edad, precio: calculadora.precioEntrada(edad, tipoPase) }))
        : [];
      dibujarDetalle($("detalle"), entradas);
      $("resumen-vacio").hidden = entradas.length > 0;
      const total = formatoPesos.format(entradas.reduce((suma, entrada) => suma + entrada.precio, 0));
      $("total").textContent = total;
      $("total-movil").textContent = total;
    }

    function avisarSiEstaCerrado() {
      const fecha = $("fecha").value;
      const cerrado = Boolean(fecha) && logica.fechas.esFechaExistente(fecha) && !calendario.estaAbierto(fecha);
      $("aviso-fecha").hidden = !cerrado;
      $("aviso-fecha").textContent = cerrado ? "El parque está cerrado ese día." : "";
    }

    function mostrarError(mensaje) {
      $("error").textContent = mensaje;
      $("error").hidden = false;
      $("error").scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function mostrarConfirmacion(resultado) {
      $("formulario").closest(".disposicion").hidden = true;
      $("confirmacion-texto").textContent =
        `Compraste ${resultado.cantidadEntradas} ${resultado.cantidadEntradas === 1 ? "entrada" : "entradas"} `
        + `${resultado.tipoPase === "VIP" ? "VIP" : "regulares"} para el ${aFechaLegible(resultado.fechaVisita)}.`;
      dibujarDetalle($("confirmacion-detalle"), resultado.entradas);
      $("confirmacion-total").textContent = formatoPesos.format(resultado.montoTotal);
      $("confirmacion-pago").textContent = efectos.montoPagado === null
        ? "Pagás en efectivo en la boletería del parque."
        : "Pagado con tarjeta a través de Mercado Pago.";
      $("confirmacion").hidden = false;
      $("confirmacion").scrollIntoView({ behavior: "smooth" });

      if (efectos.destinatarioMail) {
        $("modal-mail-destinatario").textContent = efectos.destinatarioMail;
        $("modal-mail").showModal();
      }
    }

    $("formulario").addEventListener("submit", (evento) => {
      evento.preventDefault();
      $("error").hidden = true;
      efectos.montoPagado = null;
      efectos.destinatarioMail = null;

      let resultado;
      try {
        resultado = servicio.comprar(leerSolicitud());
      } catch (error) {
        mostrarError(error.message);
        return;
      }

      if (efectos.montoPagado === null) {
        mostrarConfirmacion(resultado);
        return;
      }
      $("pantalla-pago-monto").textContent = formatoPesos.format(efectos.montoPagado);
      $("pantalla-pago").hidden = false;
      $("volver-del-pago").focus();
      $("volver-del-pago").onclick = () => {
        $("pantalla-pago").hidden = true;
        mostrarConfirmacion(resultado);
      };
    });

    $("nueva-compra").addEventListener("click", () => {
      $("confirmacion").hidden = true;
      $("formulario").closest(".disposicion").hidden = false;
      $("formulario").reset();
      $("usuario-sesion").textContent = $("usuario").value;
      dibujarCamposDeEdad();
      actualizarResumen();
      avisarSiEstaCerrado();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    $("usuario").addEventListener("input", () => {
      $("usuario-sesion").textContent = $("usuario").value.trim() || "(sin usuario)";
    });
    $("cantidad").addEventListener("input", () => {
      dibujarCamposDeEdad();
      actualizarResumen();
    });
    // Botones − y +: solo ayudan a cargar la cantidad; el máximo de 10 lo valida el servicio.
    document.querySelectorAll(".contador__boton").forEach((boton) => {
      boton.addEventListener("click", () => {
        const actual = Number($("cantidad").value) || 0;
        const nueva = Math.max(1, actual + Number(boton.dataset.paso));
        $("cantidad").value = nueva;
        $("cantidad").dispatchEvent(new Event("input"));
      });
    });
    $("edades").addEventListener("input", actualizarResumen);
    document.querySelectorAll("input[name='tipoPase']")
      .forEach((opcion) => opcion.addEventListener("change", actualizarResumen));
    $("fecha").addEventListener("change", avisarSiEstaCerrado);
  }

  cargarLogica()
    .then(iniciar)
    .catch(() => {
      $("aviso-servidor").hidden = false;
      document.querySelectorAll("button[type='submit']").forEach((boton) => {
        boton.disabled = true;
      });
    });
})();
