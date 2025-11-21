import { supabase } from "../../Modelo/supabase.js";

// cargar tipos proyecto
async function cargarTipos(){
  const { data } = await supabase.from("tipos_proyecto").select("*");
  let select = document.getElementById("tipo_id");
  data.forEach(x=>{
    select.innerHTML += `<option value="${x.id}">${x.nombre}</option>`;
  });
}

// cargar lineas investigacion
async function cargarLineas(){
  const { data } = await supabase.from("lineas_investigacion").select("*");
  let select = document.getElementById("linea_id");
  data.forEach(x=>{
    select.innerHTML += `<option value="${x.id}">${x.nombre}</option>`;
  });
}

cargarTipos();
cargarLineas();

document.getElementById("formNuevoProyecto").addEventListener("submit", async e=>{
  e.preventDefault();

  const user = JSON.parse(localStorage.getItem("userSession")); // ya lo usaste en login

  const proyecto = {
    docente_id: user.id,
    titulo: document.getElementById("titulo").value,
    tipo_id: document.getElementById("tipo_id").value,
    linea_id: document.getElementById("linea_id").value,
    objetivo_general: document.getElementById("objetivo_general").value,
    beneficiarios: document.getElementById("beneficiarios").value,
    fecha_inicio: document.getElementById("fecha_inicio").value,
    fecha_fin: document.getElementById("fecha_fin").value
  }

  const { error } = await supabase.from("proyectos").insert(proyecto);

  if(!error){
    alert("Proyecto registrado correctamente!");
    window.location.href = "./docente_dashboard.html";
  }else{
    console.log(error);
    alert("Error al registrar");
  }
});
