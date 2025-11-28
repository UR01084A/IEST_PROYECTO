// jefeunidad_dashboard.js
import { supabase } from "../../Modelo/supabase.js";

/* =======================================================
   VALIDACIÓN DE SESIÓN
======================================================= */
let usuario = JSON.parse(localStorage.getItem("usuario"));
if (!usuario) window.location.href = "login.html";

document.getElementById("nombreJefeNavbar").textContent =
    usuario.username ?? "-";

/* =======================================================
   VARIABLES GLOBALES
======================================================= */
let proyectos = [];
let perfiles = [];
let avances = [];
let informes = [];
let evaluaciones = [];

let AVANCE_ACTUAL = null;
let TIPO_AVANCE_ACTUAL = null; // "perfil" | "informe"

let eventosInicializados = false;
let postMessageInicializado = false;

/* =======================================================
   INICIO
======================================================= */
inicializar();

async function inicializar() {
    try {
        const { data: ev, error: evError } = await supabase
            .from("evaluaciones_avances")
            .select("*");

        if (evError) {
            console.error("Error cargando evaluaciones:", evError);
            evaluaciones = [];
        } else {
            evaluaciones = ev ?? [];
        }

        await Promise.all([
            cargarProyectos(),
            cargarPerfilProyecto(),
            cargarAvances(),
            cargarInformeFinal()
        ]);

        renderizarProyectos();
        renderizarPerfilProyecto();
        renderizarAvances();
        renderizarInformeFinal();

        inyectarEstilosUI();

        if (!eventosInicializados) {
            inicializarEventosGlobales();
            eventosInicializados = true;
        }

        if (!postMessageInicializado) {
            inicializarPostMessage();
            postMessageInicializado = true;
        }

        inicializarDataTables();
    } catch (err) {
        console.error("Error al inicializar:", err);
        if (window.Swal) {
            Swal.fire("Error", "No se pudo cargar la información.", "error");
        } else {
            alert("No se pudo cargar la información.");
        }
    }
}

/* =======================================================
   ESTILOS DE UI (BOTONES, MODALES, ETC.)
======================================================= */
function inyectarEstilosUI() {
    if (document.getElementById("estilosDashboardJefe")) return;

    const style = document.createElement("style");
    style.id = "estilosDashboardJefe";
    style.textContent = `
        /* Botones generales */
        .btn-ver,
        .btn-evaluar,
        .btn-print,
        #btnCerrarVisor,
        #btnCerrarProyecto,
        #btnImprimirProyecto,
        #btnCerrarSesion {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 999px;
            border: none;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease-in-out;
            box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }

        .btn-ver i,
        .btn-evaluar i,
        .btn-print i {
            font-size: 13px;
        }

        .btn-ver {
            background: #3498db;
            color: #ffffff;
        }
        .btn-ver:hover {
            background: #2c81ba;
            box-shadow: 0 3px 6px rgba(0,0,0,0.18);
            transform: translateY(-1px);
        }

        .btn-evaluar {
            background: #f39c12;
            color: #ffffff;
        }
        .btn-evaluar:hover {
            background: #d68910;
            box-shadow: 0 3px 6px rgba(0,0,0,0.18);
            transform: translateY(-1px);
        }

        .btn-print {
            background: #28a745;
            color: #ffffff;
        }
        .btn-print:hover {
            background: #218838;
            box-shadow: 0 3px 6px rgba(0,0,0,0.18);
            transform: translateY(-1px);
        }

        #btnCerrarVisor,
        #btnCerrarProyecto {
            background: #e74c3c;
            color: #ffffff;
        }
        #btnCerrarVisor:hover,
        #btnCerrarProyecto:hover {
            background: #c0392b;
        }

        #btnImprimirProyecto {
            background: #4e73df;
            color: #ffffff;
        }
        #btnImprimirProyecto:hover {
            background: #3b5cc6;
        }

        #btnCerrarSesion {
            background: #ff4757 !important;
            color: #ffffff !important;
        }
        #btnCerrarSesion:hover {
            background: #e84118 !important;
        }

        /* Cabeceras de tablas */
        table.dataTable thead th {
            background: #007bff;
            color: #ffffff;
            border-bottom: none;
        }

        /* Modal de evaluación */
        #modalEvaluacion .modal-content {
            border-radius: 10px;
        }

        /* Modal visor archivo */
        #modalVisor .modal-content {
            max-width: 90%;
            width: 90%;
        }
    `;
    document.head.appendChild(style);
}

