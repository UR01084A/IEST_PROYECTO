// evaluar_proyecto.js
// Evalúa un proyecto y guarda la evaluación en la tabla
// evaluaciones_proyecto usando el puntaje ORIGINAL (sin escalar a 1–20).

import { supabase } from "../../Modelo/supabase.js";

// ID del proyecto desde la URL ?id=123
const proyectoId = new URLSearchParams(window.location.search).get("id");

// Datos del usuario evaluador (asumimos que está guardado igual que en los demás dashboards)
const usuario = JSON.parse(localStorage.getItem("usuario"));
if (!usuario) {
  window.location.href = "login.html";
}

// ------------------------------------------------------------------
// INICIO
// ------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  cargarProyecto();

  const formEval = document.getElementById("formEvaluacion");
  if (formEval) {
    formEval.addEventListener("submit", guardarEvaluacion);
  }
});

// ------------------------------------------------------------------
// CARGAR DATOS DEL PROYECTO
// ------------------------------------------------------------------
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

  // Soportamos tanto los IDs antiguos como los nuevos por si tu HTML cambió
  setTextIfExists("titulo", data.titulo);
  setTextIfExists("tipo", data.tipo_nombre);
  setTextIfExists("linea", data.linea_nombre);
  setTextIfExists("objetivo", data.objetivo_general);
  setTextIfExists("beneficiarios", data.beneficiarios);
  setTextIfExists("inicio", data.fecha_inicio);
  setTextIfExists("fin", data.fecha_fin);
  setTextIfExists("creador", data.creador_nombre);

  setTextIfExists("p_titulo", data.titulo);
  setTextIfExists("p_tipo", data.tipo_nombre);
  setTextIfExists("p_linea", data.linea_nombre);
  setTextIfExists("p_objetivo", data.objetivo_general);
  setTextIfExists("p_beneficiarios", data.beneficiarios);
  setTextIfExists("p_inicio", data.fecha_inicio);
  setTextIfExists("p_fin", data.fecha_fin);
  setTextIfExists("p_estado", data.estado);

  const link = document.getElementById("archivoLink");
  if (link && data.archivo_url) {
    link.href = data.archivo_url;
  }
}

function setTextIfExists(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "-";
}

// ------------------------------------------------------------------
// GUARDAR EVALUACIÓN (usa puntaje ORIGINAL, sin escalar a 1–20)
// ------------------------------------------------------------------
async function guardarEvaluacion(e) {
  e.preventDefault();

  const form = new FormData(e.target);

  // 1) SUMA DE CRITERIOS
  //    Se suman todos los inputs numéricos que tengan nombre "c1", "c2", ..., "c7"
  //    Si en tu formulario usas otros nombres (item1, etc.), puedes añadirlos aquí.
  let suma = 0;
  for (let i = 1; i <= 7; i++) {
    const val = parseFloat(form.get("c" + i));
    if (!isNaN(val)) {
      suma += val;
    }
  }

  // 2) PUNTAJE FINAL
  //    Aquí YA NO escalamos a 1–20. Usamos la suma tal cual (puntaje original).
  const notaFinal = suma;

  // 3) CONDICIÓN / ESTADO
  //    👉 Ajusta este umbral según tu tabla original.
  //    Ejemplo: si el máximo es 35 y quieres aprobar desde 25:
  //    const UMBRAL_APROBACION = 25;
  const UMBRAL_APROBACION = 25; // CAMBIA ESTE VALOR SEGÚN TU RUBRICA

  const estadoFinal = notaFinal >= UMBRAL_APROBACION ? "aprobado" : "desaprobado";

  // 4) Observaciones
  const observaciones = form.get("observaciones") || "";

  // 5) Armar objeto para Supabase
  const evaluacion = {
    proyecto_id: proyectoId,
    evaluador_id: usuario.id,  // tomamos el id del usuario logueado
    nota: notaFinal,           // puntaje original (NO escalado)
    estado: estadoFinal,       // 'aprobado' o 'desaprobado'
    observaciones: observaciones
  };

  const { error } = await supabase
    .from("evaluaciones_proyecto")
    .insert(evaluacion);

  if (error) {
    alert("Error al guardar evaluación");
    console.error(error);
    return;
  }

  alert(`Evaluación registrada con éxito.\nPuntaje: ${notaFinal}\nEstado: ${estadoFinal}`);

  // Redirige al dashboard del jefe (cámbialo si tu archivo se llama distinto)
  window.location.href = "jefeunidad_dashboard.html";
}
