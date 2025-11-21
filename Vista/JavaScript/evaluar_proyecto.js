import { supabase } from "../../Modelo/supabase.js";

const url = new URL(window.location.href);
const proyectoID = url.searchParams.get("id");

document.addEventListener("DOMContentLoaded", () => {
    cargarProyecto();
});

async function cargarProyecto() {
    const { data, error } = await supabase
        .from("vista_proyectos_detalle")
        .select("*")
        .eq("id", proyectoID)
        .single();

    if (error) {
        console.log("Error cargando proyecto", error);
        return;
    }

    document.getElementById("titulo").textContent = data.titulo;
    document.getElementById("tipo").textContent = data.tipo_nombre;
    document.getElementById("linea").textContent = data.linea_nombre;
    document.getElementById("objetivo").textContent = data.objetivo_general;
    document.getElementById("beneficiarios").textContent = data.beneficiarios;
    document.getElementById("inicio").textContent = data.fecha_inicio;
    document.getElementById("fin").textContent = data.fecha_fin;
    document.getElementById("creador").textContent = data.creador_nombre;

    document.getElementById("archivoLink").href = data.archivo_url;
}

document.getElementById("formEvaluacion").addEventListener("submit", async e => {
    e.preventDefault();

    const formData = new FormData(e.target);

    const evalData = {
        proyecto_id: proyectoID,
        item1: Number(formData.get("item1")),
        item2: Number(formData.get("item2")),
        item3: Number(formData.get("item3")),
        item4: Number(formData.get("item4")),
        item5: Number(formData.get("item5")),
        item6: Number(formData.get("item6")),
        item7: Number(formData.get("item7")),
    };

    evalData.total = evalData.item1 + evalData.item2 + evalData.item3 + evalData.item4 + evalData.item5 + evalData.item6 + evalData.item7;

    const { error } = await supabase.from("evaluaciones_proyecto").insert([evalData]);

    if (error) {
        alert("Error al guardar evaluación");
        console.log(error);
        return;
    }

    alert("Evaluación guardada correctamente");

});

import { supabase } from "../../Modelo/supabase.js";

const proyectoId = new URLSearchParams(window.location.search).get("id");

// ============================
// CARGAR DATOS DEL PROYECTO
// ============================
async function cargarProyecto() {
    const { data, error } = await supabase
        .from("vista_proyectos_detalle")
        .select("*")
        .eq("id", proyectoId)
        .single();

    if (error) {
        console.error("Error al cargar proyecto:", error);
        return;
    }

    document.getElementById("p_titulo").textContent = data.titulo;
    document.getElementById("p_tipo").textContent = data.tipo_nombre;
    document.getElementById("p_linea").textContent = data.linea_nombre;
    document.getElementById("p_objetivo").textContent = data.objetivo_general;
    document.getElementById("p_beneficiarios").textContent = data.beneficiarios;
    document.getElementById("p_inicio").textContent = data.fecha_inicio;
    document.getElementById("p_fin").textContent = data.fecha_fin;
    document.getElementById("p_estado").textContent = data.estado;
}

cargarProyecto();

// ============================
// GUARDAR EVALUACIÓN
// ============================
document.getElementById("formEvaluacion").addEventListener("submit", async (e) => {
    e.preventDefault();

    // Sumatoria de criterios
    const form = new FormData(e.target);
    let suma = 0;
    for (let i = 1; i <= 7; i++) suma += parseInt(form.get("c" + i));

    const notaFinal = Math.round((suma / 7) * 20);
    const estadoFinal = notaFinal >= 11 ? "aprobado" : "desaprobado";

    const evaluacion = {
        proyecto_id: proyectoId,
        evaluador_id: localStorage.getItem("usuario_id"),
        nota: notaFinal,
        estado: estadoFinal,
        observaciones: form.get("observaciones"),
    };

    const { error } = await supabase
        .from("evaluaciones_proyecto")
        .insert(evaluacion);

    if (error) {
        alert("Error al guardar evaluación");
        console.error(error);
        return;
    }

    alert(`Evaluación registrada con éxito. Nota: ${notaFinal}`);
    window.location.href = "dashboard_jefe.html";
});