/* =======================================================
   DATA TABLES (ESPAÑOL)
======================================================= */
function inicializarDataTables() {
    setTimeout(() => {
        const tablas = [
            "#tablaProyectosJefe",
            "#tablaPerfilProyecto",
            "#tablaAvancesJefe",
            "#tablaInformeFinal"
        ];

        tablas.forEach(sel => {
            if (!$.fn.DataTable.isDataTable(sel)) {
                $(sel).DataTable({
                    language: {
                        url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json"
                    }
                });
            }
        });
    }, 300);
}

/* =======================================================
   CONSULTAS A SUPABASE
======================================================= */
async function cargarProyectos() {
    const { data, error } = await supabase
        .from("proyectos")
        .select(`
            id, titulo, tipo_id, estado, objetivo_general, beneficiarios, localizacion,
            fecha_inicio, fecha_fin,
            usuarios:creado_por(username),
            tipos_proyecto(nombre),
            lineas_investigacion(nombre)
        `);

    if (error) {
        console.error("Error cargarProyectos", error);
        proyectos = [];
        return;
    }

    proyectos = data ?? [];
}

async function cargarPerfilProyecto() {
    const { data, error } = await supabase
        .from("avances")
        .select(`
            id, proyecto_id, tipo_id, archivo_url, ruta_storage, enviado_en, estado,
            proyectos(id, titulo, tipo_id, tipos_proyecto(nombre), usuarios:creado_por(username))
        `)
        .eq("tipo_id", 3); // Perfil

    if (error) {
        console.error("Error cargarPerfilProyecto", error);
        perfiles = [];
        return;
    }

    perfiles = data ?? [];
}

async function cargarAvances() {
    const { data, error } = await supabase
        .from("avances")
        .select(`
            id, proyecto_id, tipo_id, archivo_url, ruta_storage, enviado_en, estado,
            proyectos(id, titulo, tipo_id, tipos_proyecto(nombre), usuarios:creado_por(username))
        `)
        .in("tipo_id", [4, 5]); // Avance 1 y 2

    if (error) {
        console.error("Error cargarAvances", error);
        avances = [];
        return;
    }

    avances = data ?? [];
}

async function cargarInformeFinal() {
    const { data, error } = await supabase
        .from("avances")
        .select(`
            id, proyecto_id, tipo_id, archivo_url, ruta_storage, enviado_en, estado,
            proyectos(id, titulo, tipo_id, tipos_proyecto(nombre), usuarios:creado_por(username))
        `)
        .eq("tipo_id", 10); // Informe final

    if (error) {
        console.error("Error cargarInformeFinal", error);
        informes = [];
        return;
    }

    informes = data ?? [];
}

/* =======================================================
   ÚLTIMA EVALUACIÓN
======================================================= */
function getUltimaEvaluacion(avanceId) {
    const lista = evaluaciones.filter(e => e.avance_id === avanceId);
    if (lista.length === 0) return null;
    return lista.sort(
        (a, b) => new Date(b.fecha_evaluacion) - new Date(a.fecha_evaluacion)
    )[0];
}

/* =======================================================
   HELPERS PARA ARCHIVOS
======================================================= */
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
    if (ruta_storage) {
        const { data, error } = await supabase.storage
            .from("archivos")
            .createSignedUrl(ruta_storage, 3600);

        if (!error && data?.signedUrl) {
            return data.signedUrl;
        }
    }

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
   RENDER TABLAS
