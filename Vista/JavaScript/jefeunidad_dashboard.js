import { supabase } from "../../Modelo/supabase.js";

let usuario = JSON.parse(localStorage.getItem("usuario"));
if (!usuario) window.location.href = "login.html";
document.getElementById("nombreJefeNavbar").textContent = usuario.username ?? "-";

let proyectos = [];
let perfiles = [];
let avances = [];
let informes = [];
let evaluaciones = [];
let AVANCE_ACTUAL = null;
let TIPO_AVANCE_ACTUAL = null;

inicializar();

async function inicializar() {
    const { data: ev } = await supabase.from("evaluaciones_avances").select("*");
    evaluaciones = ev ?? [];

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

    inicializarEventosGlobales();
    inicializarPostMessage();
    inicializarDataTables();
}

function inicializarDataTables() {
    setTimeout(() => {
        $("#tablaProyectosJefe").DataTable();
        $("#tablaPerfilProyecto").DataTable();
        $("#tablaAvancesJefe").DataTable();
        $("#tablaInformeFinal").DataTable();
    }, 300);
}

async function cargarProyectos() {
    const { data } = await supabase
        .from("proyectos")
        .select(`
            id, titulo, tipo_id, estado, objetivo_general, beneficiarios, localizacion,
            usuarios:creado_por(username),
            tipos_proyecto(nombre),
            lineas_investigacion(nombre)
        `);
    proyectos = data ?? [];
}

async function cargarPerfilProyecto() {
    const { data } = await supabase
        .from("avances")
        .select(`
            id, proyecto_id, tipo_id, archivo_url, enviado_en, estado,
            proyectos(id, titulo, tipo_id, tipos_proyecto(nombre), usuarios:creado_por(username))
        `)
        .eq("tipo_id", 3);
    perfiles = data ?? [];
}

async function cargarAvances() {
    const { data } = await supabase
        .from("avances")
        .select(`
            id, proyecto_id, tipo_id, archivo_url, enviado_en, estado,
            proyectos(id, titulo, tipo_id, tipos_proyecto(nombre), usuarios:creado_por(username))
        `)
        .not("tipo_id", "in", "(3,10)");
    avances = data ?? [];
}

async function cargarInformeFinal() {
    const { data } = await supabase
        .from("avances")
        .select(`
            id, proyecto_id, tipo_id, archivo_url, enviado_en, estado,
            proyectos(id, titulo, tipo_id, tipos_proyecto(nombre), usuarios:creado_por(username))
        `)
        .eq("tipo_id", 10);
    informes = data ?? [];
}

function getUltimaEvaluacion(avanceId) {
    const lista = evaluaciones.filter(e => e.avance_id === avanceId);
    if (lista.length === 0) return null;
    return lista.sort((a, b) => new Date(b.fecha_evaluacion) - new Date(a.fecha_evaluacion))[0];
}

function renderizarProyectos() {
    const tbody = document.getElementById("tbodyProyectosJefe");
    tbody.innerHTML = "";
    proyectos.forEach(p => {
        tbody.innerHTML += `
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
            </tr>`;
    });
}

function renderizarPerfilProyecto() {
    const tbody = document.getElementById("tbodyPerfilProyecto");
    tbody.innerHTML = "";
    perfiles.forEach(a => {
        const ev = getUltimaEvaluacion(a.id);
        tbody.innerHTML += `
            <tr>
                <td>${a.proyectos?.usuarios.username ?? "-"}</td>
                <td>${a.proyectos?.titulo ?? "-"}</td>
                <td>
                    <button data-action="verArchivo" data-url="${a.archivo_url}" class="btn-ver">
                        <i class="fa fa-eye"></i> Ver
                    </button>
                </td>
                <td>${a.estado}</td>
                <td>${ev?.nota ?? "-"}</td>
                <td>${ev?.observaciones ?? "-"}</td>
                <td>
                    <button data-action="evaluarPerfil" data-id="${a.id}" class="btn-evaluar">
                        <i class="fa fa-edit"></i> Evaluar
                    </button>
                </td>
            </tr>`;
    });
}

function renderizarAvances() {
    const tbody = document.getElementById("tbodyAvancesJefe");
    tbody.innerHTML = "";
    avances.forEach(a => {
        tbody.innerHTML += `
            <tr>
                <td>Avance ${a.tipo_id}</td>
                <td>${a.proyectos?.titulo ?? "-"}</td>
                <td>${a.proyectos?.usuarios.username ?? "-"}</td>
                <td>
                    <button data-action="verArchivo" data-url="${a.archivo_url}" class="btn-ver">
                        <i class="fa fa-eye"></i> Ver
                    </button>
                </td>
                <td>${new Date(a.enviado_en).toLocaleString()}</td>
                <td>-</td>
                <td>
                    <button class="btn-disabled" disabled>
                        <i class="fa fa-ban"></i> No evaluable
                    </button>
                </td>
            </tr>`;
    });
}

