// Interfaz web de "Comprar entradas". Toda la lógica de negocio viene de src/logica:
// esta página solo arma la solicitud, llama a ServicioCompraEntradas y muestra el resultado.
(function () {
  "use strict";

  const RUTA_LOGICA = "../logica/";
  const MODULOS = ["valores", "fechas", "calculadoraPrecios", "calendarioParque", "servicioCompraEntradas"];

  // Usuarios registrados de la sesión simulada (FAQ 19). "invitado@mail.com" no está registrado,
  // para poder mostrar el error del servicio (CA 9).
  const USUARIOS_REGISTRADOS = ["visitante@mail.com", "otro@mail.com"];

  // Hasta qué edad se le pregunta a la calculadora para armar las categorías de precio.
  const EDAD_MAXIMA_SONDEADA = 120;
  const PORCENTAJE_TOTAL = 100;
  const DIAS_POR_SEMANA = 7;
  const DIGITOS_FECHA = 2;

  // Nombres de las categorías de precio. Los rangos de edad NO están acá: salen de la calculadora.
  const NOMBRES_CATEGORIA = {
    adultos: { titulo: "Adultos", singular: "adulto" },
    menores: { titulo: "Menores", singular: "menor" },
    mayores: { titulo: "Mayores", singular: "mayor" },
    bebes: { titulo: "Bebés", singular: "bebé" },
  };
  const ORDEN_CATEGORIAS = ["adultos", "menores", "mayores", "bebes"];

  const NOMBRES_PASE = { VIP: "VIP", REGULAR: "Regular" };
  const NOMBRES_PAGO = {
    TARJETA: { nombre: "Tarjeta", detalle: "Con Mercado Pago" },
    EFECTIVO: { nombre: "Efectivo", detalle: "En la boletería" },
  };

  const formatoPesos = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
  const formatoMes = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
  const formatoDiaLargo = new Intl.DateTimeFormat("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const formatoDiaSemana = new Intl.DateTimeFormat("es-AR", { weekday: "short" });
  const formatoMesCorto = new Intl.DateTimeFormat("es-AR", { month: "short" });

  const $ = (id) => document.getElementById(id);
  const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

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
  // como pide el PO (FAQ 4 y 5): no hay integración real (ver decisiones_de_diseno.md).
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
    const dosDigitos = (numero) => String(numero).padStart(DIGITOS_FECHA, "0");
    return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
  }

  // "Mar, 20 oct"
  function aFechaCorta(fecha) {
    const dia = formatoDiaSemana.format(fecha).replace(".", "");
    const mes = formatoMesCorto.format(fecha).replace(".", "");
    return `${mayuscula(dia)}, ${fecha.getDate()} ${mes}`;
  }

  /**
   * Arma las categorías de precio preguntándole a la calculadora el precio de cada edad:
   * cada vez que el precio cambia empieza una categoría nueva. Así la interfaz no repite
   * los rangos de R3 (3, 15, 60 años): si el PO los cambia, los contadores se actualizan solos.
   */
  function categoriasDePrecio(calculadora, tipoPase) {
    const tramos = [];
    for (let edad = 0; edad <= EDAD_MAXIMA_SONDEADA; edad++) {
      const precio = calculadora.precioEntrada(edad, tipoPase);
      const ultimo = tramos.at(-1);
      if (ultimo && ultimo.precio === precio) {
        ultimo.hasta = edad;
      } else {
        tramos.push({ desde: edad, hasta: edad, precio });
      }
    }
    tramos.at(-1).hasta = null; // el último tramo no tiene edad máxima

    const precioCompleto = Math.max(...tramos.map((tramo) => tramo.precio));
    const indiceCompleto = tramos.findIndex((tramo) => tramo.precio === precioCompleto);
    const nombrar = (tramo, indice) => {
      if (tramo.precio === 0) {
        return "bebes";
      }
      if (tramo.precio === precioCompleto) {
        return "adultos";
      }
      return indice < indiceCompleto ? "menores" : "mayores";
    };

    const categorias = {};
    tramos.forEach((tramo, indice) => {
      const clave = nombrar(tramo, indice);
      const rango = tramo.hasta === null ? `${tramo.desde} años o más` : `${tramo.desde} a ${tramo.hasta} años`;
      const descuento = PORCENTAJE_TOTAL - Math.round((tramo.precio / precioCompleto) * PORCENTAJE_TOTAL);
      let detalle = "";
      if (tramo.precio === 0) {
        detalle = " · sin cargo";
      } else if (descuento > 0) {
        detalle = ` · ${descuento}% off`;
      }
      categorias[clave] = { clave, ...NOMBRES_CATEGORIA[clave], desde: tramo.desde, hasta: tramo.hasta,
        subtitulo: `${rango}${detalle}` };
    });
    return ORDEN_CATEGORIAS.map((clave) => categorias[clave]).filter(Boolean);
  }

  function iniciar(logica) {
    const { efectos, dependencias } = crearDependencias(logica);
    const ServicioCompraEntradas = logica.servicioCompraEntradas;
    const servicio = new ServicioCompraEntradas(dependencias);
    const { calculadora } = dependencias;
    const { TIPO_PASE, FORMA_PAGO } = logica.valores;
    const categorias = categoriasDePrecio(calculadora, TIPO_PASE.REGULAR);

    const estado = {
      tipoPase: null,
      formaPago: null,
      conteos: Object.fromEntries(categorias.map((categoria) => [categoria.clave, 0])),
    };
    // Validación en el momento: un campo muestra su error cuando el usuario terminó con él
    // (lo "tocó"), o cuando intentó comprar. Desde ahí se revalida con cada cambio.
    const tocados = new Set();
    let intentoComprar = false;

    // ---------- Pasos ----------
    function mostrarPaso(id) {
      for (const paso of ["paso-fecha", "formulario", "confirmacion"]) {
        $(paso).hidden = paso !== id;
      }
      window.scrollTo({ top: 0 });
      $(id).querySelector("[tabindex='-1']")?.focus({ preventScroll: true });
    }

    // ---------- Edades y solicitud ----------
    function camposDeEdad() {
      return [...document.querySelectorAll(".edad input")];
    }

    // Una edad fuera del rango de su categoría (por ejemplo, 30 en Menores) se manda como inválida:
    // la categoría es solo una forma de cargar los datos, y la edad tiene que corresponderle.
    function edadDelCampo(campo) {
      if (campo.value === "") {
        return NaN;
      }
      const edad = Number(campo.value);
      const desde = Number(campo.dataset.desde);
      const hasta = campo.dataset.hasta === "" ? Infinity : Number(campo.dataset.hasta);
      return edad >= desde && edad <= hasta ? edad : NaN;
    }

    function cantidadTotal() {
      return Object.values(estado.conteos).reduce((suma, n) => suma + n, 0);
    }

    function leerSolicitud() {
      return {
        usuario: $("usuario").value,
        fechaVisita: $("fecha").value || null,
        cantidad: cantidadTotal(),
        edades: camposDeEdad().map(edadDelCampo),
        tipoPase: estado.tipoPase,
        formaPago: estado.formaPago,
      };
    }

    // ---------- Validación en el momento ----------
    const CAMPOS = {
      usuario: { error: "error-usuario", marcar: () => [$("usuario")] },
      fechaVisita: { error: "error-fechaVisita", marcar: () => [$("calendario")] },
      tipoPase: { error: "error-tipoPase", marcar: () => [$("chip-tipoPase")] },
      formaPago: { error: "error-formaPago", marcar: () => [$("chip-formaPago")] },
      cantidad: { error: "error-cantidad", marcar: () => [] },
      edades: { error: "error-edades", marcar: () => [] },
    };

    function debeMostrarse(campo) {
      if (intentoComprar) {
        return true;
      }
      // Las edades no se marcan mientras queden campos de edad sin completar.
      const hayVacias = camposDeEdad().some((c) => c.value === "");
      return tocados.has(campo) && !(campo === "edades" && hayVacias);
    }

    // Los mensajes salen de servicio.validarCampos(): las mismas reglas que comprar(), probadas con Jest.
    function validarEnElMomento() {
      const errores = servicio.validarCampos(leerSolicitud());
      for (const [campo, { error, marcar }] of Object.entries(CAMPOS)) {
        const mensaje = debeMostrarse(campo) ? errores[campo] : undefined;
        $(error).textContent = mensaje ?? "";
        $(error).hidden = !mensaje;
        for (const elemento of marcar()) {
          elemento.setAttribute("aria-invalid", mensaje ? "true" : "false");
        }
      }
      // Continuar solo con una fecha elegida y sin errores de usuario ni de fecha.
      $("continuar").disabled = !$("fecha").value || Boolean(errores.usuario || errores.fechaVisita);
      return errores;
    }

    function tocar(campo) {
      tocados.add(campo);
      validarEnElMomento();
    }

    // ---------- Calendario (FAQ 2) ----------
    // Un día se puede elegir solo si las reglas de fecha de la lógica no lo rechazan. Se le pregunta
    // a validarCampos() con la solicitud actual cambiando solo la fecha: las reglas de fecha no
    // dependen de otros campos. Así se deshabilitan los lunes, el 25/12, el 1/1, los días pasados,
    // los de más de un mes y hoy después de las 17:30, sin repetir ninguna regla en la interfaz.
    const hoy = logica.fechas.inicioDelDia(dependencias.reloj.ahora());
    const primerMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const limite = logica.fechas.mismoDiaDelMesSiguiente(hoy);
    const ultimoMes = new Date(limite.getFullYear(), limite.getMonth(), 1);
    let mesVisible = primerMes;

    function motivoNoDisponible(texto) {
      return servicio.validarCampos({ ...leerSolicitud(), fechaVisita: texto }).fechaVisita;
    }

    function dibujarCalendario(fechaConFoco) {
      const anio = mesVisible.getFullYear();
      const mes = mesVisible.getMonth();
      const elegida = $("fecha").value;
      $("calendario-mes").textContent = mayuscula(formatoMes.format(mesVisible));
      document.querySelector("[data-mes='-1']").disabled = mesVisible <= primerMes;
      document.querySelector("[data-mes='1']").disabled = mesVisible >= ultimoMes;

      const celdas = [];
      // La semana empieza el lunes: getDay() da 0 para el domingo.
      const huecos = (new Date(anio, mes, 1).getDay() + DIAS_POR_SEMANA - 1) % DIAS_POR_SEMANA;
      for (let i = 0; i < huecos; i++) {
        celdas.push(document.createElement("span"));
      }
      const diasDelMes = new Date(anio, mes + 1, 0).getDate();
      for (let dia = 1; dia <= diasDelMes; dia++) {
        const fecha = new Date(anio, mes, dia);
        const texto = aTextoDeFecha(fecha);
        const motivo = motivoNoDisponible(texto);
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "calendario__dia";
        boton.textContent = dia;
        boton.dataset.fecha = texto;
        boton.tabIndex = -1;
        boton.setAttribute("aria-pressed", String(texto === elegida));
        boton.setAttribute("aria-label", motivo
          ? `${formatoDiaLargo.format(fecha)}, no disponible: ${motivo}`
          : formatoDiaLargo.format(fecha));
        if (motivo) {
          boton.setAttribute("aria-disabled", "true");
          boton.title = motivo;
        }
        boton.classList.toggle("es-hoy", fecha.getTime() === hoy.getTime());
        celdas.push(boton);
      }
      $("calendario-dias").replaceChildren(...celdas);

      // Un solo día entra en el orden de tabulación; las flechas mueven el foco entre los días.
      const dias = [...$("calendario-dias").querySelectorAll("button")];
      const conFoco = dias.find((d) => d.dataset.fecha === fechaConFoco)
        ?? dias.find((d) => d.dataset.fecha === elegida)
        ?? dias.find((d) => !d.hasAttribute("aria-disabled"))
        ?? dias[0];
      conFoco.tabIndex = 0;
      if (fechaConFoco) {
        conFoco.focus();
      }
    }

    function elegirFecha(boton) {
      if (boton.getAttribute("aria-disabled") === "true") {
        $("fecha-elegida").textContent = `Ese día no está disponible: ${boton.title}.`;
        return;
      }
      const fecha = logica.fechas.crearFechaLocal(boton.dataset.fecha);
      $("fecha").value = boton.dataset.fecha;
      $("fecha-elegida").textContent = `Elegiste el ${formatoDiaLargo.format(fecha)}.`;
      $("resumen-fecha").textContent = aFechaCorta(fecha);
      dibujarCalendario(boton.dataset.fecha);
      tocar("fechaVisita");
    }

    $("calendario-dias").addEventListener("click", (evento) => {
      const boton = evento.target.closest(".calendario__dia");
      if (boton) {
        elegirFecha(boton);
      }
    });

    const MOVIMIENTOS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -DIAS_POR_SEMANA, ArrowDown: DIAS_POR_SEMANA };
    $("calendario-dias").addEventListener("keydown", (evento) => {
      const salto = MOVIMIENTOS[evento.key];
      const boton = evento.target.closest(".calendario__dia");
      if (!salto || !boton) {
        return;
      }
      evento.preventDefault();
      const destino = logica.fechas.crearFechaLocal(boton.dataset.fecha);
      destino.setDate(destino.getDate() + salto);
      const mesDestino = new Date(destino.getFullYear(), destino.getMonth(), 1);
      if (mesDestino < primerMes || mesDestino > ultimoMes) {
        return;
      }
      mesVisible = mesDestino;
      dibujarCalendario(aTextoDeFecha(destino));
    });

    document.querySelectorAll("[data-mes]").forEach((boton) => {
      boton.addEventListener("click", () => {
        mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + Number(boton.dataset.mes), 1);
        dibujarCalendario();
      });
    });

    $("usuario").addEventListener("change", () => {
      tocar("usuario");
      dibujarCalendario();
    });
    $("continuar").addEventListener("click", () => {
      actualizarContadores();
      mostrarPaso("formulario");
    });
    $("cambiar-fecha").addEventListener("click", () => mostrarPaso("paso-fecha"));

    // ---------- Chips y hoja de selección ----------
    function opcionesDe(selector) {
      if (selector === "tipoPase") {
        const adulto = categorias.find((c) => c.clave === "adultos") ?? categorias[0];
        return Object.values(TIPO_PASE).map((valor) => ({
          valor,
          nombre: NOMBRES_PASE[valor],
          detalle: "Precio por entrada de adulto",
          precio: formatoPesos.format(calculadora.precioEntrada(adulto.desde, valor)),
        }));
      }
      return Object.values(FORMA_PAGO).map((valor) => ({ valor, ...NOMBRES_PAGO[valor] }));
    }

    function actualizarChips() {
      const textos = {
        tipoPase: estado.tipoPase ? NOMBRES_PASE[estado.tipoPase] : "Tipo de pase",
        formaPago: estado.formaPago ? NOMBRES_PAGO[estado.formaPago].nombre : "Forma de pago",
      };
      for (const selector of ["tipoPase", "formaPago"]) {
        const chip = $(`chip-${selector}`);
        chip.querySelector(".chip__texto").textContent = textos[selector];
        chip.classList.toggle("es-activo", Boolean(estado[selector]));
        chip.setAttribute("aria-label", estado[selector]
          ? `${selector === "tipoPase" ? "Tipo de pase" : "Forma de pago"}: ${textos[selector]}. Cambiar`
          : `Elegir ${selector === "tipoPase" ? "el tipo de pase" : "la forma de pago"}`);
      }
    }

    function abrirHoja(selector) {
      $("hoja-titulo").textContent = selector === "tipoPase" ? "Elegí el tipo de pase" : "Elegí la forma de pago";
      const botones = opcionesDe(selector).map((opcion) => {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "opcion";
        boton.setAttribute("aria-pressed", String(estado[selector] === opcion.valor));
        const textos = document.createElement("span");
        const nombre = document.createElement("span");
        nombre.className = "opcion__nombre";
        nombre.textContent = opcion.nombre;
        const detalle = document.createElement("span");
        detalle.className = "opcion__detalle";
        detalle.textContent = opcion.detalle;
        textos.append(nombre, detalle);
        boton.append(textos);
        if (opcion.precio) {
          const precio = document.createElement("span");
          precio.className = "opcion__precio";
          precio.textContent = opcion.precio;
          boton.append(precio);
        }
        boton.addEventListener("click", () => {
          estado[selector] = opcion.valor;
          $("hoja").close();
          actualizarChips();
          actualizarTotal();
          tocar(selector);
          $(`chip-${selector}`).focus();
        });
        return boton;
      });
      $("hoja-opciones").replaceChildren(...botones);
      $("hoja").showModal();
      ($("hoja-opciones").querySelector("[aria-pressed='true']") ?? botones[0]).focus();
    }

    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => abrirHoja(chip.dataset.selector));
    });

    // ---------- Filas de categorías con contador ----------
    function crearFilas() {
      const filas = categorias.map((categoria) => {
        const contenedor = document.createElement("div");
        contenedor.className = "categoria";
        contenedor.dataset.categoria = categoria.clave;
        contenedor.innerHTML = `
          <div class="fila">
            <div>
              <p class="fila__titulo">${categoria.titulo}</p>
              <p class="fila__subtitulo">${categoria.subtitulo}</p>
            </div>
            <div class="contador">
              <button type="button" class="contador__boton" data-paso="-1"
                aria-label="Restar ${categoria.singular}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>
              </button>
              <span class="contador__numero" aria-live="polite">0</span>
              <button type="button" class="contador__boton" data-paso="1"
                aria-label="Sumar ${categoria.singular}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            </div>
          </div>
          <div class="edades" hidden></div>`;
        return contenedor;
      });
      $("categorias").replaceChildren(...filas);
    }

    // Agrega o quita campos de edad para que haya uno por visitante, sin perder lo ya escrito.
    function ajustarEdades(categoria) {
      const contenedor = document.querySelector(`[data-categoria="${categoria.clave}"] .edades`);
      const cantidad = estado.conteos[categoria.clave];
      while (contenedor.children.length > cantidad) {
        contenedor.lastElementChild.remove();
      }
      while (contenedor.children.length < cantidad) {
        const campo = document.createElement("div");
        campo.className = "edad";
        const entrada = document.createElement("input");
        entrada.type = "number";
        entrada.inputMode = "numeric";
        entrada.step = "1";
        entrada.min = String(categoria.desde);
        entrada.dataset.desde = String(categoria.desde);
        entrada.dataset.hasta = categoria.hasta === null ? "" : String(categoria.hasta);
        if (categoria.hasta !== null) {
          entrada.max = String(categoria.hasta);
        }
        entrada.placeholder = categoria.hasta === null ? `${categoria.desde} o más` : `${categoria.desde}–${categoria.hasta}`;
        const etiqueta = document.createElement("label");
        const ayuda = document.createElement("p");
        ayuda.className = "edad__ayuda";
        ayuda.hidden = true;
        ayuda.textContent = categoria.hasta === null
          ? `Para ${categoria.titulo.toLowerCase()}, desde ${categoria.desde} años`
          : `Para ${categoria.titulo.toLowerCase()}, de ${categoria.desde} a ${categoria.hasta} años`;
        campo.append(etiqueta, entrada, ayuda);
        contenedor.append(campo);
      }
      contenedor.hidden = cantidad === 0;
    }

    // Numera los campos ("Edad visitante 1", "Edad visitante 2", ...) en el orden de la pantalla.
    function numerarEdades() {
      camposDeEdad().forEach((entrada, indice) => {
        entrada.id = `edad-${indice + 1}`;
        const etiqueta = entrada.previousElementSibling;
        etiqueta.htmlFor = entrada.id;
        etiqueta.textContent = `Edad visitante ${indice + 1}`;
      });
    }

    // Puede sumarse una entrada más si las reglas del servicio no dan error en la cantidad:
    // así el tope de 10 por fecha (y las compras anteriores del usuario) salen de la lógica.
    function sePuedeSumar() {
      const cantidad = cantidadTotal() + 1;
      const prueba = { ...leerSolicitud(), cantidad, edades: Array(cantidad).fill(0) };
      return !servicio.validarCampos(prueba).cantidad;
    }

    function actualizarContadores() {
      const sumar = sePuedeSumar();
      for (const categoria of categorias) {
        const fila = document.querySelector(`[data-categoria="${categoria.clave}"]`);
        fila.querySelector(".contador__numero").textContent = estado.conteos[categoria.clave];
        fila.querySelector("[data-paso='-1']").disabled = estado.conteos[categoria.clave] === 0;
        fila.querySelector("[data-paso='1']").disabled = !sumar;
      }
      $("confirmar").disabled = cantidadTotal() === 0;
    }

    // "3 entradas · $40.000", con los precios de CalculadoraPrecios.
    function actualizarTotal() {
      const cantidad = cantidadTotal();
      $("total-cantidad").textContent = `${cantidad} ${cantidad === 1 ? "entrada" : "entradas"}`;
      if (!estado.tipoPase) {
        $("total-monto").textContent = cantidad > 0 ? "Elegí el pase" : "";
        return;
      }
      const monto = categorias.reduce((suma, categoria) =>
        suma + estado.conteos[categoria.clave] * calculadora.precioEntrada(categoria.desde, estado.tipoPase), 0);
      $("total-monto").textContent = formatoPesos.format(monto);
    }

    function marcarFilaActiva(clave) {
      document.querySelectorAll(".categoria").forEach((fila) => {
        fila.classList.toggle("es-activa", fila.dataset.categoria === clave);
      });
    }

    $("categorias").addEventListener("click", (evento) => {
      const boton = evento.target.closest(".contador__boton");
      if (!boton || boton.disabled) {
        return;
      }
      const clave = boton.closest(".categoria").dataset.categoria;
      const categoria = categorias.find((c) => c.clave === clave);
      estado.conteos[clave] = Math.max(0, estado.conteos[clave] + Number(boton.dataset.paso));
      ajustarEdades(categoria);
      numerarEdades();
      marcarFilaActiva(clave);
      actualizarContadores();
      actualizarTotal();
      tocar("cantidad");
      // Si el botón quedó deshabilitado (tope o cero), el foco no se pierde.
      if (boton.disabled) {
        boton.closest(".contador").querySelector("button:not(:disabled)")?.focus();
      }
    });

    $("categorias").addEventListener("input", (evento) => {
      const campo = evento.target.closest(".edad input");
      if (campo) {
        const fueraDeRango = campo.value !== "" && Number.isNaN(edadDelCampo(campo));
        campo.setAttribute("aria-invalid", String(fueraDeRango));
        campo.nextElementSibling.hidden = !fueraDeRango;
        marcarFilaActiva(campo.closest(".categoria").dataset.categoria);
        validarEnElMomento();
      }
    });
    $("categorias").addEventListener("focusout", (evento) => {
      if (evento.target.closest(".edad input")) {
        tocar("edades");
      }
    });

    // ---------- Compra ----------
    function mostrarConfirmacion(resultado) {
      const fecha = logica.fechas.crearFechaLocal(resultado.fechaVisita);
      const cantidad = resultado.cantidadEntradas;
      $("confirmacion-texto").textContent =
        `Compraste ${cantidad} ${cantidad === 1 ? "entrada" : "entradas"} ${NOMBRES_PASE[resultado.tipoPase]} `
        + `para el ${formatoDiaLargo.format(fecha)}.`;
      $("confirmacion-detalle").replaceChildren(...resultado.entradas.map((entrada, i) => {
        const item = document.createElement("li");
        const nombre = document.createElement("span");
        nombre.textContent = `Visitante ${i + 1} · ${entrada.edad} años`;
        const precio = document.createElement("span");
        precio.textContent = formatoPesos.format(entrada.precio);
        item.append(nombre, precio);
        return item;
      }));
      $("confirmacion-total").textContent = formatoPesos.format(resultado.montoTotal);
      $("confirmacion-pago").textContent = efectos.montoPagado === null
        ? "Pagás en efectivo en la boletería del parque."
        : "Pagado con tarjeta a través de Mercado Pago.";
      mostrarPaso("confirmacion");

      if (efectos.destinatarioMail) {
        $("modal-mail-destinatario").textContent = efectos.destinatarioMail;
        $("modal-mail").showModal();
      }
    }

    $("formulario").addEventListener("submit", (evento) => {
      evento.preventDefault();
      intentoComprar = true;
      validarEnElMomento();
      $("error").hidden = true;
      efectos.montoPagado = null;
      efectos.destinatarioMail = null;

      // comprar() es la autoridad final: el banner muestra su mensaje exacto.
      let resultado;
      try {
        resultado = servicio.comprar(leerSolicitud());
      } catch (error) {
        $("error").textContent = error.message;
        $("error").hidden = false;
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
      estado.tipoPase = null;
      estado.formaPago = null;
      for (const clave of Object.keys(estado.conteos)) {
        estado.conteos[clave] = 0;
      }
      tocados.clear();
      intentoComprar = false;
      $("error").hidden = true;
      $("fecha").value = "";
      $("fecha-elegida").textContent = "Cerrado los lunes, el 25/12 y el 1/1.";
      mesVisible = primerMes;
      crearFilas();
      actualizarChips();
      actualizarContadores();
      actualizarTotal();
      dibujarCalendario();
      validarEnElMomento();
      mostrarPaso("paso-fecha");
    });

    crearFilas();
    actualizarChips();
    actualizarContadores();
    actualizarTotal();
    dibujarCalendario();
    validarEnElMomento();
  }

  cargarLogica()
    .then(iniciar)
    .catch(() => {
      $("aviso-servidor").hidden = false;
      document.querySelectorAll("#continuar, #confirmar").forEach((boton) => {
        boton.disabled = true;
      });
    });
})();