======================================================= */
function renderizarProyectos() {
    const tbody = document.getElementById("tbodyProyectosJefe");
    tbody.innerHTML = proyectos
        .map(p => `
            <tr>
                <td>${p.usuarios?.username ?? "-"}</td>
                <td>${p.titulo}</td>
                <td>${p.tipos_proyecto?.nombre ?? "-"}</td>
                <td>${p.lineas_investigacion?.nombre ?? "-"}</td>
                <td>${p.estado}</td>
                <td>
                    <button data-action="verProyecto" data-id="${p.id}" class="btn-ver">
                        <i class="fa fa-eye"></i> Ver
                    </button>
                </td>
            </tr>
        `)
        .join("");
}

function renderizarPerfilProyecto() {
    const tbody = document.getElementById("tbodyPerfilProyecto");
    tbody.innerHTML = perfiles
        .map(a => {
            const ev = getUltimaEvaluacion(a.id);
            return `
            <tr>
                <td>${a.proyectos?.usuarios.username ?? "-"}</td>
                <td>${a.proyectos?.titulo ?? "-"}</td>
                <td>
                    <button data-action="verArchivo"
                            data-ruta="${a.ruta_storage ?? ""}"
                            data-url="${a.archivo_url ?? ""}"
                            class="btn-ver">
                        <i class="fa fa-eye"></i> Ver
                    </button>
                </td>
                <td>${a.estado ?? "-"}</td>
                <td>${ev?.nota ?? "-"}</td>
                <td>${ev?.observaciones ?? "-"}</td>
                <td>
                    <button data-action="evaluarPerfil" data-id="${a.id}" class="btn-evaluar">
                        <i class="fa fa-edit"></i> Evaluar
                    </button>
                    <button data-action="imprimirAvance" data-id="${a.id}" class="btn-print">
                        <i class="fa fa-print"></i> Reporte
                    </button>
                </td>
            </tr>`;
        })
        .join("");
}

function renderizarAvances() {
    const tbody = document.getElementById("tbodyAvancesJefe");
    tbody.innerHTML = avances
        .map(a => `
            <tr>
                <td>Avance ${a.tipo_id === 4 ? 1 : 2}</td>
                <td>${a.proyectos?.titulo ?? "-"}</td>
                <td>${a.proyectos?.usuarios.username ?? "-"}</td>
                <td>
                    <button data-action="verArchivo"
                            data-ruta="${a.ruta_storage ?? ""}"
                            data-url="${a.archivo_url ?? ""}"
                            class="btn-ver">
                        <i class="fa fa-eye"></i> Ver
                    </button>
                </td>
                <td>${a.enviado_en ? new Date(a.enviado_en).toLocaleString() : "-"}</td>
                <td>${a.estado ?? "-"}</td>
                <td>
                    <button data-action="imprimirAvance" data-id="${a.id}" class="btn-print">
                        <i class="fa fa-print"></i> Reporte
                    </button>
                </td>
            </tr>
        `)
        .join("");
}

function renderizarInformeFinal() {
    const tbody = document.getElementById("tbodyInformeFinal");
    tbody.innerHTML = informes
        .map(a => {
            const ev = getUltimaEvaluacion(a.id);
            return `
            <tr>
                <td>${a.proyectos?.titulo ?? "-"}</td>
                <td>${a.proyectos?.usuarios.username ?? "-"}</td>
                <td>
                    <button data-action="verArchivo"
                            data-ruta="${a.ruta_storage ?? ""}"
                            data-url="${a.archivo_url ?? ""}"
                            class="btn-ver">
                        <i class="fa fa-eye"></i> Ver
                    </button>
                </td>
                <td>${a.estado ?? "-"}</td>
                <td>${ev?.nota ?? "-"}</td>
                <td>${ev?.observaciones ?? "-"}</td>
                <td>
                    <button data-action="evaluarInforme" data-id="${a.id}" class="btn-evaluar">
                        <i class="fa fa-edit"></i> Evaluar
                    </button>
                    <button data-action="imprimirAvance" data-id="${a.id}" class="btn-print">
                        <i class="fa fa-print"></i> Reporte
                    </button>
                </td>
            </tr>`;
        })
        .join("");
}

