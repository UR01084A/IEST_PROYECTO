import { supabase } from "../../Modelo/supabase.js";

// ==============================
// CARGAR TIPOS DE PROYECTO
// ==============================
async function cargarTiposProyecto() {
    const { data, error } = await supabase.from("tipos_proyecto").select("*");

    const select = document.getElementById("tipoProyecto");
    select.innerHTML = "";

    if (error) {
        alert("Error cargando tipos de proyecto");
        return;
    }

    data.forEach(t => {
        const option = document.createElement("option");
        option.value = t.id;
        option.textContent = t.nombre;
        select.appendChild(option);
    });
}

// ==============================
// CARGAR LÍNEAS DE INVESTIGACIÓN
// ==============================
async function cargarLineasInvestigacion() {
    const { data, error } = await supabase.from("lineas_investigacion").select("*");

    const select = document.getElementById("lineaInvestigacion");
    select.innerHTML = "";

    if (error) {
        alert("Error cargando líneas de investigación");
        return;
    }

    data.forEach(l => {
        const option = document.createElement("option");
        option.value = l.id;
        option.textContent = l.nombre;
        select.appendChild(option);
    });
}

// ==============================
// GUARDAR PROYECTO
// ==============================
document.getElementById("formProyecto").addEventListener("submit", async (e) => {
    e.preventDefault();

    const usuario = JSON.parse(localStorage.getItem("usuario"));
    if (!usuario) {
        alert("Debe iniciar sesión.");
        return;
    }

    const datos = {
        titulo: document.getElementById("titulo").value,
        tipo_id: document.getElementById("tipoProyecto").value,
        linea_id: document.getElementById("lineaInvestigacion").value,
        objetivo_general: document.getElementById("objetivo_general").value,
        beneficiarios: document.getElementById("beneficiarios").value,
        fecha_inicio: document.getElementById("fecha_inicio").value,
        fecha_fin: document.getElementById("fecha_fin").value,
        creado_por: usuario.id
    };

    const { error } = await supabase.from("proyectos").insert([datos]);

    if (error) {
        console.error(error);
        alert("Error al registrar el proyecto.");
        return;
    }

    alert("Proyecto registrado correctamente");

    if (usuario.rol_id === 3) {
        window.location.href = "docente_dashboard.html";
    } else if (usuario.rol_id === 2) {
        window.location.href = "jefeunidad_dashboard.html";
    } else {
        window.location.href = "login.html";
    }
});

// ==============================
// BOTÓN LIMPIAR
// ==============================
document.getElementById("btnLimpiar").addEventListener("click", () => {
    document.getElementById("formProyecto").reset();
});

// ==============================
// INICIALIZACIÓN DE LA PÁGINA
// ==============================
cargarTiposProyecto();
cargarLineasInvestigacion();
