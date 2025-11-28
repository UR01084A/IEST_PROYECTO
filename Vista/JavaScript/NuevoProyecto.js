import { supabase } from "../../Modelo/supabase.js";

/* =======================================================
   UTILIDADES DE MENSAJES
======================================================= */
function mostrarMensaje(titulo, texto, icono = "info") {
    if (window.Swal) {
        Swal.fire(titulo, texto, icono);
    } else {
        alert(`${titulo}\n\n${texto}`);
    }
}

/**
 * Normaliza un texto:
 * - Quita espacios extra
 * - Trim
 * - Primera letra en mayúscula
 */
function normalizarTexto(str) {
    if (!str) return "";
    let limpio = str.replace(/\s+/g, " ").trim();
    if (!limpio) return "";
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/* =======================================================
   REFERENCIAS A ELEMENTOS
======================================================= */
const form = document.getElementById("formProyecto");
const inputTitulo = document.getElementById("titulo");
const selectTipo = document.getElementById("tipoProyecto");
const selectLinea = document.getElementById("lineaInvestigacion");
const txtIntegrantes = document.getElementById("integrantes");
const txtObjetivo = document.getElementById("objetivo_general");
const txtBeneficiarios = document.getElementById("beneficiarios");
const txtLocalizacion = document.getElementById("localizacion");
const inputFechaInicio = document.getElementById("fecha_inicio");
const inputFechaFin = document.getElementById("fecha_fin");
const btnRegistrar = document.getElementById("btnRegistrar");
const btnLimpiar = document.getElementById("btnLimpiar");

/* =======================================================
   ESTADO DE CARGA / BLOQUEO DE FORMULARIO
======================================================= */
function setFormBloqueado(bloqueado) {
    const elementos = [
        inputTitulo,
        selectTipo,
        selectLinea,
        txtIntegrantes,
        txtObjetivo,
        txtBeneficiarios,
        txtLocalizacion,
        inputFechaInicio,
        inputFechaFin,
        btnRegistrar,
        btnLimpiar
    ];

    elementos.forEach(el => {
        if (el) el.disabled = bloqueado;
    });

    if (btnRegistrar) {
        btnRegistrar.textContent = bloqueado ? "Guardando..." : "Registrar Proyecto";
    }
}

/* =======================================================
   CARGAR TIPOS DE PROYECTO
======================================================= */
async function cargarTiposProyecto() {
    if (!selectTipo) return;

    selectTipo.innerHTML = `<option value="">Cargando tipos de proyecto...</option>`;
    selectTipo.disabled = true;

    const { data, error } = await supabase
        .from("tipos_proyecto")
        .select("*")
        .order("nombre", { ascending: true });

    selectTipo.innerHTML = "";
    selectTipo.disabled = false;

    if (error) {
        console.error("Error cargando tipos_proyecto:", error);
        selectTipo.innerHTML = `<option value="">Error al cargar tipos</option>`;
        mostrarMensaje(
            "Error",
            "No se pudieron cargar los tipos de proyecto. Intente recargar la página.",
            "error"
        );
        return;
    }

    const optDefault = document.createElement("option");
    optDefault.value = "";
    optDefault.textContent = "Seleccione un tipo de proyecto";
    optDefault.disabled = true;
    optDefault.selected = true;
    selectTipo.appendChild(optDefault);

    (data || []).forEach(t => {
        const option = document.createElement("option");
        option.value = t.id;
        option.textContent = t.nombre;
        selectTipo.appendChild(option);
    });
}

/* =======================================================
   CARGAR LÍNEAS DE INVESTIGACIÓN
======================================================= */
async function cargarLineasInvestigacion() {
    if (!selectLinea) return;

    selectLinea.innerHTML = `<option value="">Cargando líneas...</option>`;
    selectLinea.disabled = true;

    const { data, error } = await supabase
        .from("lineas_investigacion")
        .select("*")
        .order("nombre", { ascending: true });

    selectLinea.innerHTML = "";
    selectLinea.disabled = false;

    if (error) {
        console.error("Error cargando lineas_investigacion:", error);
        selectLinea.innerHTML = `<option value="">Error al cargar líneas</option>`;
        mostrarMensaje(
            "Error",
            "No se pudieron cargar las líneas de investigación. Intente recargar la página.",
            "error"
        );
        return;
    }

    const optDefault = document.createElement("option");
    optDefault.value = "";
    optDefault.textContent = "Seleccione una línea de investigación";
    optDefault.disabled = true;
    optDefault.selected = true;
    selectLinea.appendChild(optDefault);

    (data || []).forEach(l => {
        const option = document.createElement("option");
        option.value = l.id;
        option.textContent = l.nombre;
        selectLinea.appendChild(option);
    });
}

/* =======================================================
   CONFIGURAR FECHAS (mínimos y coherencia)
======================================================= */
function configurarFechas() {
    if (!inputFechaInicio || !inputFechaFin) return;

    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    const hoyStr = `${yyyy}-${mm}-${dd}`;

    inputFechaInicio.min = hoyStr;
    inputFechaFin.min = hoyStr;

    inputFechaInicio.addEventListener("change", () => {
        if (!inputFechaInicio.value) return;
        inputFechaFin.min = inputFechaInicio.value;

        if (inputFechaFin.value && inputFechaFin.value < inputFechaInicio.value) {
            inputFechaFin.value = inputFechaInicio.value;
        }
    });
}

/* =======================================================
   FORMATO AUTOMÁTICO (SIN BLOQUEAR LA ESCRITURA)
======================================================= */

/** Aplica un formateador manteniendo, lo mejor posible, la posición del cursor */
function aplicarFormatoConCursor(campo, formateador) {
    const start = campo.selectionStart;
    const before = campo.value;
    const formatted = formateador(before);

    if (formatted === before) return;

    const diff = formatted.length - before.length;
    campo.value = formatted;

    const newPos = Math.max(0, start + diff);
    campo.setSelectionRange(newPos, newPos);
}

/** Formato para TÍTULO: Title Case (mayúscula inicial en cada palabra) */
function formatearTituloTexto(text) {
    if (!text) return "";

    let v = text;

    v = v.replace(/^\s+/, "");
    v = v.replace(/\s{2,}/g, " ");

    // palabras tipo "Sistema", "De", "Cámaras", etc. (soporta acentos)
    v = v.replace(/\b(\p{L})(\p{L}*)/gu, (m, first, rest) =>
        first.toUpperCase() + rest.toLowerCase()
    );

    return v;
}

/** Formato para LISTA DE NOMBRES/APELLIDOS (integrantes) */
function formatearNombresTexto(text) {
    if (!text) return "";

    const lineas = text.split("\n");

    const procesadas = lineas.map(linea => {
        let v = linea;

        v = v.replace(/\s{2,}/g, " ").trimStart();

        v = v.replace(/\b(\p{L})(\p{L}*)/gu, (m, first, rest) =>
            first.toUpperCase() + rest.toLowerCase()
        );

        return v;
    });

    return procesadas.join("\n");
}

/** 
 * Formato para PÁRRAFOS (objetivo, beneficiarios, localización)
 * - limpia espacios
 * - pone espacio correcto después de . ! ?
 * - SOLO sube a mayúscula el inicio de oración SI está en minúscula
 * - RESPETA las mayúsculas que tú escribas (siglas, nombres, instituciones, etc.)
 */
function formatearParrafoTexto(text) {
    if (!text) return "";

    let v = text;

    // Quitar espacios iniciales y múltiples espacios
    v = v.replace(/^\s+/, "");
    v = v.replace(/\s{2,}/g, " ");

    // Normalizar espacios alrededor de signos de puntuación
    v = v.replace(/\s*([.!?])\s*/g, "$1 ");

    // Poner mayúscula al inicio del texto y después de . ! ? solo si la letra es minúscula
    v = v.replace(/(^\p{Ll})|([.!?]\s+\p{Ll})/gu, (match) => match.toUpperCase());

    return v;
}

/* Configura los listeners de autoformato */
function configurarFormatoTexto() {
    const teclasDisparo = [" ", "Enter", ".", "Tab"];

    // TÍTULO
    if (inputTitulo) {
        inputTitulo.addEventListener("keyup", (e) => {
            if (teclasDisparo.includes(e.key)) {
                aplicarFormatoConCursor(inputTitulo, formatearTituloTexto);
            }
        });
        inputTitulo.addEventListener("blur", () => {
            aplicarFormatoConCursor(inputTitulo, formatearTituloTexto);
        });
    }

    // INTEGRANTES
    if (txtIntegrantes) {
        txtIntegrantes.addEventListener("keyup", (e) => {
            if (teclasDisparo.includes(e.key)) {
                aplicarFormatoConCursor(txtIntegrantes, formatearNombresTexto);
            }
        });
        txtIntegrantes.addEventListener("blur", () => {
            aplicarFormatoConCursor(txtIntegrantes, formatearNombresTexto);
        });
    }

    // CAMPOS TIPO PÁRRAFO (objetivo, beneficiarios, localización)
    [txtObjetivo, txtBeneficiarios, txtLocalizacion].forEach(campo => {
        if (!campo) return;

        campo.addEventListener("keyup", (e) => {
            if (teclasDisparo.includes(e.key)) {
                aplicarFormatoConCursor(campo, formatearParrafoTexto);
            }
        });

        campo.addEventListener("blur", () => {
            aplicarFormatoConCursor(campo, formatearParrafoTexto);
        });
    });
}

/* =======================================================
   VALIDACIÓN MANUAL ADICIONAL
======================================================= */
function validarFormulario() {
    if (!form.checkValidity()) {
        form.reportValidity();
        return false;
    }

    if (!selectTipo.value) {
        mostrarMensaje("Dato requerido", "Debe seleccionar un tipo de proyecto.", "warning");
        selectTipo.focus();
        return false;
    }

    if (!selectLinea.value) {
        mostrarMensaje("Dato requerido", "Debe seleccionar una línea de investigación.", "warning");
        selectLinea.focus();
        return false;
    }

    if (!normalizarTexto(txtIntegrantes.value)) {
        mostrarMensaje("Dato requerido", "Debe indicar el integrante o integrantes.", "warning");
        txtIntegrantes.focus();
        return false;
    }

    if (!normalizarTexto(txtObjetivo.value)) {
        mostrarMensaje("Dato requerido", "El objetivo del proyecto es obligatorio.", "warning");
        txtObjetivo.focus();
        return false;
    }

    if (!normalizarTexto(txtBeneficiarios.value)) {
        mostrarMensaje("Dato requerido", "Debe indicar los beneficiarios del proyecto.", "warning");
        txtBeneficiarios.focus();
        return false;
    }

    if (!normalizarTexto(txtLocalizacion.value)) {
        mostrarMensaje("Dato requerido", "Debe indicar la localización del proyecto.", "warning");
        txtLocalizacion.focus();
        return false;
    }

    if (inputFechaInicio.value && inputFechaFin.value) {
        if (inputFechaFin.value < inputFechaInicio.value) {
            mostrarMensaje(
                "Fechas inválidas",
                "La fecha de fin no puede ser anterior a la fecha de inicio.",
                "warning"
            );
            inputFechaFin.focus();
            return false;
        }
    }

    return true;
}

/* =======================================================
   GUARDAR PROYECTO
======================================================= */
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const usuario = JSON.parse(localStorage.getItem("usuario"));
    if (!usuario) {
        mostrarMensaje(
            "Sesión requerida",
            "Debe iniciar sesión nuevamente para registrar un proyecto.",
            "warning"
        );
        window.location.href = "login.html";
        return;
    }

    // Formato final antes de guardar
    inputTitulo.value = formatearTituloTexto(inputTitulo.value);
    txtIntegrantes.value = formatearNombresTexto(txtIntegrantes.value);
    txtObjetivo.value = formatearParrafoTexto(txtObjetivo.value);
    txtBeneficiarios.value = formatearParrafoTexto(txtBeneficiarios.value);
    txtLocalizacion.value = formatearParrafoTexto(txtLocalizacion.value);

    if (!validarFormulario()) return;

    const datos = {
        titulo: inputTitulo.value,
        tipo_id: selectTipo.value,
        linea_id: selectLinea.value,
        integrantes: txtIntegrantes.value,
        objetivo_general: txtObjetivo.value,
        beneficiarios: txtBeneficiarios.value,
        localizacion: txtLocalizacion.value,
        fecha_inicio: inputFechaInicio.value,
        fecha_fin: inputFechaFin.value,
        creado_por: usuario.id
    };

    setFormBloqueado(true);

    const { error } = await supabase.from("proyectos").insert([datos]);

    setFormBloqueado(false);

    if (error) {
        console.error("Error al registrar proyecto:", error);
        mostrarMensaje(
            "Error",
            "Ocurrió un problema al registrar el proyecto. Intente nuevamente.",
            "error"
        );
        return;
    }

    mostrarMensaje(
        "Registro exitoso",
        "El proyecto se ha registrado correctamente.",
        "success"
    );

    if (usuario.rol_id === 3) {
        window.location.href = "docente_dashboard.html";
    } else if (usuario.rol_id === 2) {
        window.location.href = "jefeunidad_dashboard.html";
    } else {
        window.location.href = "login.html";
    }
});

/* =======================================================
   BOTÓN LIMPIAR
======================================================= */
btnLimpiar.addEventListener("click", () => {
    form.reset();

    if (selectTipo.options.length > 0) {
        selectTipo.selectedIndex = 0;
    }
    if (selectLinea.options.length > 0) {
        selectLinea.selectedIndex = 0;
    }

    configurarFechas();
});

/* =======================================================
   INICIALIZACIÓN
======================================================= */
(async function inicializar() {
    configurarFechas();
    configurarFormatoTexto();

    await Promise.all([
        cargarTiposProyecto(),
        cargarLineasInvestigacion()
    ]);
})();

/* =======================================================
   CERRAR SESIÓN
======================================================= */
document.getElementById("btnCerrarSesion").onclick = () => {
    localStorage.removeItem("usuario");
    window.location.href = "login.html";
};