/* =======================================================
   REPORTE DE EVALUACIÓN (IMPRIMIR)
======================================================= */
async function imprimirReportePorAvance(avanceId) {
    let avance =
        perfiles.find(a => a.id == avanceId) ||
        avances.find(a => a.id == avanceId) ||
        informes.find(a => a.id == avanceId);

    if (!avance) {
        if (window.Swal) {
            Swal.fire("Error", "No se encontró el avance.", "error");
        } else {
            alert("No se encontró el avance.");
        }
        return;
    }

    const proyecto = proyectos.find(p => p.id === avance.proyecto_id);
    const ev = getUltimaEvaluacion(avance.id);

    const archivoURL = await obtenerUrlArchivoValida({
        ruta_storage: avance.ruta_storage,
        archivo_url: avance.archivo_url
    });

    const w = window.open("", "_blank");

    w.document.write(`
        <html>
        <head>
            <title>Reporte de evaluación de proyecto</title>
            <style>
                body { font-family: Arial, Helvetica, sans-serif; padding: 25px; }
                h1 { text-align:center; margin-bottom:30px; }
                h2 { margin-top:32px; margin-bottom:10px; }
                p  { font-size: 14px; line-height: 1.6; margin:4px 0; }
                .seccion { margin-bottom: 18px; }
                .label { font-weight:bold; }
                .panel-archivo {
                    margin-top: 12px;
                    padding: 10px;
                    border: 1px solid #ccc;
                    border-radius: 6px;
                    font-size: 13px;
                    background: #fafafa;
                }
                .link-archivo {
                    word-break: break-all;
                }
            </style>
        </head>

        <body>
            <h1>REPORTE DE EVALUACIÓN DE PROYECTO</h1>

            <div class="seccion">
                <h2>Datos del proyecto</h2>
                <p><span class="label">Proyecto:</span> ${proyecto?.titulo ?? "-"}</p>
                <p><span class="label">Docente responsable:</span> ${proyecto?.usuarios?.username ?? "-"}</p>
                <p><span class="label">Tipo de proyecto:</span> ${proyecto?.tipos_proyecto?.nombre ?? "-"}</p>
                <p><span class="label">Línea de investigación:</span> ${proyecto?.lineas_investigacion?.nombre ?? "-"}</p>
                <p><span class="label">Estado:</span> ${proyecto?.estado ?? "-"}</p>
                <p><span class="label">Fecha de inicio:</span> ${proyecto?.fecha_inicio ?? "-"}</p>
                <p><span class="label">Fecha de término:</span> ${proyecto?.fecha_fin ?? "-"}</p>
            </div>

            <div class="seccion">
                <h2>Resumen del avance</h2>
                <p><span class="label">Tipo de avance:</span> ${
                    avance.tipo_id === 3 ? "Perfil de proyecto" :
                    avance.tipo_id === 4 ? "Avance 1" :
                    avance.tipo_id === 5 ? "Avance 2" :
                    avance.tipo_id === 10 ? "Informe final" :
                    avance.tipo_id ?? "-"
                }</p>
                <p><span class="label">Fecha de envío:</span> ${
                    avance.enviado_en ? new Date(avance.enviado_en).toLocaleString() : "-"
                }</p>
                <p><span class="label">Estado del avance:</span> ${avance.estado ?? "-"}</p>
                <div class="panel-archivo">
                    <p><span class="label">Nombre del archivo:</span> ${
                        avance.archivo_url
                            ? avance.archivo_url.split("/").pop().split("?")[0]
                            : "-"
                    }</p>
                    <p class="link-archivo"><span class="label">Enlace de descarga:</span> ${
                        archivoURL ? archivoURL : "-"
                    }</p>
                </div>
            </div>

            <div class="seccion">
                <h2>Contenido del proyecto</h2>
                <p><span class="label">Objetivo general:</span> ${proyecto?.objetivo_general ?? "-"}</p>
                <p><span class="label">Beneficiarios:</span> ${proyecto?.beneficiarios ?? "-"}</p>
                <p><span class="label">Localización:</span> ${proyecto?.localizacion ?? "-"}</p>
            </div>

            <div class="seccion">
                <h2>Resultado de la evaluación</h2>
                <p><span class="label">Puntaje obtenido:</span> ${ev?.nota ?? "-"}</p>
                <p><span class="label">Estado:</span> ${ev?.estado ?? "-"}</p>
                <p><span class="label">Observaciones del evaluador:</span> ${
                    ev?.observaciones ?? "Sin observaciones registradas."
                }</p>
            </div>

            <div class="seccion">
                <h2>Archivo evaluado</h2>
                <p>Para revisar el archivo completo, utilice el siguiente enlace (o cópielo en su navegador):</p>
                <p class="link-archivo">${
                    archivoURL ? archivoURL : "No se encontró el archivo."
                }</p>
            </div>
        </body>
        </html>
    `);

    w.document.close();
    w.print();
}

