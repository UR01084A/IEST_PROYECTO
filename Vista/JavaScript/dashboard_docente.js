import { supabase } from "../../Modelo/supabase.js";

/* =======================================================
   CONFIGURACIÓN INICIAL / SESIÓN
======================================================= */
let usuario = JSON.parse(localStorage.getItem("usuario"));
if (!usuario) window.location.href = "login.html";

const spanNombreNavbar = document.getElementById("nombreDocenteNavbar");
if (spanNombreNavbar) {
  spanNombreNavbar.textContent = usuario.username || "Docente";
}

/* =======================================================
   REFERENCIAS A ELEMENTOS DEL DOM
======================================================= */
const selectProyectoAvance = document.getElementById("selectProyectoAvance");
const selectTipoAvance = document.getElementById("selectTipoAvance");
const inputArchivoAvance = document.getElementById("archivoAvance");
const btnEnviarAvance = document.getElementById("btnEnviarAvance");
const btnCerrarSesion = document.getElementById("btnCerrarSesion");

const tbodyProyectos = document.getElementById("tbodyProyectos");
const tbodyAvances = document.getElementById("tbodyAvances");
const tbodyFechasEntrega = document.getElementById("tbodyFechasEntrega");

const spanCountActivos = document.getElementById("countActivos");
const spanCountEvaluacion = document.getElementById("countEvaluacion");
const spanCountAprobados = document.getElementById("countAprobados");

/* =======================================================
   VARIABLES GLOBALES
======================================================= */
let proyectos = [];
let tiposAvance = [];
let avances = [];
let evaluaciones = [];
let fechasEntrega = [];

/* =======================================================
   UTILIDADES
======================================================= */
function sanitizeFileName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]/g, "_")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