function renderizarInformeFinal() {
    const tbody = document.getElementById("tbodyInformeFinal");
    tbody.innerHTML = "";
    informes.forEach(a => {
        const ev = getUltimaEvaluacion(a.id);
        tbody.innerHTML += `
            <tr>
                <td>${a.proyectos?.titulo ?? "-"}</td>
                <td>${a.proyectos?.usuarios.username ?? "-"}</td>
                <td>
                    <button data-action="verArchivo" data-url="${a.archivo_url}" class="btn-ver">
                        <i class="fa fa-eye"></i> Ver
                    </button>
                </td>
                <td>${a.estado}</td>
                <td>${ev?.nota ?? "-"}</td>
                <td>${ev?.observaciones ?? "-"}</td>
                <td>
                    <button data-action="evaluarInforme" data-id="${a.id}" class="btn-evaluar">
                        <i class="fa fa-edit"></i> Evaluar
                    </button>
                </td>
            </tr>`;
    });
}

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

function evaluarAvanceModal(avanceId, tipoAvance) {
    AVANCE_ACTUAL = avanceId;
    TIPO_AVANCE_ACTUAL = tipoAvance;

    const avance =
        tipoAvance === "perfil"
            ? perfiles.find(x => x.id == avanceId)
            : informes.find(x => x.id == avanceId);

    const proyecto = proyectos.find(p => p.id === avance.proyecto_id);
    const archivoAnexo = MAPA_ANEXOS[tipoAvance]?.[proyecto.tipo_id];

    document.getElementById("contenidoEvaluacion").innerHTML = `
        <iframe src="../Vistas/${archivoAnexo}"
            style="width:100%;height:380px;border:1px solid #ccc;border-radius:6px;">
        </iframe>
    `;

    document.getElementById("modalEvaluacion").style.display = "flex";
}

function inicializarPostMessage() {
    window.addEventListener("message", async (e) => {
        if (!e.data || e.data.tipo !== "evaluacion") return;

        const { nota, observaciones } = e.data;

        await supabase.from("evaluaciones_avances").insert({
            avance_id: AVANCE_ACTUAL,
            evaluador_id: usuario.id,
            nota,
            observaciones,
            estado: nota >= 11 ? "aprobado" : "desaprobado"
        });

        await supabase.from("avances")
            .update({ estado: "evaluado" })
            .eq("id", AVANCE_ACTUAL);

        cerrarModalEvaluacion();
        await inicializar();
    });
}

function cerrarModalEvaluacion() {
    document.getElementById("modalEvaluacion").style.display = "none";
    document.getElementById("contenidoEvaluacion").innerHTML = "";
}
window.cerrarModalEvaluacion = cerrarModalEvaluacion;

function inicializarEventosGlobales() {
    document.addEventListener("click", e => {
        const btn = e.target.closest("button");
        if (!btn) return;

        const action = btn.dataset.action;

        switch (action) {
            case "verArchivo":
                visorArchivo(btn.dataset.url);
                break;
            case "verProyecto":
                mostrarProyecto(btn.dataset.id);
                break;
            case "evaluarPerfil":
                evaluarAvanceModal(btn.dataset.id, "perfil");
                break;
            case "evaluarInforme":
                evaluarAvanceModal(btn.dataset.id, "informe");
                break;
        }
    });

    document.getElementById("btnCerrarVisor").onclick = cerrarVisor;
}

function visorArchivo(url) {
    document.getElementById("visorIframe").src = url;
    document.getElementById("modalVisor").style.display = "flex";
}

function cerrarVisor() {
    document.getElementById("visorIframe").src = "";
    document.getElementById("modalVisor").style.display = "none";
}

function mostrarProyecto(id) {
    const p = proyectos.find(x => x.id == id);
    Swal.fire({
        title: p.titulo,
        html: `
            <b>Tipo:</b> ${p.tipos_proyecto?.nombre ?? "-"}<br>
            <b>Línea:</b> ${p.lineas_investigacion?.nombre ?? "-"}<br>
            <b>Objetivo general:</b><br>${p.objetivo_general}<br><br>
            <b>Beneficiarios:</b><br>${p.beneficiarios}
        `,
        icon: "info"
    });
}

document.getElementById("btnCerrarSesion").onclick = () => {
    localStorage.removeItem("usuario");
    window.location.href = "login.html";
};