/* =======================================================
   VISOR DE ARCHIVOS
======================================================= */
async function visorArchivo(ruta_storage, archivo_url) {
    const urlFinal = await obtenerUrlArchivoValida({ ruta_storage, archivo_url });

    if (!urlFinal) {
        if (window.Swal) {
            Swal.fire(
                "Archivo no disponible",
                "El archivo no se encontró o su enlace ha expirado.",
                "warning"
            );
        } else {
            alert("Archivo no disponible.");
        }
        return;
    }

    const iframeSrc = construirIframeSrc(urlFinal);

    const iframe = document.getElementById("visorIframe");
    const modal = document.getElementById("modalVisor");

    iframe.src = iframeSrc;
    modal.style.display = "flex";
}

function cerrarVisor() {
    const iframe = document.getElementById("visorIframe");
    iframe.src = "";
    document.getElementById("modalVisor").style.display = "none";
}

/* =======================================================
   DETALLE PROYECTO
======================================================= */
function mostrarProyecto(idProyecto) {
    const p = proyectos.find(x => x.id == idProyecto);
    if (!p) return;

    const html = `
        <p><strong>Título:</strong> ${p.titulo}</p>
        <p><strong>Tipo:</strong> ${p.tipos_proyecto?.nombre ?? "-"}</p>
        <p><strong>Línea:</strong> ${p.lineas_investigacion?.nombre ?? "-"}</p>
        <p><strong>Estado:</strong> ${p.estado}</p>
        <p><strong>Inicio:</strong> ${p.fecha_inicio ?? "-"}</p>
        <p><strong>Fin:</strong> ${p.fecha_fin ?? "-"}</p>
        <p><strong>Objetivo:</strong> ${p.objetivo_general ?? "-"}</p>
        <p><strong>Beneficiarios:</strong> ${p.beneficiarios ?? "-"}</p>
        <p><strong>Localización:</strong> ${p.localizacion ?? "-"}</p>
    `;

    document.getElementById("detalleProyectoContenido").innerHTML = html;
    document.getElementById("modalProyecto").style.display = "flex";
}

function imprimirProyecto() {
    const contenido = document.getElementById("detalleProyectoContenido").innerHTML;

    const w = window.open("", "_blank");

    w.document.write(`
        <html>
        <head>
            <title>Proyecto</title>
            <style>
                body { font-family: Arial; padding: 25px; }
                h1 { text-align:center; }
                p { font-size: 16px; }
            </style>
        </head>
        <body>
            <h1>PROYECTO</h1>
            ${contenido}
        </body>
        </html>
    `);

    w.document.close();
    w.print();
}

