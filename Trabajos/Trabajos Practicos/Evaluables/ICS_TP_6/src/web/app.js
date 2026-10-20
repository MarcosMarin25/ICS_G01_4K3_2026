// Interfaz web de "Comprar entradas". Toda la lógica de negocio viene de src/logica:
// esta página solo arma la solicitud, llama a ServicioCompraEntradas y muestra el resultado.
(function () {
  "use strict";

  const RUTA_LOGICA = "../logica/";
  const MODULOS = ["valores", "fechas", "calculadoraPrecios", "calendarioParque", "servicioCompraEntradas"];

  // Usuarios registrados de la sesión simulada (el PO permite empezar con la sesión mockeada).
  // Se cargan de la base de datos al iniciar (GET /api/usuarios).
  const USUARIOS_REGISTRADOS = [];

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

  // Dependencias del servicio en el navegador, que valida en el momento. La compra la concreta el
  // servidor (POST /api/compras): la guarda en la base y envía el mail real. Mercado Pago sigue
  // simulado, como pidió el PO (ver decisiones_de_diseno.md).
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
          registrar(usuario, fecha, cantidad, adultos = 0) {
            const clave = `${usuario}|${fecha}`;
            const anterior = compras.get(clave) ?? { cantidad: 0, adultos: 0 };
            compras.set(clave, { cantidad: anterior.cantidad + cantidad, adultos: anterior.adultos + adultos });
          },
          cantidadComprada: (usuario, fecha) => compras.get(`${usuario}|${fecha}`)?.cantidad ?? 0,
          adultosComprados: (usuario, fecha) => compras.get(`${usuario}|${fecha}`)?.adultos ?? 0,
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

  // Filas de categorías de edad del paso 3 (Adultos, Menores, Bebés, Mayores).
  const categorias = () => [...document.querySelectorAll(".categoria")];
  const cantidadDe = (categoria) => Number(categoria.querySelector(".contador__valor").value);

  function nombreDeCategoria(edad) {
    return categorias().find((categoria) => Number(categoria.dataset.edad) === edad)?.dataset.nombre ?? `${edad} años`;
  }

  // Cada entrada lleva la edad representativa de su categoría: el precio solo depende del rango de edad.
  function leerEdades() {
    return categorias().flatMap((categoria) =>
      Array(cantidadDe(categoria)).fill(Number(categoria.dataset.edad)));
  }

  function leerSolicitud() {
    const edades = leerEdades();
    return {
      usuario: $("usuario").value.trim(),
      fechaVisita: $("fecha").value || null,
      cantidad: edades.length,
      edades,
      tipoPase: valorElegido("tipoPase"),
      formaPago: valorElegido("formaPago"),
    };
  }

  // Agrupa las entradas por categoría: "Adultos × 2   $20.000".
  function dibujarDetalle(lista, entradas) {
    const grupos = new Map();
    for (const { edad, precio } of entradas) {
      const grupo = grupos.get(edad) ?? { cantidad: 0, subtotal: 0 };
      grupo.cantidad += 1;
      grupo.subtotal += precio;
      grupos.set(edad, grupo);
    }
    lista.replaceChildren(...[...grupos].map(([edad, { cantidad, subtotal }]) => {
      const item = document.createElement("li");
      const nombre = document.createElement("span");
      nombre.textContent = `${nombreDeCategoria(edad)} × ${cantidad}`;
      const precio = document.createElement("span");
      precio.textContent = formatoPesos.format(subtotal);
      item.append(nombre, precio);
      return item;
    }));
  }

  // Para cada campo de la solicitud: el elemento que muestra su error y los que se marcan como inválidos.
  // tocadoCon: el campo que, al tocarse, muestra también este error (las edades salen de los contadores).
  const CAMPOS = {
    usuario: { error: "error-usuario", marcar: () => [$("usuario")] },
    fechaVisita: { error: "error-fechaVisita", marcar: () => [$("calendario")] },
    cantidad: { error: "error-cantidad", marcar: () => [$("campo-cantidad")] },
    edades: { error: "error-edades", marcar: () => [$("campo-cantidad")], tocadoCon: "cantidad" },
    tipoPase: { error: "error-tipoPase", marcar: () => [$("campo-tipoPase")] },
    formaPago: { error: "error-formaPago", marcar: () => [$("campo-formaPago")] },
  };

  function iniciar(logica) {
    const { efectos, dependencias } = crearDependencias(logica);
    const ServicioCompraEntradas = logica.servicioCompraEntradas;
    const servicio = new ServicioCompraEntradas(dependencias);
    const { calculadora } = dependencias;

    // Validación en el momento: un campo muestra su error recién cuando el usuario terminó con él
    // (lo "tocó"), o cuando intentó comprar. Desde ahí se revalida con cada cambio.
    const tocados = new Set();
    let intentoComprar = false;

    // ---------- Calendario (FAQ 2) ----------
    // Un día se puede elegir solo si las reglas de fecha de la lógica no lo rechazan. Se le pregunta
    // a validarCampos() con la solicitud actual cambiando solo la fecha: las reglas de fecha no
    // dependen de otros campos. Así se deshabilitan los lunes, el 25/12, el 1/1, los días pasados,
    // los de más de un mes y hoy después de las 17:30, sin repetir ninguna regla en la interfaz.
    const formatoMes = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
    const formatoDia = new Intl.DateTimeFormat("es-AR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const DIAS_POR_SEMANA = 7;
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
      const nombreMes = formatoMes.format(mesVisible);
      $("calendario-mes").textContent = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
      document.querySelector(".calendario__nav[data-mes='-1']").disabled = mesVisible <= primerMes;
      document.querySelector(".calendario__nav[data-mes='1']").disabled = mesVisible >= ultimoMes;

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
          ? `${formatoDia.format(fecha)}, no disponible: ${motivo}`
          : formatoDia.format(fecha));
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
      $("fecha").value = boton.dataset.fecha;
      $("fecha-elegida").textContent = `Elegiste el ${formatoDia.format(logica.fechas.crearFechaLocal(boton.dataset.fecha))}.`;
      dibujarCalendario(boton.dataset.fecha);
      $("fecha").dispatchEvent(new Event("change", { bubbles: true }));
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

    document.querySelectorAll(".calendario__nav").forEach((boton) => {
      boton.addEventListener("click", () => {
        mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + Number(boton.dataset.mes), 1);
        dibujarCalendario();
      });
    });

    dibujarCalendario();

    function debeMostrarse(campo) {
      return intentoComprar || tocados.has(CAMPOS[campo].tocadoCon ?? campo);
    }

    // Los mensajes salen de servicio.validarCampos(): las mismas reglas que comprar(), probadas con Jest.
    function validarEnElMomento() {
      const errores = servicio.validarCampos(leerSolicitud());
      // Un elemento puede mostrar los errores de varios campos (cantidad y edades): es inválido si alguno falla.
      const marcados = new Map();
      for (const [campo, { error, marcar }] of Object.entries(CAMPOS)) {
        const visible = debeMostrarse(campo);
        const mensaje = visible ? errores[campo] : undefined;
        $(error).textContent = mensaje ?? "";
        $(error).hidden = !mensaje;
        for (const elemento of marcar()) {
          const anterior = marcados.get(elemento) ?? { visible: false, invalido: false };
          marcados.set(elemento, {
            visible: anterior.visible || visible,
            invalido: anterior.invalido || Boolean(mensaje),
          });
        }
      }
      for (const [elemento, { visible, invalido }] of marcados) {
        elemento.setAttribute("aria-invalid", invalido ? "true" : "false");
        elemento.classList.toggle("es-valido", visible && !invalido && elemento.tagName === "INPUT");
      }
      return errores;
    }

    function tocar(campo) {
      tocados.add(campo);
      validarEnElMomento();
    }

    // Precio por entrada de cada categoría: el descuento antes de elegir el pase, el monto después.
    function actualizarPreciosDeCategorias(tipoPase) {
      const MAX_ENTRADAS = 10;
      const totalEntradas = categorias().reduce((suma, cat) => suma + cantidadDe(cat), 0);
      for (const categoria of categorias()) {
        categoria.classList.toggle("con-entradas", cantidadDe(categoria) > 0);
        categoria.querySelector(".contador__boton[data-paso='-1']").disabled = cantidadDe(categoria) === 0;
        categoria.querySelector(".contador__boton[data-paso='1']").disabled = totalEntradas >= MAX_ENTRADAS;
        const etiqueta = categoria.querySelector(".categoria__precio");
        if (!tipoPase) {
          etiqueta.textContent = etiqueta.dataset.sinPase;
          continue;
        }
        const precio = calculadora.precioEntrada(Number(categoria.dataset.edad), tipoPase);
        etiqueta.textContent = precio === 0 ? "Gratis" : `${formatoPesos.format(precio)} c/u`;
      }
    }

    function actualizarResumen() {
      const { edades, tipoPase } = leerSolicitud();
      actualizarPreciosDeCategorias(tipoPase);
      const entradas = tipoPase
        ? edades.map((edad) => ({ edad, precio: calculadora.precioEntrada(edad, tipoPase) }))
        : [];
      dibujarDetalle($("detalle"), entradas);
      $("resumen-vacio").hidden = entradas.length > 0;
      const total = formatoPesos.format(entradas.reduce((suma, entrada) => suma + entrada.precio, 0));
      $("total").textContent = total;
      $("total-movil").textContent = total;
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
        $("modal-mail-titulo").firstChild.textContent = resultado.mail.enviado
          ? "Mail enviado a "
          : "No pudimos enviar el mail a ";
        document.querySelector("#modal-mail p").textContent = resultado.mail.enviado
          ? "Te enviamos la confirmación con el detalle de tu compra."
          : `Tu compra quedó registrada igual. Motivo: ${resultado.mail.error}`;
        $("modal-mail").showModal();
      }
    }

    // El servidor concreta la compra con comprar(): la guarda y envía el mail. Si la solicitud
    // es inválida, responde 400 con el mismo mensaje de error.
    async function comprarEnElServidor(solicitud) {
      const respuesta = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(solicitud),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(cuerpo.error);
      }
      return cuerpo;
    }

    $("formulario").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      intentoComprar = true;
      validarEnElMomento();
      $("error").hidden = true;
      efectos.montoPagado = null;
      efectos.destinatarioMail = null;

      // comprar() sigue siendo la autoridad final: si la solicitud es inválida, no compra.
      const solicitud = leerSolicitud();
      let resultado;
      try {
        resultado = await comprarEnElServidor(solicitud);
        // Se anota también acá, para que el máximo de 10 y los adultos de la fecha se avisen en el momento.
        dependencias.compras.registrar(solicitud.usuario, solicitud.fechaVisita, solicitud.cantidad,
          logica.valores.contarAdultos(solicitud.edades));
        efectos.montoPagado = solicitud.formaPago === logica.valores.FORMA_PAGO.TARJETA ? resultado.montoTotal : null;
        efectos.destinatarioMail = resultado.mail.destinatario;
      } catch (error) {
        $("error").textContent = `${error.message}. Revisá los datos marcados en rojo.`;
        $("error").hidden = false;
        const primerInvalido = document.querySelector("#formulario [aria-invalid='true']");
        const destino = primerInvalido?.tagName === "INPUT"
          ? primerInvalido
          : primerInvalido?.querySelector("input, .contador__boton[data-paso='1']");
        destino?.scrollIntoView({ behavior: "smooth", block: "center" });
        destino?.focus({ preventScroll: true });
        return;
      }

      if (efectos.montoPagado === null || efectos.montoPagado === 0) {
        mostrarConfirmacion(resultado);
        return;
      }
      // Guardamos el resultado en sessionStorage por si redirigimos afuera (a Mercado Pago Sandbox)
      sessionStorage.setItem("compraPendiente", JSON.stringify({
        resultado,
        destinatarioMail: efectos.destinatarioMail,
      }));

      fetch("/api/mercadopago/preferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: efectos.montoPagado,
          cantidadEntradas: resultado.cantidadEntradas,
          fechaVisita: resultado.fechaVisita,
          tipoPase: resultado.tipoPase,
          origen: window.location.origin,
        }),
      })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((datos) => {
          // Redirige al Checkout Pro de Mercado Pago (init_point unificado)
          window.location.href = datos.initPoint || datos.sandboxUrl;
        })
        .catch(() => {
          // Fallback: si no hay MP_ACCESS_TOKEN o no hay internet, usa la pantalla simulada local
          $("pantalla-pago-monto").textContent = formatoPesos.format(efectos.montoPagado);
          $("pantalla-pago").hidden = false;
          $("volver-del-pago").focus();
          $("volver-del-pago").onclick = () => {
            $("pantalla-pago").hidden = true;
            mostrarConfirmacion(resultado);
          };
        });
    });

    $("nueva-compra").addEventListener("click", () => {
      $("confirmacion").hidden = true;
      $("formulario").closest(".disposicion").hidden = false;
      $("formulario").reset();
      // En un input hidden, asignar value cambia también el valor por defecto: reset() no lo borra.
      $("fecha").value = "";
      categorias().forEach((categoria) => {
        categoria.querySelector(".contador__valor").value = 0;
      });
      $("fecha-elegida").textContent = "Elegí un día disponible.";
      mesVisible = primerMes;
      dibujarCalendario();
      tocados.clear();
      intentoComprar = false;
      $("error").hidden = true;
      $("usuario-sesion").textContent = $("usuario").value;
      actualizarResumen();
      validarEnElMomento();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Cualquier cambio revalida en el momento los campos que ya se tocaron.
    $("formulario").addEventListener("input", validarEnElMomento);
    $("formulario").addEventListener("change", validarEnElMomento);

    // Cuándo se considera que el usuario terminó con cada campo.
    $("usuario").addEventListener("focusout", () => tocar("usuario"));
    $("fecha").addEventListener("change", () => tocar("fechaVisita"));
    document.querySelectorAll("input[name='tipoPase']")
      .forEach((opcion) => opcion.addEventListener("change", () => tocar("tipoPase")));
    document.querySelectorAll("input[name='formaPago']")
      .forEach((opcion) => opcion.addEventListener("change", () => tocar("formaPago")));

    $("usuario").addEventListener("input", () => {
      $("usuario-sesion").textContent = $("usuario").value.trim() || "(sin usuario)";
    });
    // Botones − y + de cada categoría: no bajan de 0; el máximo de 10 por fecha lo valida el servicio.
    document.querySelectorAll(".categoria .contador__boton").forEach((boton) => {
      boton.addEventListener("click", () => {
        const categoria = boton.closest(".categoria");
        const valor = categoria.querySelector(".contador__valor");
        valor.value = Math.max(0, cantidadDe(categoria) + Number(boton.dataset.paso));
        actualizarResumen();
        tocar("cantidad");
      });
    });
    document.querySelectorAll("input[name='tipoPase']")
      .forEach((opcion) => opcion.addEventListener("change", actualizarResumen));

    actualizarResumen();

    // Detectar retorno desde el Sandbox de Mercado Pago
    const parametrosUrl = new URLSearchParams(window.location.search);
    const estadoMp = parametrosUrl.get("mp_status") || parametrosUrl.get("status");
    const guardada = sessionStorage.getItem("compraPendiente");
    if (estadoMp === "approved" && guardada) {
      sessionStorage.removeItem("compraPendiente");
      window.history.replaceState({}, "", window.location.pathname);
      const { resultado, destinatarioMail } = JSON.parse(guardada);
      efectos.montoPagado = resultado.montoTotal;
      efectos.destinatarioMail = destinatarioMail;
      dependencias.compras.registrar(
        resultado.usuario || $("usuario").value.trim(),
        resultado.fechaVisita,
        resultado.cantidadEntradas,
        logica.valores.contarAdultos(resultado.entradas.map((entrada) => entrada.edad)),
      );
      mostrarConfirmacion(resultado);
    } else if (estadoMp === "rejected" || estadoMp === "null") {
      sessionStorage.removeItem("compraPendiente");
      window.history.replaceState({}, "", window.location.pathname);
      $("error").textContent = "El pago en Mercado Pago fue cancelado o rechazado. La compra sigue pendiente de pago.";
      $("error").hidden = false;
    }
  }

  async function cargarUsuarios() {
    const respuesta = await fetch("/api/usuarios");
    USUARIOS_REGISTRADOS.push(...await respuesta.json());
  }

  Promise.all([cargarLogica(), cargarUsuarios()])
    .then(([logica]) => iniciar(logica))
    .catch(() => {
      $("aviso-servidor").hidden = false;
      document.querySelectorAll("button[type='submit']").forEach((boton) => {
        boton.disabled = true;
      });
    });
})();
