import { supabase } from "../../Modelo/supabase.js";

// ===== CARGAR KPIs =====
async function cargarKPIs(){
  const {data, error} = await supabase
    .from("proyectos")
    .select("estado");

  if(error){ console.log(error); return; }

  const activos     = data.filter(x => x.estado === "registrado").length;
  const evaluacion  = data.filter(x => x.estado === "en_evaluacion").length;
  const aprobados   = data.filter(x => x.estado === "aprobado").length;

  document.getElementById("kpiActivos").textContent    = activos;
  document.getElementById("kpiEvaluacion").textContent = evaluacion;
  document.getElementById("kpiAprobados").textContent  = aprobados;
}

// ===== LISTAR TODOS LOS PROYECTOS =====
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
    .order("creado_en", {ascending:false});

  const tablaBody = document.getElementById("tablaRecientesBody");

  if(error){ console.log(error); return; }

  tablaBody.innerHTML = "";

  if(data.length === 0){
    tablaBody.innerHTML = `<tr><td colspan="5" class="text-secondary py-3 ps-3">Sin proyectos aún</td></tr>`;
    return;
  }

  data.forEach(p=>{
    tablaBody.innerHTML += `
    <tr>
      <td>${p.titulo}</td>
      <td>${p.tipos_proyecto?.nombre || "-"}</td>
      <td>${p.lineas_investigacion?.nombre || "-"}</td>
      <td>${p.estado}</td>
      <td>${new Date(p.creado_en).toLocaleDateString()}</td>
    </tr>`;
  });
}

// ejecución
cargarKPIs();
cargarRecientes();