/* =======================================================
   ANEXOS
======================================================= */
const MAPA_ANEXOS = {
    perfil: {
        1: "Anexo01_ProyectoInvestAplicada.html",
        2: "Anexo02_ProyectoInnovaTecnologica.html",
        3: "Anexo03_ProyectoInnovaPedagogica.html"
    },
    informe: {
        1: "Anexo04_InformeFinalInvestAplicada.html",
        2: "Anexo05_InformeFinalInnovTecnologica.html",
        3: "Anexo06_InformeFinalInnovPedadogica.html"
    }
};

/* =======================================================
   MODAL EVALUACIÓN (FORM + ARCHIVO)
======================================================= */
async function evaluarAvanceModal(avanceId, tipoAvance) {
    AVANCE_ACTUAL = avanceId;
    TIPO_AVANCE_ACTUAL = tipoAvance; // "perfil" | "informe"

    const avance =
        tipoAvance === "perfil"
            ? perfiles.find(x => x.id == avanceId)
            : informes.find(x => x.id == avanceId);

    if (!avance) {
        if (window.Swal) {
            Swal.fire("Error", "No se encontró el avance.", "error");
        } else {
            alert("No se encontró el avance.");
        }
        return;
    }

    const proyecto = proyectos.find(p => p.id === avance.proyecto_id);
    const archivoAnexo = MAPA_ANEXOS[tipoAvance]?.[proyecto?.tipo_id];

    if (!archivoAnexo) {
        if (window.Swal) {
            Swal.fire(
                "Sin anexo",
                "No se encontró el formato de evaluación para este tipo de proyecto.",
                "warning"
            );
        } else {
            alert("No se encontró el formato de evaluación para este tipo de proyecto.");
        }
        return;
    }

    const urlFinal = await obtenerUrlArchivoValida({
        ruta_storage: avance.ruta_storage,
        archivo_url: avance.archivo_url
    });
    const iframeSrcProyecto = construirIframeSrc(urlFinal ?? "");

    const modal = document.getElementById("modalEvaluacion");
    const modalContent = modal.querySelector(".modal-content");
    modalContent.style.maxWidth = "1200px";
    modalContent.style.width = "95%";

    document.getElementById("contenidoEvaluacion").innerHTML = `
        <div style="display:flex; gap:16px; height:70vh; max-height:70vh;">
            <div style="flex:1; display:flex; flex-direction:column; min-width:0;">
                <h3 style="margin-top:0; margin-bottom:10px;">Formulario de evaluación</h3>
                <iframe
                    src="../Vistas/${archivoAnexo}"
                    style="flex:1; width:100%; border:1px solid #ddd; border-radius:6px; background:#fff;"
                ></iframe>
            </div>

            <div style="flex:1; display:flex; flex-direction:column; min-width:0;">
                <h3 style="margin-top:0; margin-bottom:10px;">Archivo del proyecto</h3>
                ${
                    iframeSrcProyecto
                        ? `<iframe
                               src="${iframeSrcProyecto}"
                               style="flex:1; width:100%; border:1px solid #ddd; border-radius:6px; background:#fff;"
                           ></iframe>
                           <p style="margin-top:6px; font-size:12px;">
                               Si el archivo no se visualiza correctamente, puede abrirlo
                               <a href="${urlFinal}" target="_blank">en una nueva pestaña</a>.
                           </p>`
                        : `<p style="font-size:13px;">No se encontró el archivo asociado al avance.</p>`
                }
            </div>
        </div>
    `;

    document.getElementById("modalEvaluacion").style.display = "flex";
}

