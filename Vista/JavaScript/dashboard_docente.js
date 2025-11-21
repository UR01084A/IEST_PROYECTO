import { supabase } from "../../Modelo/supabase.js";

/* =======================================================
   VARIABLES
======================================================= */
let usuario = JSON.parse(localStorage.getItem("usuario"));
if (!usuario) window.location.href = "login.html";

let proyectos = [];
let tiposAvance = [];
let avances = [];
let evaluaciones = [];
let fechasEntrega = [];

/* =======================================================
   ARCHIVOS
======================================================= */
function sanitizeFileName(name) {
    return name.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w.-]/g, "_")
        .replace(/\s+/g, "_")
        .toLowerCase();
}

/* =======================================================
   INICIALIZACIÓN
======================================================= */
document.getElementById("nombreDocenteNavbar").textContent =
    usuario.username || "Docente";

inicializar();

async function inicializar() {
    await cargarTiposAvance();
    await cargarProyectos();
    await cargarFechasEntrega();
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
    setTimeout(() => {
        $("#tablaProyectos").DataTable();
        $("#tablaAvances").DataTable();
        $("#tablaFechas").DataTable();
    }, 300);
}

/* =======================================================
   EVENTOS DELEGADOS
======================================================= */
function inicializarEventosDelegados() {
    document.addEventListener("click", e => {

        const btnProyecto = e.target.closest(".btn-ver-proyecto");
        if (btnProyecto) mostrarModalProyecto(btnProyecto.dataset.id);

        const btnPrint = e.target.closest(".btn-print-proyecto");
        if (btnPrint) imprimirProyecto(btnPrint.dataset.id);

        const btnArchivo = e.target.closest(".btn-ver-archivo");
        if (btnArchivo) visorArchivo(btnArchivo.dataset.url);
    });
}

/* =======================================================
   TIPOS AVANCE
======================================================= */
async function cargarTiposAvance() {
    const { data } = await supabase.from("tipos_avance").select("*");
    tiposAvance = data || [];
}

/* =======================================================
   PROYECTOS
======================================================= */
async function cargarProyectos() {
    const { data } = await supabase
        .from("proyectos")
        .select(`
            id, titulo, estado, fecha_inicio, fecha_fin,
            objetivo_general, beneficiarios, localizacion,
            tipos_proyecto(nombre),
            lineas_investigacion(nombre)
        `)
        .eq("creado_por", usuario.id);

    proyectos = data || [];
}

/* =======================================================
   RENDER PROYECTOS
======================================================= */
function renderizarProyectos() {
    const tbody = document.getElementById("tbodyProyectos");
    tbody.innerHTML = "";

    proyectos.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.titulo}</td>
                <td>${p.tipos_proyecto.nombre}</td>
                <td>${p.lineas_investigacion.nombre}</td>
                <td>${p.estado}</td>
                <td>${p.fecha_inicio}</td>
                <td>${p.fecha_fin}</td>
                <td>
                    <button class="btn-accion btn-ver-proyecto" data-id="${p.id}">
                        <i class="fa fa-eye"></i> Ver
                    </button>

                    <button class="btn-accion btn-print-proyecto" data-id="${p.id}">
                        <i class="fa fa-print"></i> Imprimir
                    </button>
                </td>
            </tr>
        `;
    });

    document.querySelectorAll(".btn-ver-proyecto").forEach(b => {
        b.style.background = "#007bff";
        b.style.color = "white";
        b.style.border = "none";
        b.style.borderRadius = "8px";
        b.style.padding = "8px 14px";
        b.style.cursor = "pointer";
        b.style.fontWeight = "600";
    });

    document.querySelectorAll(".btn-print-proyecto").forEach(b => {
        b.style.background = "#28a745";
        b.style.color = "white";
        b.style.border = "none";
        b.style.borderRadius = "8px";
        b.style.padding = "8px 14px";
        b.style.cursor = "pointer";
        b.style.fontWeight = "600";
    });
}

/* =======================================================
   MODAL PROYECTO
======================================================= */
function mostrarModalProyecto(id) {
    const p = proyectos.find(x => x.id == id);

    const modal = document.createElement("div");
    modal.className = "modal-visor";

    modal.innerHTML = `
        <div class="modal-box">
            <h2>📄 Detalle del Proyecto</h2>

            <p><b>Título:</b> ${p.titulo}</p>
            <p><b>Tipo:</b> ${p.tipos_proyecto.nombre}</p>
            <p><b>Línea:</b> ${p.lineas_investigacion.nombre}</p>
            <p><b>Estado:</b> ${p.estado}</p>
            <p><b>Inicio:</b> ${p.fecha_inicio}</p>
            <p><b>Fin:</b> ${p.fecha_fin}</p>
            <p><b>Objetivo:</b> ${p.objetivo_general}</p>
            <p><b>Beneficiarios:</b> ${p.beneficiarios}</p>
            <p><b>Localización:</b> ${p.localizacion}</p>

            <button class="btn-cerrar-modal">Cerrar</button>
        </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector(".btn-cerrar-modal").onclick = () => modal.remove();
}

