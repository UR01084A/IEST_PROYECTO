import { supabase } from "../../Modelo/supabase.js";

/* ===== VALIDACION DE SESION ===== */
const uid   = sessionStorage.getItem("user_id");
const email = sessionStorage.getItem("user_email");
const rol   = sessionStorage.getItem("user_rol");

if(!uid || !email || !rol){
  window.location.href = "../login.html";
}

/* ===== ELEMENTOS DOM ===== */
const userName     = document.getElementById("userName");
const kpiActivos   = document.getElementById("kpiActivos");
const kpiEvaluacion= document.getElementById("kpiEvaluacion");
const kpiAprobados = document.getElementById("kpiAprobados");
const tablaBody    = document.getElementById("tablaRecientesBody");

/* ===== MOSTRAR NOMBRE ===== */
userName.textContent = email.split("@")[0];


/* ===== CARGAR KPI ===== */
async function cargarKPIs(){
  const {data, error} = await supabase
    .from("proyectos")
    .select("estado")
    .eq("docente_id", uid);

  if(error){ console.log(error); return;}

  const activos     = data.filter(x => x.estado === "registrado").length;
  const evaluacion  = data.filter(x => x.estado === "en_evaluacion").length;
  const aprobados   = data.filter(x => x.estado === "aprobado").length;

  kpiActivos.textContent    = activos;
  kpiEvaluacion.textContent = evaluacion;
  kpiAprobados.textContent  = aprobados;
}


/* ===== CARGAR RECIENTES ===== */
async function cargarRecientes(){
  const {data, error} = await supabase
    .from("proyectos")
    .select(`
      titulo,
      estado,
      creado_en,
      tipos_proyecto(nombre),
      lineas_investigacion(nombre)
    `)
    .eq("docente_id", uid)
    .order("creado_en", {ascending:false})
    .limit(5);

  if(error){ console.log(error); return;}

  tablaBody.innerHTML = "";

  if(data.length === 0){
    tablaBody.innerHTML = `<tr><td colspan="5" class="text-secondary py-3 ps-3">Sin proyectos aún</td></tr>`;
    return;
  }

  data.forEach(p => {
    tablaBody.innerHTML += `
      <tr>
        <td>${p.titulo}</td>
        <td>${p.tipos_proyecto?.nombre || "-"}</td>
        <td>${p.lineas_investigacion?.nombre || "-"}</td>
        <td>${formatearEstado(p.estado)}</td>
        <td>${new Date(p.creado_en).toLocaleDateString()}</td>
      </tr>
    `;
  });
}


/* ===== FORMATO ESTADO VISUAL ===== */
function formatearEstado(estado){
  switch(estado){
    case "registrado": return `<span class="badge bg-primary">Activo</span>`;
    case "en_evaluacion": return `<span class="badge bg-info text-dark">En Evaluación</span>`;
    case "aprobado": return `<span class="badge bg-success">Aprobado</span>`;
    default: return estado;
  }
}


/* ===== LOGOUT ===== */
document.getElementById("btnLogout").addEventListener("click",()=>{
  sessionStorage.clear();
  window.location.href = "../login.html";
});


/* ===== EJECUCION INICIAL ===== */
cargarKPIs();
cargarRecientes();

document.getElementById("btnLogout").addEventListener("click", ()=>{
  localStorage.removeItem("user");
  window.location.href = "../login.html";});