function cerrarModalEvaluacion() {
    document.getElementById("contenidoEvaluacion").innerHTML = "";
    document.getElementById("modalEvaluacion").style.display = "none";
}

window.cerrarModalEvaluacion = cerrarModalEvaluacion;

/* =======================================================
   LÓGICA DE ESTADO SEGÚN ANEXO (PUNTAJES ORIGINALES)
======================================================= */
/**
 * Determina qué ANEXO corresponde según tipo de avance
 * y tipo de proyecto (1,2,3).
 *
 * - Perfil:
 *      tipo_proyecto 1 -> Anexo 1
 *      tipo_proyecto 2 -> Anexo 2
 *      tipo_proyecto 3 -> Anexo 3
 * - Informe final:
 *      tipo_proyecto 1 -> Anexo 4
 *      tipo_proyecto 2 -> Anexo 5
 *      tipo_proyecto 3 -> Anexo 6
 */
function obtenerNumeroAnexo(tipoAvance, tipoProyectoId) {
    if (tipoAvance === "perfil") {
        if (tipoProyectoId === 1) return 1;
        if (tipoProyectoId === 2) return 2;
        if (tipoProyectoId === 3) return 3;
    }

    if (tipoAvance === "informe") {
        if (tipoProyectoId === 1) return 4;
        if (tipoProyectoId === 2) return 5;
        if (tipoProyectoId === 3) return 6;
    }

    return null;
}

/**
 * Devuelve "aprobado" / "desaprobado" según Anexo y puntaje ORIGINAL (suma de ítems "Sí").
 * Rangos basados en tu evaluar_formulario.js y tu explicación:
 *
 * ANEXO 01 – 35 ítems:
 *   25–35: Bueno (Aprobado)
 *   16–24: Regular (Desaprobado)
 *   0–15 : Malo   (Desaprobado)
 *
 * ANEXO 02 – 29 ítems:
 *   20–29: Bueno (Aprobado)
 *   11–19: Regular (Desaprobado)
 *   0–10 : Malo   (Desaprobado)
 *
 * ANEXO 03 – 27 ítems:
 *   20–27: Bueno (Aprobado)
 *   11–19: Regular (Desaprobado)
 *   0–10 : Malo   (Desaprobado)
 *
 * ANEXO 04 – 47 ítems:
 *   33–47: Bueno (Aprobado)
 *   22–32: Regular (Desaprobado)
 *   0–21 : Malo   (Desaprobado)
 *
 * ANEXO 05 – 40 ítems:
 *   28–40: Bueno (Aprobado)
 *   15–27: Regular (Desaprobado)
 *   0–14 : Malo   (Desaprobado)
 *
 * ANEXO 06 – 38 ítems:
 *   27–38: Bueno (Aprobado)
 *   14–26: Regular (Desaprobado)
 *   0–13 : Malo   (Desaprobado)
 */
function obtenerEstadoSegunAnexo(anexoNumero, puntaje) {
    if (anexoNumero === 1) {
        return puntaje >= 25 ? "aprobado" : "desaprobado";
    }

    if (anexoNumero === 2) {
        return puntaje >= 20 ? "aprobado" : "desaprobado";
    }

    if (anexoNumero === 3) {
        return puntaje >= 20 ? "aprobado" : "desaprobado";
    }

    if (anexoNumero === 4) {
        return puntaje >= 33 ? "aprobado" : "desaprobado";
    }

    if (anexoNumero === 5) {
        return puntaje >= 28 ? "aprobado" : "desaprobado";
    }

    if (anexoNumero === 6) {
        return puntaje >= 27 ? "aprobado" : "desaprobado";
    }

    // Fallback por si algo raro pasa
    return puntaje >= 11 ? "aprobado" : "desaprobado";
}