/* =======================================================
   IMPRIMIR PROYECTO
======================================================= */
function imprimirProyecto(id) {
    const p = proyectos.find(x => x.id == id);
    const w = window.open("", "_blank");

    w.document.write(`
        <h1>${p.titulo}</h1>
        <p><b>Tipo:</b> ${p.tipos_proyecto.nombre}</p>
        <p><b>Línea:</b> ${p.lineas_investigacion.nombre}</p>
        <p><b>Estado:</b> ${p.estado}</p>
        <p><b>Inicio:</b> ${p.fecha_inicio}</p>
        <p><b>Fin:</b> ${p.fecha_fin}</p>
        <p><b>Objetivo:</b> ${p.objetivo_general}</p>
        <p><b>Beneficiarios:</b> ${p.beneficiarios}</p>
        <p><b>Localización:</b> ${p.localizacion}</p>
    `);

    w.print();
}

/* =======================================================
   SELECTORES
======================================================= */
function actualizarSelectores() {
    selectProyectoAvance.innerHTML =
        proyectos.map(p => `<option value="${p.id}">${p.titulo}</option>`).join("");

    selectTipoAvance.innerHTML =
        tiposAvance.map(t => `<option value="${t.id}">${t.nombre}</option>`).join("");
}

/* =======================================================
   SUBIR AVANCE
======================================================= */
btnEnviarAvance.onclick = enviarAvance;

async function enviarAvance() {
    const proyectoId = selectProyectoAvance.value;
    const tipoId = selectTipoAvance.value;
    const archivo = archivoAvance.files[0];

    if (!proyectoId || !tipoId || !archivo) {
        Swal.fire("Faltan datos", "Completa todos los campos", "warning");
        return;
    }

    const clean = sanitizeFileName(archivo.name);
    const storagePath = `${usuario.id}/${proyectoId}/${tipoId}/${Date.now()}_${clean}`;

    const { error: uploadErr } = await supabase.storage
        .from("archivos")
        .upload(storagePath, archivo);

    if (uploadErr) {
        Swal.fire("Error", "No se pudo subir el archivo", "error");
        return;
    }

    const { data: signedUrl } = await supabase.storage
        .from("archivos")
        .createSignedUrl(storagePath, 86400);

    await supabase.from("avances").insert({
        proyecto_id: proyectoId,
        tipo_id: tipoId,
        archivo_url: signedUrl.signedUrl,
        enviado_por: usuario.id,
        estado: "enviado"
    });

    Swal.fire("Éxito", "Avance enviado correctamente", "success");

    await cargarAvances();
    await cargarEvaluaciones();
    renderizarAvances();
}

/* =======================================================
   CARGAR AVANCES
======================================================= */
async function cargarAvances() {
    const { data } = await supabase
        .from("avances")
        .select(`
            id, proyecto_id, tipo_id, archivo_url, enviado_en, estado,
            tipos_avance(nombre),
            proyectos(titulo)
        `)
        .eq("enviado_por", usuario.id)
        .order("enviado_en", { ascending: false });

    avances = data || [];
}

/* =======================================================
   CARGAR EVALUACIONES
======================================================= */
async function cargarEvaluaciones() {
    const { data } = await supabase.from("evaluaciones_avances").select("*");
    evaluaciones = data || [];
}