function formatearFechaHora(fecha) {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearFechaCorta(fecha) {
  if (!fecha) return "-";
  return new Date(fecha).toISOString().slice(0, 10);
}

/* ------------ helpers de archivos -------------- */
function extraerRutaDesdeArchivoUrl(archivo_url) {
  try {
    const u = new URL(archivo_url);
    const path = u.pathname; // /storage/v1/object/sign/archivos/...
    const marker = "/object/sign/";
    const idx = path.indexOf(marker);
    if (idx === -1) return null;

    let after = path.substring(idx + marker.length); // "archivos/.../file.pdf"
    if (after.startsWith("archivos/")) {
      after = after.substring("archivos/".length);
    }
    return after || null;
  } catch {
    return null;
  }
}

async function obtenerUrlArchivoValida({ ruta_storage, archivo_url }) {
  // Si tenemos ruta_storage, generamos una nueva URL firmada
  if (ruta_storage) {
    const { data, error } = await supabase.storage
      .from("archivos")
      .createSignedUrl(ruta_storage, 3600);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  // Si solo tenemos archivo_url
  if (archivo_url) {
    if (archivo_url.includes("/object/sign/")) {
      const ruta = extraerRutaDesdeArchivoUrl(archivo_url);
      if (ruta) {
        const { data, error } = await supabase.storage
          .from("archivos")
          .createSignedUrl(ruta, 3600);

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      }
    }
    return archivo_url;
  }

  return null;
}

function construirIframeSrc(urlFinal) {
  if (!urlFinal) return "";
  if (urlFinal.includes(".doc") || urlFinal.includes(".docx")) {
    return (
      "https://view.officeapps.live.com/op/embed.aspx?src=" +
      encodeURIComponent(urlFinal)
    );
  }
  return urlFinal;
}

/* =======================================================
   INICIO
======================================================= */
inicializar().catch((err) => {
  console.error("Error al inicializar dashboard docente:", err);
  Swal.fire("Error", "Ocurrió un problema al cargar el panel del docente.", "error");
});

async function inicializar() {
  await Promise.all([cargarTiposAvance(), cargarProyectos(), cargarFechasEntrega()]);

  await cargarAvances();
  await cargarEvaluaciones();

  actualizarSelectores();
  actualizarMetricas();
  renderizarProyectos();
  renderizarAvances();
  renderizarCronograma();
  generarGraficoEstados();
  generarGraficoAvances();

  inicializarEventosDelegados();
  inicializarDataTables();
}

/* =======================================================
   DATA TABLES
======================================================= */
function inicializarDataTables() {
  const opciones = {
    responsive: true,
    pageLength: 5,
    lengthMenu: [5, 10, 25, 50],
    language: {
      url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json",
    },
  };

  setTimeout(() => {
    if ($("#tablaProyectos").length && !$.fn.DataTable.isDataTable("#tablaProyectos")) {
      $("#tablaProyectos").DataTable(opciones);
    }
    if ($("#tablaAvances").length && !$.fn.DataTable.isDataTable("#tablaAvances")) {
      $("#tablaAvances").DataTable(opciones);
    }
    if ($("#tablaFechas").length && !$.fn.DataTable.isDataTable("#tablaFechas")) {
      $("#tablaFechas").DataTable(opciones);
    }
  }, 350);
}

/* =======================================================
   EVENTOS DELEGADOS
======================================================= */
function inicializarEventosDelegados() {
  document.addEventListener("click", (e) => {
    const btnProyecto = e.target.closest(".btn-ver-proyecto");
    if (btnProyecto) {
      return mostrarModalProyecto(btnProyecto.dataset.id);
    }

    const btnPrint = e.target.closest(".btn-print-proyecto");
    if (btnPrint) {
      return imprimirProyecto(btnPrint.dataset.id);
    }

    const btnArchivo = e.target.closest(".btn-ver-archivo");
    if (btnArchivo) {
      return visorArchivo(btnArchivo.dataset.ruta, btnArchivo.dataset.url);
    }
  });

  if (btnEnviarAvance) {
    btnEnviarAvance.onclick = enviarAvance;
  }

  if (btnCerrarSesion) {
    btnCerrarSesion.onclick = () => {
      localStorage.removeItem("usuario");
      window.location.href = "login.html";
    };
  }
}

/* =======================================================
   CONSULTAS A SUPABASE
======================================================= */
async function cargarTiposAvance() {
  const { data, error } = await supabase.from("tipos_avance").select("*");
  if (error) {
    console.error("Error al cargar tipos de avance:", error);
    tiposAvance = [];
    return;
  }
  tiposAvance = data || [];
}

async function cargarProyectos() {
  const { data, error } = await supabase
    .from("proyectos")
    .select(
      `
      id, titulo, estado, fecha_inicio, fecha_fin,
      objetivo_general, beneficiarios, localizacion,
      tipos_proyecto(nombre),
      lineas_investigacion(nombre)
    `
    )
    .eq("creado_por", usuario.id);

  if (error) {
    console.error("Error al cargar proyectos del docente:", error);
    proyectos = [];
    return;
  }
  proyectos = data || [];
}

// 🔹 Fechas globales de entrega (configuradas por el admin)
async function cargarFechasEntrega() {
  const { data, error } = await supabase
    .from("fechas_entrega_global")
    .select(
      `
      id,
      tipo_avance_id,
      fecha_limite,
      descripcion,
      activo,
      tipos_avance (nombre)
    `
    )
    .eq("activo", true)
    .order("fecha_limite", { ascending: true });

  if (error) {
    console.error("Error al cargar fechas de entrega globales:", error);
    fechasEntrega = [];
    return;
  }

  fechasEntrega = data || [];
}

async function cargarAvances() {
  const { data, error } = await supabase
    .from("avances")
    .select(
      `
      id, proyecto_id, tipo_id, archivo_url, ruta_storage, enviado_en, estado,
      tipos_avance(nombre),
      proyectos(titulo)
    `
    )
    .eq("enviado_por", usuario.id)
    .order("enviado_en", { ascending: false });

  if (error) {
    console.error("Error al cargar avances:", error);
    avances = [];
    return;
  }

  avances = data || [];
}

async function cargarEvaluaciones() {
  const { data, error } = await supabase
    .from("evaluaciones_avances")
    .select("*");

  if (error) {
    console.error("Error al cargar evaluaciones de avances:", error);
    evaluaciones = [];
    return;
  }

  evaluaciones = data || [];
}

/* =======================================================
   SELECTORES (COMBOS) – ENVÍO DE AVANCE
======================================================= */
function actualizarSelectores() {
  if (selectProyectoAvance) {
    selectProyectoAvance.innerHTML =
      `<option value="">Seleccione un proyecto</option>` +
      proyectos.map((p) => `<option value="${p.id}">${p.titulo}</option>`).join("");
  }

  if (selectTipoAvance) {
    selectTipoAvance.innerHTML =
      `<option value="">Seleccione tipo de avance</option>` +
      tiposAvance.map((t) => `<option value="${t.id}">${t.nombre}</option>`).join("");
  }
}

/* =======================================================
   SUBIR AVANCE
======================================================= */
async function enviarAvance() {
  const proyectoId = selectProyectoAvance?.value;
  const tipoId = selectTipoAvance?.value;
  const archivo = inputArchivoAvance?.files?.[0];

  if (!proyectoId || !tipoId || !archivo) {
    Swal.fire(
      "Datos incompletos",
      "Selecciona proyecto, tipo de avance y archivo.",
      "warning"
    );
    return;
  }

  try {
    btnEnviarAvance.disabled = true;
    btnEnviarAvance.textContent = "Enviando...";

    const clean = sanitizeFileName(archivo.name);
    const storagePath = `${usuario.id}/${proyectoId}/${tipoId}/${Date.now()}_${clean}`;

    const { error: uploadErr } = await supabase.storage
      .from("archivos")
      .upload(storagePath, archivo);

    if (uploadErr) {
      console.error("Error al subir archivo a Supabase Storage:", uploadErr);
      Swal.fire("Error", "No se pudo subir el archivo.", "error");
      return;
    }

    // Firmamos la URL para el docente (vista rápida)
    const { data: signedData, error: signedErr } = await supabase.storage
      .from("archivos")
      .createSignedUrl(storagePath, 60 * 60 * 24); // 24h

    if (signedErr || !signedData?.signedUrl) {
      console.error("Error al crear URL firmada:", signedErr);
      Swal.fire(
        "Advertencia",
        "El avance se registró, pero no se pudo generar un enlace de vista.",
        "warning"
      );
    }

    // Guardamos ruta_storage
    await supabase.from("avances").insert({
      proyecto_id: proyectoId,
      tipo_id: tipoId,
      archivo_url: signedData?.signedUrl || null,
      ruta_storage: storagePath,
      enviado_por: usuario.id,
      estado: "enviado",
    });

    Swal.fire("Éxito", "Avance enviado correctamente.", "success");

    // Recargar datos
    await cargarAvances();
    await cargarEvaluaciones();
    renderizarAvances();
    generarGraficoAvances();

    // Limpiar formulario
    if (inputArchivoAvance) inputArchivoAvance.value = "";
    if (selectTipoAvance) selectTipoAvance.value = "";
    if (selectProyectoAvance) selectProyectoAvance.value = "";
  } catch (err) {
    console.error("Error en enviarAvance:", err);
    Swal.fire("Error", "Ocurrió un problema al enviar el avance.", "error");
  } finally {
    if (btnEnviarAvance) {
      btnEnviarAvance.disabled = false;
      btnEnviarAvance.textContent = "Enviar avance";
    }
  }
}

/* =======================================================
   RENDER – PROYECTOS
======================================================= */
function renderizarProyectos() {
  if (!tbodyProyectos) return;
  tbodyProyectos.innerHTML = "";

  // ⚠️ No agregamos filas con colspan; si no hay proyectos, dejamos tbody vacío
  if (!proyectos.length) {
    return;
  }

  proyectos.forEach((p) => {
    tbodyProyectos.innerHTML += `
      <tr>
        <td>${p.titulo}</td>
        <td>${p.tipos_proyecto?.nombre ?? "-"}</td>
        <td>${p.lineas_investigacion?.nombre ?? "-"}</td>
        <td>${p.estado}</td>
        <td>${p.fecha_inicio ?? "-"}</td>
        <td>${p.fecha_fin ?? "-"}</td>
        <td>${p.objetivo_general ?? "-"}</td>
        <td>${p.beneficiarios ?? "-"}</td>
        <td>${p.localizacion ?? "-"}</td>
        <td>
          <button class="btn-accion btn-ver btn-ver-proyecto" data-id="${p.id}">
            <i class="fa fa-eye"></i> Ver
          </button>

          <button class="btn-accion btn-print btn-print-proyecto" data-id="${p.id}">
            <i class="fa fa-print"></i> Imprimir
          </button>
        </td>
      </tr>
    `;
  });
}

/* =======================================================
   MODAL DETALLE DEL PROYECTO
======================================================= */
function mostrarModalProyecto(id) {
  const p = proyectos.find((x) => String(x.id) === String(id));

  if (!p) {
    Swal.fire("No encontrado", "No se encontró información del proyecto.", "warning");
    return;
  }

  const modal = document.createElement("div");
  modal.className = "modal-visor";

  modal.innerHTML = `
    <div class="modal-box">
      <h2 class="modal-titulo">📄 Detalle del Proyecto</h2>

      <p><b>Título:</b> ${p.titulo}</p>
      <p><b>Tipo:</b> ${p.tipos_proyecto?.nombre ?? "-"}</p>
      <p><b>Línea:</b> ${p.lineas_investigacion?.nombre ?? "-"}</p>
      <p><b>Estado:</b> ${p.estado}</p>
      <p><b>Fecha de inicio:</b> ${p.fecha_inicio ?? "-"}</p>
      <p><b>Fecha de fin:</b> ${p.fecha_fin ?? "-"}</p>
      <p><b>Objetivo general:</b> ${p.objetivo_general ?? "-"}</p>
      <p><b>Beneficiarios:</b> ${p.beneficiarios ?? "-"}</p>
      <p><b>Localización:</b> ${p.localizacion ?? "-"}</p>

      <button class="btn-cerrar-modal">
        Cerrar
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const btnCerrar = modal.querySelector(".btn-cerrar-modal");
  btnCerrar.onclick = () => modal.remove();
}

/* =======================================================
   IMPRIMIR PROYECTO (VENTANA SIMPLE)
======================================================= */
function imprimirProyecto(id) {
  const p = proyectos.find((x) => String(x.id) === String(id));
  if (!p) {
    Swal.fire("No encontrado", "No se encontró información del proyecto.", "warning");
    return;
  }

  const w = window.open("", "_blank");

  w.document.write(`
    <html>
    <head>
      <title>Proyecto - ${p.titulo}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; }
        h1 { text-align: center; margin-bottom: 20px; }
        p { font-size: 15px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <h1>${p.titulo}</h1>
      <p><b>Tipo:</b> ${p.tipos_proyecto?.nombre ?? "-"}</p>
      <p><b>Línea de investigación:</b> ${p.lineas_investigacion?.nombre ?? "-"}</p>
      <p><b>Estado:</b> ${p.estado}</p>
      <p><b>Inicio:</b> ${p.fecha_inicio ?? "-"}</p>
      <p><b>Fin:</b> ${p.fecha_fin ?? "-"}</p>
      <p><b>Objetivo general:</b> ${p.objetivo_general ?? "-"}</p>
      <p><b>Beneficiarios:</b> ${p.beneficiarios ?? "-"}</p>
      <p><b>Localización:</b> ${p.localizacion ?? "-"}</p>
    </body>
    </html>
  `);

  w.document.close();
  w.print();
}

/* =======================================================
   ESTADO MOSTRADO DEL AVANCE (DOCENTE)
======================================================= */
function obtenerEstadoAvance(a, evalA) {
  // Si ya hay evaluación, usamos su estado
  if (evalA && evalA.estado) {
    switch (evalA.estado) {
      case "aprobado":
        return { texto: "Aprobado", clase: "estado-aprobado" };
      case "desaprobado":
        return { texto: "Desaprobado", clase: "estado-desaprobado" };
      case "observado":
        return { texto: "Observado", clase: "estado-observado" };
      default:
        return { texto: evalA.estado, clase: "" };
    }
  }

  // Si no hay evaluación todavía, usamos el estado del avance
  switch (a.estado) {
    case "enviado":
      return { texto: "Enviado", clase: "estado-enviado" };
    case "evaluado":
      return { texto: "En evaluación", clase: "estado-evaluacion" };
    case "observado":
      return { texto: "Observado", clase: "estado-observado" };
    default:
      return { texto: a.estado || "-", clase: "" };
  }
}

/* =======================================================
   ÚLTIMA EVALUACIÓN POR AVANCE
======================================================= */
function getUltimaEvaluacion(avanceId) {
  const lista = evaluaciones.filter((e) => e.avance_id === avanceId);
  if (!lista.length) return null;
  return lista
    .slice()
    .sort(
      (a, b) => new Date(b.fecha_evaluacion) - new Date(a.fecha_evaluacion)
    )[0];
}

/* =======================================================
   NOTA MOSTRADA (USA DETALLES SI EXISTE)
======================================================= */
function obtenerNotaMostrada(evalA) {
  if (!evalA) return "-";

  const detalles = evalA.detalles || {};
  const puntaje = detalles.puntaje;
  const totalCriterios = detalles.total_criterios;

  if (
    typeof puntaje === "number" &&
    typeof totalCriterios === "number" &&
    totalCriterios > 0
  ) {
    // Mostramos el puntaje original (ej. 20/35)
    return `${puntaje}/${totalCriterios}`;
  }

  // Si no hay detalles, mostramos la nota guardada (0–20, 25, etc.)
  if (typeof evalA.nota === "number") return evalA.nota;

  return "-";
}

/* =======================================================
   RENDER – AVANCES
======================================================= */
function renderizarAvances() {
  if (!tbodyAvances) return;
  tbodyAvances.innerHTML = "";

  // ⚠️ No agregamos fila con colspan; si no hay avances, tbody vacío
  if (!avances.length) {
    return;
  }

  avances.forEach((a) => {
    // 🔹 usamos siempre la ÚLTIMA evaluación de ese avance
    const evalA = getUltimaEvaluacion(a.id);

    const estadoInfo = obtenerEstadoAvance(a, evalA);
    const textoEstado = estadoInfo.texto;
    const claseEstado = estadoInfo.clase;

    // Buscar fecha límite global según tipo de avance
    const fechaConfig = fechasEntrega.find((f) => f.tipo_avance_id === a.tipo_id);
    const fechaLimiteTexto = fechaConfig
      ? formatearFechaCorta(fechaConfig.fecha_limite)
      : "-";

    const notaMostrada = obtenerNotaMostrada(evalA);

    tbodyAvances.innerHTML += `
      <tr>
        <td>${a.proyectos?.titulo ?? "-"}</td>
        <td>${a.tipos_avance?.nombre ?? "-"}</td>

        <td>
          <span class="estado-badge ${claseEstado}">
            ${textoEstado}
          </span>
        </td>

        <td>${fechaLimiteTexto}</td>
        <td>${formatearFechaHora(a.enviado_en)}</td>
        <td>${notaMostrada}</td>
        <td>${evalA?.observaciones ?? "-"}</td>

        <td>
          <button class="btn-accion btn-ver-archivo btn-ver"
                  data-ruta="${a.ruta_storage ?? ""}"
                  data-url="${a.archivo_url ?? ""}">
            <i class="fa fa-eye"></i> Archivo
          </button>
        </td>

        <td>
          ${
            evalA?.archivo_url
              ? `<button class="btn-accion btn-ver-archivo btn-archivo"
                         data-ruta=""
                         data-url="${evalA.archivo_url}">
                   <i class="fa fa-file"></i> Informe
                 </button>`
              : "-"
          }
        </td>
      </tr>
    `;
  });
}

/* =======================================================
   VISOR DE ARCHIVOS (MODAL)
======================================================= */
async function visorArchivo(ruta_storage, archivo_url) {
  const urlFinal = await obtenerUrlArchivoValida({ ruta_storage, archivo_url });

  if (!urlFinal) {
    Swal.fire("Sin archivo", "No se encontró la URL del archivo.", "warning");
    return;
  }

  const iframeSrc = construirIframeSrc(urlFinal);

  const modal = document.createElement("div");
  modal.className = "modal-visor";

  modal.innerHTML = `
    <div class="visor-box">
      <h2 class="modal-titulo">
        <i class="fa fa-eye"></i> Vista previa del archivo
      </h2>
      <iframe src="${iframeSrc}"></iframe>
      <button class="btn-cerrar-modal">
        Cerrar
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const btnCerrar = modal.querySelector(".btn-cerrar-modal");
  btnCerrar.onclick = () => modal.remove();
}

/* =======================================================
   RENDER – CRONOGRAMA (FECHAS DE ENTREGA)
======================================================= */
function renderizarCronograma() {
  if (!tbodyFechasEntrega) return;
  tbodyFechasEntrega.innerHTML = "";

  // ⚠️ No agregamos fila con colspan
  if (!fechasEntrega.length) {
    return;
  }

  fechasEntrega.forEach((f) => {
    const tipo = f.tipos_avance?.nombre ?? "-";
    const fecha = formatearFechaCorta(f.fecha_limite);
    const desc = f.descripcion ?? "";

    tbodyFechasEntrega.innerHTML += `
      <tr>
        <td>${tipo}</td>
        <td>${fecha}</td>
        <td>${desc}</td>
      </tr>
    `;
  });
}

/* =======================================================
   GRÁFICOS (Chart.js)
======================================================= */
function generarGraficoEstados() {
  const c = document.getElementById("graficoEstados");
  if (!c || !proyectos.length) return;

  const registrados = proyectos.filter((p) => p.estado === "registrado").length;
  const revision = proyectos.filter((p) => p.estado === "en revisión").length;
  const aprobados = proyectos.filter((p) => p.estado === "aprobado").length;

  new Chart(c, {
    type: "pie",
    data: {
      labels: ["Registrado", "En revisión", "Aprobado"],
      datasets: [
        {
          data: [registrados, revision, aprobados],
          backgroundColor: ["#3498db", "#f1c40f", "#2ecc71"],
        },
      ],
    },
  });
}

function generarGraficoAvances() {
  const c = document.getElementById("graficoAvancesTipo");
  if (!c || !avances.length) return;

  const conteo = {};

  avances.forEach((a) => {
    const nombre = a.tipos_avance?.nombre ?? "Sin tipo";
    conteo[nombre] = (conteo[nombre] || 0) + 1;
  });

  new Chart(c, {
    type: "bar",
    data: {
      labels: Object.keys(conteo),
      datasets: [
        {
          label: "Avances enviados",
          data: Object.values(conteo),
          backgroundColor: "#4e73df",
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { ticks: { font: { size: 11 } } },
        y: {
          beginAtZero: true,
          precision: 0,
        },
      },
    },
  });
}

/* =======================================================
   MÉTRICAS – TARJETAS SUPERIORES
======================================================= */
function actualizarMetricas() {
  if (spanCountActivos) {
    spanCountActivos.textContent =
      proyectos.filter((p) => p.estado === "registrado").length;
  }

  if (spanCountEvaluacion) {
    spanCountEvaluacion.textContent =
      proyectos.filter((p) => p.estado === "en revisión").length;
  }

  if (spanCountAprobados) {
    spanCountAprobados.textContent =
      proyectos.filter((p) => p.estado === "aprobado").length;
  }
}