/* =======================================================
   POSTMESSAGE (RECIBE PUNTAJE DESDE EL ANEXO)
======================================================= */
function inicializarPostMessage() {
    window.addEventListener("message", async (e) => {
        if (!e.data || e.data.tipo !== "evaluacion") return;

        // En los ANEXOS, "nota" es el PUNTAJE ORIGINAL (suma de ítems "Sí")
        const puntajeOriginal = Number(e.data.nota);
        let observaciones = e.data.observaciones;

        if (isNaN(puntajeOriginal)) {
            console.error("Puntaje original inválido recibido desde el anexo:", e.data);
            return;
        }

        // Buscar el avance que se está evaluando
        const avance =
            TIPO_AVANCE_ACTUAL === "perfil"
                ? perfiles.find(x => x.id == AVANCE_ACTUAL)
                : informes.find(x => x.id == AVANCE_ACTUAL);

        if (!avance) {
            console.error("No se encontró el avance a evaluar");
            return;
        }

        const tipoProyectoId = avance.proyectos?.tipo_id;
        const numeroAnexo = obtenerNumeroAnexo(TIPO_AVANCE_ACTUAL, tipoProyectoId);

        const estadoCalculado = numeroAnexo
            ? obtenerEstadoSegunAnexo(numeroAnexo, puntajeOriginal)
            : (puntajeOriginal >= 11 ? "aprobado" : "desaprobado");

        if (!observaciones || observaciones.trim() === "") {
            observaciones =
                estadoCalculado === "aprobado"
                    ? "Proyecto aprobado según los criterios establecidos."
                    : "Proyecto desaprobado. Se recomienda revisar los criterios no cumplidos.";
        }

        // Guardar en evaluaciones_avances:
        //  - nota  = puntaje ORIGINAL
        //  - estado = según rangos por ANEXO
        const { error: insertError } = await supabase
            .from("evaluaciones_avances")
            .insert({
                avance_id: AVANCE_ACTUAL,
                evaluador_id: usuario.id,
                nota: puntajeOriginal,
                observaciones,
                estado: estadoCalculado
            });

        if (insertError) {
            console.error("Error insertando evaluación:", insertError);
            if (window.Swal) {
                Swal.fire("Error", "No se pudo guardar la evaluación.", "error");
            } else {
                alert("No se pudo guardar la evaluación.");
            }
            return;
        }

        // Actualizar estado del avance al mismo estado (aprobado / desaprobado)
        const { error: updateError } = await supabase
            .from("avances")
            .update({ estado: estadoCalculado })
            .eq("id", AVANCE_ACTUAL);

        if (updateError) {
            console.error("Error actualizando estado del avance:", updateError);
        }

        cerrarModalEvaluacion();
        await inicializar();
    });
}

/* =======================================================
   EVENTOS GLOBALES
======================================================= */
function inicializarEventosGlobales() {
    document.addEventListener("click", async e => {
        const btn = e.target.closest("button");
        if (!btn) return;

        const action = btn.dataset.action;

        if (action === "verArchivo") {
            return visorArchivo(btn.dataset.ruta, btn.dataset.url);
        }

        if (action === "verProyecto") {
            return mostrarProyecto(btn.dataset.id);
        }

        if (action === "evaluarPerfil") {
            return evaluarAvanceModal(btn.dataset.id, "perfil");
        }

        if (action === "evaluarInforme") {
            return evaluarAvanceModal(btn.dataset.id, "informe");
        }

        if (action === "imprimirAvance") {
            return imprimirReportePorAvance(btn.dataset.id);
        }
    });

    document.getElementById("btnCerrarVisor").onclick = cerrarVisor;

    document.getElementById("btnCerrarProyecto").onclick = () => {
        document.getElementById("modalProyecto").style.display = "none";
    };

    document.getElementById("btnImprimirProyecto").onclick = imprimirProyecto;
}

/* =======================================================
   CERRAR SESIÓN
======================================================= */
document.getElementById("btnCerrarSesion").onclick = () => {
    localStorage.removeItem("usuario");
    window.location.href = "login.html";
};
