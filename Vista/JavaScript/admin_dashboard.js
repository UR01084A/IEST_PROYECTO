import { supabase } from "../../Modelo/supabase.js";
import bcrypt from "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.js";

/* ===== Validación de sesión y rol (ADMIN = 1) ===== */
const SESSION = JSON.parse(localStorage.getItem("user") || "null");
if (!SESSION || Number(SESSION.rol) !== 1) {
  window.location.href = "./login.html";
}
document.getElementById("userName").textContent = SESSION.email || "Administrador";

/* ===== LOGOUT ===== */
document.getElementById("btnLogout").addEventListener("click",()=>{
  localStorage.removeItem("user");
  window.location.href = "./login.html";
});

/* ===== Utilidades ===== */
const ROLES = { 1:"Administrador",2:"Jefe de Unidad",3:"Docente" };
function badgeEstado(ok){return ok?`<span class="badge text-bg-success">Activo</span>`:`<span class="badge text-bg-secondary">Inactivo</span>`}
function fmtDate(iso){try{return new Date(iso).toLocaleDateString();}catch{return"";}}

/* ===== KPIs ===== */
async function cargarKPIs(){
  const total=await supabase.from("usuarios").select("*",{count:"exact",head:true});
  const activos=await supabase.from("usuarios").select("*",{count:"exact",head:true}).eq("estado",true);
  const inactivos=await supabase.from("usuarios").select("*",{count:"exact",head:true}).eq("estado",false);
  const docentes=await supabase.from("usuarios").select("*",{count:"exact",head:true}).eq("rol_id",3);
  const evaluadores=await supabase.from("usuarios").select("*",{count:"exact",head:true}).eq("rol_id",2);

  document.getElementById("kpiTotal").textContent=total.count??0;
  document.getElementById("kpiActivos").textContent=activos.count??0;
  document.getElementById("kpiInactivos").textContent=inactivos.count??0;
  document.getElementById("kpiDocentes").textContent=docentes.count??0;
  document.getElementById("kpiEvaluadores").textContent=evaluadores.count??0;
}

/* ===== Tabla usuarios ===== */
async function cargarTabla(){
  const tb=document.getElementById("tablaUsuariosBody");
  tb.innerHTML=`<tr><td colspan="6" class="text-secondary py-3 ps-3">Cargando…</td></tr>`;

  const {data,error}=await supabase.from("usuarios").select("id, username, email, rol_id, estado, fecha_creacion").order("fecha_creacion",{ascending:false});

  if(error){tb.innerHTML=`<tr><td colspan="6" class="text-danger">Error al cargar.</td></tr>`;return;}
  if(!data||data.length===0){tb.innerHTML=`<tr><td colspan="6" class="text-secondary">Sin usuarios registrados.</td></tr>`;return;}

  tb.innerHTML=data.map(u=>`
    <tr>
      <td>${u.username}</td>
      <td>${u.email}</td>
      <td>${ROLES[u.rol_id]??u.rol_id}</td>
      <td>${badgeEstado(u.estado)}</td>
      <td>${fmtDate(u.fecha_creacion)}</td>
      <td class="d-flex gap-1">
        <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${u.id}"><i class="bi bi-pencil-square"></i></button>
        ${u.estado?`<button class="btn btn-sm btn-outline-warning" data-action="toggle" data-id="${u.id}" data-next="false"><i class="bi bi-slash-circle"></i></button>`:`<button class="btn btn-sm btn-outline-success" data-action="toggle" data-id="${u.id}" data-next="true"><i class="bi bi-check2-circle"></i></button>`}
      </td>
    </tr>
  `).join("");
}

/* Delegación acciones */
document.getElementById("tablaUsuariosBody").addEventListener("click",async(e)=>{
  const btn=e.target.closest("button");if(!btn)return;
  const id=btn.dataset.id;const act=btn.dataset.action;

  if(act==="edit"){
    const{data}=await supabase.from("usuarios").select("id, username, email, rol_id").eq("id",id).maybeSingle();
    if(!data)return;
    document.getElementById("ed_id").value=data.id;
    document.getElementById("ed_nombre").value=data.username;
    document.getElementById("ed_correo").value=data.email;
    document.getElementById("ed_rol").value=data.rol_id;
    new bootstrap.Modal(document.getElementById("modalEditar")).show();
  }

  if(act==="toggle"){
    const next=btn.dataset.next==="true";
    await supabase.from("usuarios").update({estado:next}).eq("id",id);
    await cargarKPIs();await cargarTabla();
  }
});

/* Crear usuario */
document.getElementById("formNuevo").addEventListener("submit",async(e)=>{
  e.preventDefault();
  const username=document.getElementById("nu_nombre").value.trim();
  const email=document.getElementById("nu_correo").value.trim();
  const rol_id=Number(document.getElementById("nu_rol").value);
  const pass=document.getElementById("nu_pass").value.trim();

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(pass, salt);

  const{error}=await supabase.from("usuarios").insert({id:crypto.randomUUID(),username,email,rol_id,password_hash:hash,estado:true});
  if(!error){
    document.getElementById("formNuevo").reset();
    bootstrap.Modal.getInstance(document.getElementById("modalNuevo"))?.hide();
    await cargarKPIs();await cargarTabla();
  }else alert("Error al registrar.");
});

/* Editar usuario */
document.getElementById("formEditar").addEventListener("submit",async(e)=>{
  e.preventDefault();
  const id=document.getElementById("ed_id").value;
  const nombre=document.getElementById("ed_nombre").value.trim();
  const correo=document.getElementById("ed_correo").value.trim();
  const rol_id=Number(document.getElementById("ed_rol").value);

  const{error}=await supabase.from("usuarios").update({username:nombre,email:correo,rol_id}).eq("id",id);
  if(!error){
    bootstrap.Modal.getInstance(document.getElementById("modalEditar"))?.hide();
    await cargarKPIs();await cargarTabla();
  }else alert("Error al actualizar.");
});

/* Inicializar */
(async function init(){await cargarKPIs();await cargarTabla();})();
