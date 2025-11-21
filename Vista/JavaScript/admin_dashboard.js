import { supabase } from "../../Modelo/supabase.js";

/* ============================================================
   INICIO
============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  cargarUsuarioActual();
  await cargarUsuarios();
});

/* ============================================================
   CARGAR USUARIO LOGEADO
============================================================ */
async function cargarUsuarioActual() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("username, rol_id")
    .eq("id", user.id)
    .single();

  document.getElementById("userName").textContent = perfil?.username ?? "Administrador";
}

/* ============================================================
   CARGAR LISTA DE USUARIOS
============================================================ */
let usuariosGlobal = [];

async function cargarUsuarios() {
  const tbody = document.getElementById("tablaUsuariosBody");
  tbody.innerHTML = `<tr><td colspan="6" class="py-3 ps-3 text-secondary">Cargando usuarios…</td></tr>`;

  const { data: usuarios, error } = await supabase
    .from("usuarios")
    .select(`
      id,
      username,
      email,
      rol_id,
      estado,
      fecha_creacion,
      roles (nombre)
    `)
    .order("fecha_creacion", { ascending: false });

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error cargando usuarios.</td></tr>`;
    return;
  }

  usuariosGlobal = usuarios;
  renderizarTabla(usuariosGlobal);
  actualizarKPIs(usuariosGlobal);
}

/* ============================================================
   RENDERIZAR TABLA DE USUARIOS
============================================================ */
function renderizarTabla(lista) {
  const tbody = document.getElementById("tablaUsuariosBody");
  tbody.innerHTML = "";

  lista.forEach(u => {
    const badge =
      u.estado === true
        ? `<span class="badge bg-success">Activo</span>`
        : `<span class="badge bg-secondary">Inactivo</span>`;

    tbody.innerHTML += `
      <tr>
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td>${u.roles?.nombre}</td>
        <td>${badge}</td>
        <td>${u.fecha_creacion?.split("T")[0]}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="abrirEditar('${u.id}')">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="cambiarEstado('${u.id}', ${u.estado})">
            <i class="bi bi-power"></i>
          </button>
        </td>
      </tr>
    `;
  });
}

/* ============================================================
   KPIs DEL DASHBOARD
============================================================ */
function actualizarKPIs(lista) {
  document.getElementById("kpiTotal").textContent = lista.length;
  document.getElementById("kpiActivos").textContent = lista.filter(u => u.estado === true).length;
  document.getElementById("kpiInactivos").textContent = lista.filter(u => u.estado === false).length;

  document.getElementById("kpiDocentes").textContent = lista.filter(u => u.rol_id === 3).length;
  document.getElementById("kpiEvaluadores").textContent = lista.filter(u => u.rol_id === 2).length;
}

/* ============================================================
   CREAR NUEVO USUARIO
============================================================ */
document.getElementById("formNuevo").addEventListener("submit", async e => {
  e.preventDefault();

  const username = document.getElementById("nu_nombre").value.trim();
  const email = document.getElementById("nu_correo").value.trim();
  const rol_id = parseInt(document.getElementById("nu_rol").value);
  const password_hash = document.getElementById("nu_pass").value.trim();

  if (!username || !email || !password_hash) {
    alert("Todos los campos son obligatorios.");
    return;
  }

  const { error } = await supabase.from("usuarios").insert({
    username,
    email,
    rol_id,
    password_hash,
    estado: true
  });

  if (error) {
    console.error(error);
    alert("❌ Error al registrar usuario.");
    return;
  }

  alert("✅ Usuario registrado correctamente.");

  document.getElementById("formNuevo").reset();
  bootstrap.Modal.getInstance(document.getElementById("modalNuevo")).hide();

  cargarUsuarios();
});

/* ============================================================
   ABRIR MODAL EDITAR USUARIO
============================================================ */
window.abrirEditar = function (id) {
  const user = usuariosGlobal.find(u => u.id === id);
  if (!user) return;

  document.getElementById("ed_id").value = id;
  document.getElementById("ed_nombre").value = user.username;
  document.getElementById("ed_correo").value = user.email;
  document.getElementById("ed_rol").value = user.rol_id;

  new bootstrap.Modal(document.getElementById("modalEditar")).show();
};

/* ============================================================
   EDITAR USUARIO
============================================================ */
document.getElementById("formEditar").addEventListener("submit", async e => {
  e.preventDefault();

  const id = document.getElementById("ed_id").value;
  const username = document.getElementById("ed_nombre").value;
  const email = document.getElementById("ed_correo").value;
  const rol_id = parseInt(document.getElementById("ed_rol").value);

  const { error } = await supabase.from("usuarios")
    .update({ username, email, rol_id })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("❌ Error al actualizar usuario.");
    return;
  }

  alert("✅ Cambios guardados correctamente.");

  bootstrap.Modal.getInstance(document.getElementById("modalEditar")).hide();
  cargarUsuarios();
});

/* ============================================================
   ACTIVAR / DESACTIVAR USUARIO
============================================================ */
window.cambiarEstado = async function (id, estadoActual) {
  const confirmacion = confirm(
    `¿Deseas ${estadoActual ? "desactivar" : "activar"} este usuario?`
  );
  if (!confirmacion) return;

  const { error } = await supabase
    .from("usuarios")
    .update({ estado: !estadoActual })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("❌ No se pudo actualizar el estado.");
    return;
  }

  cargarUsuarios();
};

/* ============================================================
   CERRAR SESIÓN
============================================================ */
document.getElementById("btnLogout").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert("❌ No se pudo cerrar sesión.");
    return;
  }

  window.location.href = "../Vistas/login.html";
});