/* =======================================================
   RENDER AVANCES
======================================================= */
function renderizarAvances() {
    const tbody = document.getElementById("tbodyAvances");
    tbody.innerHTML = "";

    if (avances.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8">Aún no enviaste avances.</td></tr>`;
        return;
    }

    avances.forEach(a => {
        const evalA = evaluaciones.find(e => e.avance_id === a.id);

        tbody.innerHTML += `
            <tr>
                <td>${a.proyectos.titulo}</td>
                <td>${a.tipos_avance.nombre}</td>

                <td>
                    <span class="estado-badge ${a.estado === "enviado"
                        ? "estado-enviado"
                        : a.estado === "evaluado"
                        ? "estado-evaluado"
                        : a.estado === "observado"
                        ? "estado-observado"
                        : ""}">
                        ${a.estado}
                    </span>
                </td>

                <td>${new Date(a.enviado_en).toLocaleString()}</td>
                <td>${evalA?.nota ?? "-"}</td>
                <td>${evalA?.observaciones ?? "-"}</td>

                <td>
                    <button class="btn-accion btn-ver-archivo" data-url="${a.archivo_url}">
                        <i class="fa fa-eye"></i> Archivo
                    </button>
                </td>

                <td>
                    ${evalA?.archivo_url 
                        ? `<button class="btn-accion btn-ver-archivo" data-url="${evalA.archivo_url}">
                              <i class="fa fa-file"></i> Informe
                           </button>`
                        : "-"
                    }
                </td>
            </tr>
        `;
    });

    document.querySelectorAll(".btn-ver-archivo").forEach(b => {
        b.style.background = "#007bff";
        b.style.color = "white";
        b.style.border = "none";
        b.style.borderRadius = "8px";
        b.style.padding = "8px 14px";
        b.style.cursor = "pointer";
        b.style.fontWeight = "600";
    });
}

/* =======================================================
   VISOR ARCHIVOS
======================================================= */
function visorArchivo(url) {
    let iframeSrc = url;

    if (url.includes(".doc") || url.includes(".docx")) {
        iframeSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }

    const modal = document.createElement("div");
    modal.className = "modal-visor";

    modal.innerHTML = `
        <div class="visor-box">
            <iframe src="${iframeSrc}"></iframe>
            <button class="btn-cerrar-modal">Cerrar</button>
        </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector(".btn-cerrar-modal").onclick = () => modal.remove();
}

/* =======================================================
   FECHAS DE ENTREGA
======================================================= */
async function cargarFechasEntrega() {
    const { data } = await supabase
        .from("fechas_entrega")
        .select(`
            id, proyecto_id, tipo_avance_id, fecha_limite,
            tipos_avance(nombre)
        `);

    fechasEntrega = data || [];
}

function renderizarCronograma() {
    const tbody = document.getElementById("tbodyFechasEntrega");
    tbody.innerHTML = "";

    fechasEntrega.forEach(f => {
        tbody.innerHTML += `
            <tr>
                <td>${f.tipos_avance.nombre}</td>
                <td>${f.fecha_limite}</td>
            </tr>
        `;
    });
}

/* =======================================================
   GRAFICOS
======================================================= */
function generarGraficoEstados() {
    const c = document.getElementById("graficoEstados");
    if (!c) return;

    new Chart(c, {
        type: "pie",
        data: {
            labels: ["Registrado", "En Revisión", "Aprobado"],
            datasets: [{
                data: [
                    proyectos.filter(p => p.estado === "registrado").length,
                    proyectos.filter(p => p.estado === "en revisión").length,
                    proyectos.filter(p => p.estado === "aprobado").length
                ],
                backgroundColor: ["#3498db", "#f1c40f", "#2ecc71"]
            }]
        }
    });
}

function generarGraficoAvances() {
    const c = document.getElementById("graficoAvancesTipo");
    if (!c) return;

    let conteo = {};

    avances.forEach(a => {
        const nombre = a.tipos_avance.nombre;
        conteo[nombre] = (conteo[nombre] || 0) + 1;
    });

    new Chart(c, {
        type: "bar",
        data: {
            labels: Object.keys(conteo),
            datasets: [{
                label: "Avances Enviados",
                data: Object.values(conteo),
                backgroundColor: "#4e73df"
            }]
        }
    });
}

/* =======================================================
   METRICAS
======================================================= */
function actualizarMetricas() {
    document.getElementById("countActivos").textContent =
        proyectos.filter(p => p.estado === "registrado").length;

    document.getElementById("countEvaluacion").textContent =
        proyectos.filter(p => p.estado === "en revisión").length;

    document.getElementById("countAprobados").textContent =
        proyectos.filter(p => p.estado === "aprobado").length;
}

/* =======================================================
   LOGOUT
======================================================= */
document.getElementById("btnCerrarSesion").onclick = () => {
    localStorage.removeItem("usuario");
    window.location.href = "login.html";
};
