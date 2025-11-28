

// admin_dashboard.js


// Panel de administración: usuarios, tema visual, formularios, fechas, auditoría.


import { supabase } from "../../Modelo/supabase.js";

/* ============================================================
   CONSTANTES / UTILIDADES GENERALES
============================================================ */

// Dominios por tipo de rol
const DOMINIO_DOCENTE = "@institutocajas.edu.pe";
const DOMINIO_EVALUADOR = "@institutocajasEvaluador.edu.pe";
const DOMINIO_ADMIN = "@institutocajasAdmin.edu.pe";

const THEME_KEY = "admin_tema_investigacion";
const SALT_ROUNDS = 10;

const $ = (id) => document.getElementById(id);

/** Quita acentos y caracteres raros, deja solo letras y espacios */
function normalizarNombre(texto) {
  return (texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z\s]/g, " "); // solo letras y espacios
}

/** Devuelve el dominio según el rol */
function getDominioPorRol(rolId) {
  if (rolId === 1) return DOMINIO_ADMIN;
  if (rolId === 2) return DOMINIO_EVALUADOR;
  return DOMINIO_DOCENTE;
}

/**
 * Genera correo tipo:
 *  inicialNombre + apellidoPaterno + inicialApellidoMaterno + dominio según rol
 *  Ej: "Franklin Cristian Aldana Luna", rol_id=3 -> "faldanal@institutocajas.edu.pe"
 */
function generarCorreoInstitucional(nombres, apellidos, rol_id = 3) {
  const n = normalizarNombre(nombres).split(/\s+/).filter(Boolean);
  const a = normalizarNombre(apellidos).split(/\s+/).filter(Boolean);

  if (!n.length || !a.length) return "";

  const inicialNombre = n[0][0] || "";
  const apellidoPaterno = a[0] || "";
  const inicialApellidoMaterno = a[1] ? a[1][0] : "";

  const usuario = (inicialNombre + apellidoPaterno + inicialApellidoMaterno).substring(
    0,
    30
  );
  const dominio = getDominioPorRol(Number(rol_id) || 3);

  return usuario + dominio;
}

/** Capitaliza cada palabra: "franklin cristian" -> "Franklin Cristian" */
function capitalizarFrase(texto) {
  return normalizarNombre(texto)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Divide el username en { nombres, apellidos } de forma simple */
function dividirNombreCompleto(username) {
  const partes = (username || "").trim().split(/\s+/);
  if (partes.length <= 1) {
    return { nombres: username || "", apellidos: "" };
  }
  const apellidos = partes.slice(-2).join(" ");
  const nombres = partes.slice(0, -2).join(" ");
  return { nombres, apellidos };
}

/**
 * Hashea una contraseña en texto plano usando bcryptjs.
 * Devuelve una promesa con el hash.
 */
async function hashPassword(plainPassword) {
  if (!plainPassword) return "";
  const bcrypt = window.dcodeIO?.bcrypt;

  if (!bcrypt) {
    console.warn("bcryptjs no está cargado, se guardará la contraseña SIN hash.");
    return plainPassword; // fallback (no recomendado en producción)
  }

  return new Promise((resolve, reject) => {
    bcrypt.genSalt(SALT_ROUNDS, (err, salt) => {
      if (err) return reject(err);
      bcrypt.hash(plainPassword, salt, (err2, hash) => {
        if (err2) return reject(err2);
        resolve(hash);
      });
    });
  });
}

/** Pequeño helper para alerts (por si luego lo cambias a toasts) */
function showAlert(msg) {
  alert(msg);
}

/* ============================================================
   INICIO
============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  await cargarUsuarioActual();
  await cargarUsuarios();

  inicializarBuscadorUsuarios();
  inicializarFormNuevo();
  inicializarFormEditar();
  inicializarLogout();

  inicializarTemaVisual(); // panel de configuración de tema (admin)
  inicializarFechasGlobalesUI();
  inicializarFormulariosUI();
  inicializarAuditoriaUI();
});

/* ============================================================
   CARGAR USUARIO LOGEADO (solo para mostrar en topbar)
============================================================ */

let adminActualId = null;

async function cargarUsuarioActual() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    adminActualId = user.id;

    const { data: perfil } = await supabase
      .from("usuarios")
      .select("username, rol_id")
      .eq("id", user.id)
      .single();

    $("userName").textContent = perfil?.username ?? "Administrador";
  } catch (err) {
    console.error("Error obteniendo usuario actual:", err);
  }
}

/* ============================================================
   CARGAR LISTA DE USUARIOS
============================================================ */

let usuariosGlobal = [];
let tiposAvanceAdmin = [];
let fechasGlobales = [];

async function cargarUsuarios() {
  const tbody = $("tablaUsuariosBody");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="6" class="py-3 ps-3 text-secondary">Cargando usuarios…</td></tr>';

  const { data: usuarios, error } = await supabase
    .from("usuarios")
    .select(
      `
      id,
      username,
      email,
      rol_id,
      estado,
      fecha_creacion,
      roles (nombre)
    `
    )
    .order("fecha_creacion", { ascending: false });

  if (error) {
    console.error(error);
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-danger py-3 ps-3">Error cargando usuarios.</td></tr>';
    return;
  }

  usuariosGlobal = usuarios || [];
  renderizarTabla(usuariosGlobal);
  actualizarKPIs(usuariosGlobal);
}

/* ============================================================
   RENDERIZAR TABLA DE USUARIOS
============================================================ */
function renderizarTabla(lista) {
  const tbody = $("tablaUsuariosBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!lista.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="py-3 ps-3 text-secondary">No hay usuarios coincidentes.</td></tr>';
    return;
  }

  const filasHTML = lista
    .map((u) => {
      const badge =
        u.estado === true
          ? '<span class="badge bg-success badge-estado">Activo</span>'
          : '<span class="badge bg-secondary badge-estado">Inactivo</span>';

      return `
        <tr>
          <td>${u.username || "-"}</td>
          <td>${u.email || "-"}</td>
          <td>${u.roles?.nombre || "-"}</td>
          <td>${badge}</td>
          <td>${u.fecha_creacion?.split("T")[0] || "-"}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirEditar('${u.id}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-warning me-1" onclick="cambiarEstado('${u.id}', ${
              u.estado
            })">
              <i class="bi bi-power"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario('${u.id}')">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.innerHTML = filasHTML;
}

/* ============================================================
   BUSCADOR EN TABLA DE USUARIOS
============================================================ */
function inicializarBuscadorUsuarios() {
  const input = $("buscarUsuario");
  if (!input) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      renderizarTabla(usuariosGlobal);
      return;
    }

    const filtrados = usuariosGlobal.filter((u) => {
      const nombre = (u.username || "").toLowerCase();
      const correo = (u.email || "").toLowerCase();
      return nombre.includes(q) || correo.includes(q);
    });

    renderizarTabla(filtrados);
  });
}

/* ============================================================
   KPIs DEL DASHBOARD
============================================================ */
function actualizarKPIs(lista) {
  $("kpiTotal").textContent = lista.length;
  $("kpiActivos").textContent = lista.filter((u) => u.estado === true).length;
  $("kpiInactivos").textContent = lista.filter((u) => u.estado === false).length;
  $("kpiDocentes").textContent = lista.filter((u) => u.rol_id === 3).length;
  $("kpiEvaluadores").textContent = lista.filter((u) => u.rol_id === 2).length;
}

/* ============================================================
   NUEVO USUARIO
============================================================ */

let correoNuevoEditadoManualmente = false;

function inicializarFormNuevo() {
  const fNuevo = $("formNuevo");
  const inpNombres = $("nu_nombres");
  const inpApellidos = $("nu_apellidos");
  const inpCorreo = $("nu_correo");
  const selRol = $("nu_rol");

  if (!fNuevo || !inpNombres || !inpApellidos || !inpCorreo || !selRol) return;

  // Cuando el admin escribe nombres / apellidos o cambia rol, sugerimos correo
  ["input", "blur"].forEach((ev) => {
    inpNombres.addEventListener(ev, actualizarCorreoSugeridoNuevo);
    inpApellidos.addEventListener(ev, actualizarCorreoSugeridoNuevo);
  });

  selRol.addEventListener("change", () => {
    correoNuevoEditadoManualmente = false; // si cambia rol, volvemos a sugerir
    actualizarCorreoSugeridoNuevo();
  });

  // Si el admin escribe directamente en el correo, marcamos como "manual"
  inpCorreo.addEventListener("input", () => {
    correoNuevoEditadoManualmente = inpCorreo.value.trim().length > 0;
  });

  fNuevo.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombres = inpNombres.value.trim();
    const apellidos = inpApellidos.value.trim();
    const email = inpCorreo.value.trim().toLowerCase();
    const rol_id = parseInt(selRol.value, 10);
    const passwordPlain = $("nu_pass")?.value.trim() || "";

    if (!nombres || !apellidos || !email || !passwordPlain) {
      showAlert("Todos los campos son obligatorios.");
      return;
    }

    // Armar username con formato bonito
    const username = `${capitalizarFrase(nombres)} ${capitalizarFrase(apellidos)}`.trim();

    // 🔐 Hashear la contraseña antes de guardar
    let password_hash;
    try {
      password_hash = await hashPassword(passwordPlain);
    } catch (err) {
      console.error("Error hasheando contraseña:", err);
      showAlert("❌ No se pudo cifrar la contraseña.");
      return;
    }

    const { error } = await supabase.from("usuarios").insert({
      username,
      email,
      rol_id,
      password_hash,
      estado: true,
    });

    if (error) {
      console.error(error);
      if (String(error.message).toLowerCase().includes("duplicate")) {
        showAlert("❌ El correo ya está registrado. Modifícalo e inténtalo nuevamente.");
      } else {
        showAlert("❌ Error al registrar usuario.");
      }
      return;
    }

    showAlert("✅ Usuario registrado correctamente.");

    fNuevo.reset();
    correoNuevoEditadoManualmente = false;
    bootstrap.Modal.getInstance($("modalNuevo")).hide();
    cargarUsuarios();
  });
}

function actualizarCorreoSugeridoNuevo() {
  const nombres = $("nu_nombres")?.value || "";
  const apellidos = $("nu_apellidos")?.value || "";
  const inpCorreo = $("nu_correo");
  const rol_id = parseInt($("nu_rol")?.value || "3", 10);

  if (!inpCorreo) return;
  if (correoNuevoEditadoManualmente) return; // no pisar si el admin ya lo cambió

  const sugerido = generarCorreoInstitucional(nombres, apellidos, rol_id);
  inpCorreo.value = sugerido;
}

/* ============================================================
   EDITAR USUARIO
============================================================ */

window.abrirEditar = function (id) {
  const user = usuariosGlobal.find((u) => u.id === id);
  if (!user) return;

  const { nombres, apellidos } = dividirNombreCompleto(user.username || "");

  $("ed_id").value = id;
  $("ed_nombres").value = capitalizarFrase(nombres);
  $("ed_apellidos").value = capitalizarFrase(apellidos);
  $("ed_correo").value = user.email || "";
  $("ed_rol").value = user.rol_id;

  new bootstrap.Modal($("modalEditar")).show();
};

function inicializarFormEditar() {
  const fEditar = $("formEditar");
  if (!fEditar) return;

  fEditar.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = $("ed_id").value;
    const nombres = $("ed_nombres").value.trim();
    const apellidos = $("ed_apellidos").value.trim();
    const email = $("ed_correo").value.trim().toLowerCase();
    const rol_id = parseInt($("ed_rol").value, 10);

    if (!nombres || !apellidos || !email) {
      showAlert("Completa nombres, apellidos y correo.");
      return;
    }

    const username = `${capitalizarFrase(nombres)} ${capitalizarFrase(apellidos)}`.trim();

    const { error } = await supabase
      .from("usuarios")
      .update({ username, email, rol_id })
      .eq("id", id);

    if (error) {
      console.error(error);
      showAlert("❌ Error al actualizar usuario.");
      return;
    }

    showAlert("✅ Cambios guardados correctamente.");

    bootstrap.Modal.getInstance($("modalEditar")).hide();
    cargarUsuarios();
  });
}

/* ============================================================
   ACTIVAR / DESACTIVAR USUARIO
============================================================ */

window.cambiarEstado = async function (id, estadoActual) {
  const texto = estadoActual ? "desactivar" : "activar";
  const ok = confirm(`¿Deseas ${texto} este usuario?`);
  if (!ok) return;

  const { error } = await supabase
    .from("usuarios")
    .update({ estado: !estadoActual })
    .eq("id", id);

  if (error) {
    console.error(error);
    showAlert("❌ No se pudo actualizar el estado.");
    return;
  }

  cargarUsuarios();
};

/* ============================================================
   ELIMINAR USUARIO
============================================================ */

window.eliminarUsuario = async function (id) {
  const user = usuariosGlobal.find((u) => u.id === id);
  const etiqueta = user ? `${user.username} (${user.email})` : "este usuario";

  const ok = confirm(
    `⚠️ Esta acción eliminará definitivamente a ${etiqueta}.\n` +
      `No podrás recuperar los datos luego.\n\n¿Deseas continuar?`
  );
  if (!ok) return;

  const { error } = await supabase.from("usuarios").delete().eq("id", id);

  if (error) {
    console.error(error);
    showAlert("❌ No se pudo eliminar el usuario.");
    return;
  }

  showAlert("✅ Usuario eliminado correctamente.");
  cargarUsuarios();
};

/* ============================================================
   LOGOUT
============================================================ */

function inicializarLogout() {
  const btn = $("btnLogout");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const ok = confirm("¿Seguro que deseas cerrar sesión?");
    if (!ok) return;

    const { error } = await supabase.auth.signOut();
    if (error) {
      showAlert("❌ No se pudo cerrar sesión.");
      return;
    }

    window.location.href = "../Vistas/login.html";
  });
}

/* ============================================================
   TEMA VISUAL (modalTema + vista previa + localStorage)
   -> Este archivo SOLO maneja la configuración y la vista previa.
   La aplicación global del tema se hace en aplicar_tema_global.js
============================================================ */

let temaActual = null;

// Esquemas predefinidos (puedes ajustar los colores a tu gusto)
const ESQUEMA_PREDEFINIDO = {
  light: {
    primary: "#0f6cfb",
    header: "#0f172a",
    background: "#f1f5f9",
    card: "#ffffff",
    text: "#0f172a",
    loginBg: "#e5f0ff",
    loginCardBg: "rgba(255,255,255,0.92)",
    loginText: "#0f172a",
  },
  dark: {
    primary: "#60a5fa",
    header: "#020617",
    background: "#020617",
    card: "#111827",
    text: "#e5e7eb",
    loginBg: "#020617",
    loginCardBg: "rgba(15,23,42,0.95)",
    loginText: "#e5e7eb",
  },
  azul: {
    primary: "#3c3caa",
    header: "#033a34",
    background: "#b2f5de",
    card: "#fcfcfc",
    text: "#350303",
    loginBg: "#022c22",
    loginCardBg: "rgba(255,255,255,0.12)",
    loginText: "#ffffff",
  },
  verde: {
    primary: "#16a34a",
    header: "#065f46",
    background: "#d1fae5",
    card: "#ffffff",
    text: "#064e3b",
    loginBg: "#022c22",
    loginCardBg: "rgba(209,250,229,0.15)",
    loginText: "#ecfdf5",
  },
  vino: {
    primary: "#e11d48",
    header: "#450a0a",
    background: "#fee2e2",
    card: "#ffffff",
    text: "#111827",
    loginBg: "#450a0a",
    loginCardBg: "rgba(254,226,226,0.10)",
    loginText: "#fef2f2",
  },
};

/** Convierte "#rrggbb" a {r,g,b} */
function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return { r: 0, g: 0, b: 0 };
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

/** Devuelve blanco o casi-negro según qué contraste mejor */
function getContrastingTextColor(bgHex) {
  const { r, g, b } = hexToRgb(bgHex);
  const luminancia = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminancia > 140 ? "#0f172a" : "#ffffff";
}

function getTemaPorDefecto() {
  const estilos = getComputedStyle(document.documentElement);
  const header = estilos.getPropertyValue("--color-header-bg").trim() || "#0f172a";
  const primary = estilos.getPropertyValue("--color-primary").trim() || "#0f6cfb";
  const background = estilos.getPropertyValue("--color-page-bg").trim() || "#f1f5f9";

  const headerText = getContrastingTextColor(header);
  const primaryText = getContrastingTextColor(primary);

  return {
    esquema: "azul",
    primary,
    header,
    background,
    card: "#ffffff",
    text: "#0f172a",

    // login
    loginBg: "#0d2c3f",
    loginCardBg: "rgba(255,255,255,0.18)",
    loginText: "#ffffff",

    // NUEVO: ajustes avanzados por defecto
    navText: headerText,
    btnPrimaryBg: primary,
    btnPrimaryText: primaryText,
    tableHeaderBg: primary,
    tableHeaderText: primaryText,
  };
}

function cargarTemaGuardado() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) return getTemaPorDefecto();
    const parsed = JSON.parse(raw);
    return { ...getTemaPorDefecto(), ...parsed };
  } catch {
    return getTemaPorDefecto();
  }
}

function guardarTema(tema) {
  localStorage.setItem(THEME_KEY, JSON.stringify(tema));
}

/**
 * Aplica el tema al DOM del admin (variables CSS + vista previa).
 * aplicar_tema_global.js usará estas mismas variables en los otros HTML.
 */
function aplicarTemaAdmin(tema) {
  const t = tema || getTemaPorDefecto();
  const rootStyle = document.documentElement.style;

  const headerText = getContrastingTextColor(t.header);
  const primaryText = getContrastingTextColor(t.primary);

  const navText = t.navText || headerText;
  const btnBg = t.btnPrimaryBg || t.primary;
  const btnText = t.btnPrimaryText || getContrastingTextColor(btnBg);
  const thBg = t.tableHeaderBg || t.primary;
  const thText = t.tableHeaderText || getContrastingTextColor(thBg);

  // Variables globales para TODOS los HTML
  rootStyle.setProperty("--color-header-bg", t.header);
  rootStyle.setProperty("--color-header-text", headerText);
  rootStyle.setProperty("--color-primary", t.primary);
  rootStyle.setProperty("--color-primary-text", primaryText);
  rootStyle.setProperty("--color-page-bg", t.background);
  rootStyle.setProperty("--color-card-bg", t.card);
  rootStyle.setProperty("--color-card-text", t.text);

  // Colores especiales para login
  rootStyle.setProperty("--color-login-bg", t.loginBg || t.background);
  rootStyle.setProperty("--color-login-card-bg", t.loginCardBg || t.card);
  rootStyle.setProperty("--color-login-text", t.loginText || t.text);

  // Navbar
  rootStyle.setProperty("--color-navbar-link", navText);
  rootStyle.setProperty("--color-navbar-link-active", navText);

  // Botón primario y cabecera de tablas
  rootStyle.setProperty("--color-btn-primary-bg", btnBg);
  rootStyle.setProperty("--color-btn-primary-text", btnText);
  rootStyle.setProperty("--color-table-header-bg", thBg);
  rootStyle.setProperty("--color-table-header-text", thText);

  if (document.body) {
    document.body.style.backgroundColor = t.background;
    document.body.style.color = t.text;
  }

  // Vista previa del modal
  const preview = $("previewTema");
  if (preview) {
    const barra = preview.querySelector("div.p-2.rounded-3");
    if (barra) {
      barra.style.backgroundColor = t.header;
      barra.style.color = navText;
    }

    const badges = preview.querySelectorAll(".badge.bg-primary");
    badges.forEach((b) => {
      b.style.backgroundColor = btnBg;
      b.style.borderColor = btnBg;
      b.style.color = btnText;
    });
  }
}

function vincularColorYHex(idHex, idColor, onChange) {
  const inputHex = $(idHex);
  const inputColor = $(idColor);
  if (!inputHex || !inputColor) return;

  const syncFromHex = () => {
    const val = inputHex.value.replace("#", "").trim();
    if (/^[0-9a-fA-F]{6}$/.test(val)) {
      inputColor.value = "#" + val;
      onChange("#" + val);
    }
  };

  const syncFromColor = () => {
    const val = inputColor.value;
    inputHex.value = val.replace("#", "");
    onChange(val);
  };

  inputHex.addEventListener("blur", syncFromHex);
  inputHex.addEventListener("input", () => {
    // mientras escribe, no aplicamos para no parpadear
  });
  inputColor.addEventListener("input", syncFromColor);
}

function rellenarCamposConTema(t) {
  $("tema_primary_hex").value = t.primary.replace("#", "");
  $("tema_primary_color").value = t.primary;

  $("tema_header_hex").value = t.header.replace("#", "");
  $("tema_header_color").value = t.header;

  $("tema_background_hex").value = t.background.replace("#", "");
  $("tema_background_color").value = t.background;

  $("tema_card_hex").value = t.card.replace("#", "");
  $("tema_card_color").value = t.card;

  $("tema_text_hex").value = t.text.replace("#", "");
  $("tema_text_color").value = t.text;

  // Login
  const loginBgHex = $("tema_login_bg_hex");
  const loginBgColor = $("tema_login_bg_color");
  const loginCardHex = $("tema_login_card_hex");
  const loginCardColor = $("tema_login_card_color");
  const loginTextHex = $("tema_login_text_hex");
  const loginTextColor = $("tema_login_text_color");

  if (loginBgHex && loginBgColor) {
    const lb = t.loginBg || "#0d2c3f";
    loginBgHex.value = lb.replace("#", "");
    loginBgColor.value = lb.startsWith("#") ? lb : "#0d2c3f";
  }
  if (loginCardHex && loginCardColor) {
    const lc = t.loginCardBg || "#ffffff";
    loginCardHex.value = lc.replace("#", "");
    loginCardColor.value = lc.startsWith("#") ? lc : "#ffffff";
  }
  if (loginTextHex && loginTextColor) {
    const lt = t.loginText || "#ffffff";
    loginTextHex.value = lt.replace("#", "");
    loginTextColor.value = lt.startsWith("#") ? lt : "#ffffff";
  }

  // --- NUEVO: ajustes avanzados ---

  const navText = t.navText || getContrastingTextColor(t.header);
  $("tema_nav_text_hex").value = navText.replace("#", "");
  $("tema_nav_text_color").value = navText;

  const btnBg = t.btnPrimaryBg || t.primary;
  $("tema_btn_primary_bg_hex").value = btnBg.replace("#", "");
  $("tema_btn_primary_bg_color").value = btnBg;

  const btnText = t.btnPrimaryText || getContrastingTextColor(btnBg);
  $("tema_btn_primary_text_hex").value = btnText.replace("#", "");
  $("tema_btn_primary_text_color").value = btnText;

  const thBg = t.tableHeaderBg || t.primary;
  $("tema_table_header_bg_hex").value = thBg.replace("#", "");
  $("tema_table_header_bg_color").value = thBg;

  const thText = t.tableHeaderText || getContrastingTextColor(thBg);
  $("tema_table_header_text_hex").value = thText.replace("#", "");
  $("tema_table_header_text_color").value = thText;
}

function inicializarTemaVisual() {
  temaActual = cargarTemaGuardado();
  aplicarTemaAdmin(temaActual);

  const modalElem = $("modalTema");
  if (!modalElem) return;

  const form = $("formTema");
  if (!form) return;

  // Al abrir el modal, rellenar campos
  modalElem.addEventListener("show.bs.modal", () => {
    $("tema_esquema").value = temaActual.esquema || "azul";
    rellenarCamposConTema(temaActual);
    aplicarTemaAdmin(temaActual);
  });

  // Vincular inputs hex <-> color (panel general)
  vincularColorYHex("tema_primary_hex", "tema_primary_color", (color) => {
    temaActual.primary = color;
    aplicarTemaAdmin(temaActual);
  });
  vincularColorYHex("tema_header_hex", "tema_header_color", (color) => {
    temaActual.header = color;
    aplicarTemaAdmin(temaActual);
  });
  vincularColorYHex("tema_background_hex", "tema_background_color", (color) => {
    temaActual.background = color;
    aplicarTemaAdmin(temaActual);
  });
  vincularColorYHex("tema_card_hex", "tema_card_color", (color) => {
    temaActual.card = color;
    aplicarTemaAdmin(temaActual);
  });
  vincularColorYHex("tema_text_hex", "tema_text_color", (color) => {
    temaActual.text = color;
    aplicarTemaAdmin(temaActual);
  });

  // Vincular (si existen) los colores específicos del login
  vincularColorYHex("tema_login_bg_hex", "tema_login_bg_color", (color) => {
    temaActual.loginBg = color;
    aplicarTemaAdmin(temaActual);
  });
  vincularColorYHex("tema_login_card_hex", "tema_login_card_color", (color) => {
    temaActual.loginCardBg = color;
    aplicarTemaAdmin(temaActual);
  });
  vincularColorYHex("tema_login_text_hex", "tema_login_text_color", (color) => {
    temaActual.loginText = color;
    aplicarTemaAdmin(temaActual);
  });

  // NUEVO: vincular ajustes avanzados

  // Texto barra menú
  vincularColorYHex("tema_nav_text_hex", "tema_nav_text_color", (color) => {
    temaActual.navText = color;
    aplicarTemaAdmin(temaActual);
  });

  // Botón principal fondo
  vincularColorYHex("tema_btn_primary_bg_hex", "tema_btn_primary_bg_color", (color) => {
    temaActual.btnPrimaryBg = color;
    aplicarTemaAdmin(temaActual);
  });

  // Botón principal texto
  vincularColorYHex(
    "tema_btn_primary_text_hex",
    "tema_btn_primary_text_color",
    (color) => {
      temaActual.btnPrimaryText = color;
      aplicarTemaAdmin(temaActual);
    }
  );

  // Cabecera de tabla fondo
  vincularColorYHex(
    "tema_table_header_bg_hex",
    "tema_table_header_bg_color",
    (color) => {
      temaActual.tableHeaderBg = color;
      aplicarTemaAdmin(temaActual);
    }
  );

  // Cabecera de tabla texto
  vincularColorYHex(
    "tema_table_header_text_hex",
    "tema_table_header_text_color",
    (color) => {
      temaActual.tableHeaderText = color;
      aplicarTemaAdmin(temaActual);
    }
  );

  // Cambio de esquema -> aplica preset y recalcula derivados
  $("tema_esquema").addEventListener("change", (e) => {
    const esquema = e.target.value; // light / dark / azul / verde / vino
    temaActual.esquema = esquema;

    const preset = ESQUEMA_PREDEFINIDO[esquema];
    if (preset) {
      temaActual = { ...temaActual, ...preset };

      // recalculamos avanzados en base a primary/header
      const headerText = getContrastingTextColor(temaActual.header);
      const btnBg = temaActual.primary;
      const btnText = getContrastingTextColor(btnBg);
      const thBg = temaActual.primary;
      const thText = getContrastingTextColor(thBg);

      temaActual.navText = headerText;
      temaActual.btnPrimaryBg = btnBg;
      temaActual.btnPrimaryText = btnText;
      temaActual.tableHeaderBg = thBg;
      temaActual.tableHeaderText = thText;

      rellenarCamposConTema(temaActual);
      aplicarTemaAdmin(temaActual);
    }
  });

  // Guardar tema
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    guardarTema(temaActual);
    aplicarTemaAdmin(temaActual);
    showAlert("✅ Tema visual guardado (se aplicará en todos los paneles y el login).");
    bootstrap.Modal.getInstance(modalElem).hide();
  });
}

/* ============================================================
   FECHAS GLOBALES (conectado a fechas_entrega_global,
   permite crear nuevos tipos de avance desde el modal)
============================================================ */

// Helpers BD para fechas globales
async function cargarTiposAvanceAdmin() {
  const { data, error } = await supabase
    .from("tipos_avance")
    .select("id, nombre")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error cargando tipos de avance:", error);
    tiposAvanceAdmin = [];
    return;
  }
  tiposAvanceAdmin = data || [];
}

async function cargarFechasGlobales() {
  const { data, error } = await supabase
    .from("fechas_entrega_global")
    .select(
      `
      id,
      tipo_avance_id,
      descripcion,
      fecha_limite,
      activo,
      tipos_avance (nombre)
    `
    )
    .order("fecha_limite", { ascending: true });

  if (error) {
    console.error("Error cargando fechas globales:", error);
    fechasGlobales = [];
    return;
  }

  fechasGlobales = data || [];
}

function pintarFechasGlobalesEnTabla() {
  const tbody = $("tbodyFechasGlobales");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!fechasGlobales.length) {
    // si no hay nada en BD, dejamos una fila vacía
    agregarFilaFechaGlobal(tbody);
    return;
  }

  fechasGlobales.forEach((f) => {
    agregarFilaFechaGlobal(tbody, f);
  });
}

function agregarFilaFechaGlobal(tbody, fecha = null) {
  const fila = document.createElement("tr");
  fila.dataset.id = fecha?.id ?? "";

  const opciones = tiposAvanceAdmin
    .map(
      (t) =>
        `<option value="${t.id}" ${
          fecha?.tipo_avance_id === t.id ? "selected" : ""
        }>${t.nombre}</option>`
    )
    .join("");

  // descripción por defecto (si no viene nada)
  let descDefault = fecha?.descripcion ?? "";
  if (!descDefault && fecha?.tipo_avance_id) {
    const tipo = tiposAvanceAdmin.find((t) => t.id === fecha.tipo_avance_id);
    if (tipo) {
      descDefault = `Fecha referencia para entrega de ${tipo.nombre}`;
    }
  }

  fila.innerHTML = `
    <td>
      <div class="input-group input-group-sm">
        <select class="form-select form-select-sm sel-tipo-avance">
          <option value="">Seleccione…</option>
          ${opciones}
          <option value="__nuevo__">+ Nuevo tipo…</option>
        </select>
        <input type="text"
               class="form-control form-control-sm input-tipo-nuevo d-none"
               placeholder="Nombre del tipo de avance" />
      </div>
    </td>
    <td>
      <input type="date"
             class="form-control form-control-sm"
             value="${fecha?.fecha_limite ?? ""}">
    </td>
    <td>
      <input type="text"
             class="form-control form-control-sm"
             placeholder="Opcional"
             value="${descDefault}">
    </td>
    <td class="text-end">
      <button type="button"
              class="btn btn-outline-danger btn-sm"
              data-action="eliminar-fila">
        <i class="bi bi-trash"></i>
      </button>
    </td>
  `;

  tbody.appendChild(fila);
}

function inicializarFechasGlobalesUI() {
  const btnAgregar = $("btnAgregarFechaGlobal");
  const tbody = $("tbodyFechasGlobales");
  const form = $("formFechasGlobales");
  const modal = $("modalFechasGlobales");
  if (!btnAgregar || !tbody || !form || !modal) return;

  // Cuando se abre el modal, traemos tipos de avance + fechas de BD
  modal.addEventListener("show.bs.modal", async () => {
    await cargarTiposAvanceAdmin();
    await cargarFechasGlobales();
    pintarFechasGlobalesEnTabla();
  });

  // Agregar nueva fila en blanco
  btnAgregar.addEventListener("click", () => {
    agregarFilaFechaGlobal(tbody);
  });

  // Delegación: eliminar fila y manejar "nuevo tipo"
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action='eliminar-fila']");
    if (!btn) return;
    const fila = btn.closest("tr");
    if (fila) fila.remove();
  });

  // Mostrar/ocultar input de "nuevo tipo"
  tbody.addEventListener("change", (e) => {
    const select = e.target.closest("select.sel-tipo-avance");
    if (!select) return;

    const group = select.closest(".input-group");
    const inputNuevo = group?.querySelector(".input-tipo-nuevo");
    if (!inputNuevo) return;

    if (select.value === "__nuevo__") {
      inputNuevo.classList.remove("d-none");
      inputNuevo.focus();
    } else {
      inputNuevo.classList.add("d-none");
      inputNuevo.value = "";
    }
  });

  // Guardar cambios en Supabase
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const filas = Array.from(tbody.querySelectorAll("tr"));
    const rowsData = [];
    const idsPresentes = [];

    filas.forEach((tr) => {
      const idAttr = tr.dataset.id;
      const id = idAttr ? Number(idAttr) : null;

      const select = tr.querySelector("select.sel-tipo-avance");
      const inputNuevo = tr.querySelector("input.input-tipo-nuevo");
      const inputFecha = tr.querySelector("input[type='date']");
      // el input de descripción es el text que NO es input-tipo-nuevo
      const inputDesc = Array.from(tr.querySelectorAll("input[type='text']"))
        .filter((el) => !el.classList.contains("input-tipo-nuevo"))[0];

      let tipoId = null;
      let nombreNuevo = null;

      if (select) {
        if (select.value === "__nuevo__") {
          nombreNuevo = (inputNuevo?.value || "").trim();
        } else if (select.value) {
          tipoId = Number(select.value);
        }
      }

      const fecha_limite = inputFecha?.value || "";
      const descripcion = inputDesc?.value.trim() || null;

      // Si no hay tipo (id o nombre) o no hay fecha, ignoramos la fila
      if ((!tipoId && !nombreNuevo) || !fecha_limite) return;

      if (id) idsPresentes.push(id);

      rowsData.push({
        id,
        tipoId,
        nombreNuevo,
        fecha_limite,
        descripcion,
      });
    });

    if (!rowsData.length) {
      showAlert("No hay filas completas para guardar (tipo y fecha son obligatorios).");
      return;
    }

    // 1) Insertar los NUEVOS tipos de avance (si los hay)
    const nombreToId = {};
    tiposAvanceAdmin.forEach((t) => {
      nombreToId[t.nombre.toLowerCase()] = t.id;
    });

    const nombresNuevos = [
      ...new Set(rowsData.filter((r) => r.nombreNuevo).map((r) => r.nombreNuevo)),
    ];

    const insertsTipos = [];
    const nowBase = Date.now();
    nombresNuevos.forEach((nombre, idx) => {
      const key = nombre.toLowerCase();
      if (nombreToId[key]) return; // ya existe

      insertsTipos.push({
        codigo: `AUTO_${nowBase}_${idx}`,
        nombre,
      });
    });

    if (insertsTipos.length) {
      const { data: nuevosTipos, error: tiposErr } = await supabase
        .from("tipos_avance")
        .insert(insertsTipos)
        .select("id, nombre");

      if (tiposErr) {
        console.error("Error creando nuevos tipos de avance:", tiposErr);
        showAlert("❌ Error al crear nuevos tipos de avance.");
        return;
      }

      (nuevosTipos || []).forEach((t) => {
        nombreToId[t.nombre.toLowerCase()] = t.id;
        tiposAvanceAdmin.push(t);
      });
    }

    // 2) Armar registros para fechas_entrega_global
    const registros = [];

    rowsData.forEach((row) => {
      const finalTipoId =
        row.tipoId ||
        (row.nombreNuevo ? nombreToId[row.nombreNuevo.toLowerCase()] : null);

      if (!finalTipoId) return;

      const reg = {
        tipo_avance_id: finalTipoId,
        fecha_limite: row.fecha_limite,
        descripcion: row.descripcion,
        activo: true,
      };

      if (row.id) {
        reg.id = row.id;
      } else if (adminActualId) {
        reg.creado_por = adminActualId;
      }

      registros.push(reg);
    });

    if (!registros.length) {
      showAlert("No se pudo resolver ningún tipo de avance válido.");
      return;
    }

    // 3) upsert de todas las filas (nuevas + existentes)
    const { error } = await supabase
      .from("fechas_entrega_global")
      .upsert(registros, { onConflict: "id" });

    if (error) {
      console.error("Error guardando fechas globales:", error);
      showAlert("❌ Error al guardar las fechas.");
      return;
    }

    // 4) eliminar las que estaban en BD pero ya no están en la tabla
    const idsOriginales = fechasGlobales.map((f) => f.id);
    const idsAEliminar = idsOriginales.filter((id) => !idsPresentes.includes(id));

    if (idsAEliminar.length) {
      const { error: delErr } = await supabase
        .from("fechas_entrega_global")
        .delete()
        .in("id", idsAEliminar);

      if (delErr) {
        console.error("Error eliminando fechas globales:", delErr);
        showAlert("⚠️ Algunas filas no se pudieron eliminar.");
      }
    }

    showAlert("✅ Fechas globales guardadas correctamente.");
    await cargarFechasGlobales(); // refrescamos cache
    bootstrap.Modal.getInstance(modal).hide();
  });
}

/* ============================================================
   FORMULARIOS / ANEXOS (UI de ejemplo)
============================================================ */

const anexosDemo = [
  {
    id: 1,
    codigo: "ANX-01",
    titulo: "Anexo 01 – Evaluación de perfil",
    header: "",
    body: "",
    footer: "",
    orientacion: "portrait",
    borde: "simple",
    activo: true,
  },
  {
    id: 2,
    codigo: "ANX-02",
    titulo: "Anexo 02 – Informe de avance",
    header: "",
    body: "",
    footer: "",
    orientacion: "portrait",
    borde: "simple",
    activo: true,
  },
];

let anexoSeleccionado = null;

function inicializarFormulariosUI() {
  const lista = $("listaAnexos");
  const form = $("formAnexoConfig");
  if (!lista || !form) return;

  // Pintar lista demo
  lista.innerHTML = "";
  anexosDemo.forEach((anexo, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "list-group-item list-group-item-action" + (idx === 0 ? " active" : "");
    btn.dataset.anexoId = anexo.id;
    btn.textContent = anexo.titulo;
    lista.appendChild(btn);
  });

  // Seleccionar primero
  seleccionarAnexo(anexosDemo[0]?.id);

  // Click en lista
  lista.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-anexo-id]");
    if (!btn) return;

    const id = parseInt(btn.dataset.anexoId, 10);
    seleccionarAnexo(id);

    lista.querySelectorAll("[data-anexo-id]").forEach((el) =>
      el.classList.toggle("active", el === btn)
    );
  });

  // Guardar cambios del anexo (solo en memoria / consola)
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!anexoSeleccionado) return;

    anexoSeleccionado.titulo = $("anexoTitulo").value.trim();
    anexoSeleccionado.header = $("anexoHeader").value;
    anexoSeleccionado.body = $("anexoBody").value;
    anexoSeleccionado.footer = $("anexoFooter").value;
    anexoSeleccionado.orientacion = $("anexoOrientacion").value;
    anexoSeleccionado.borde = $("anexoBorder").value;
    anexoSeleccionado.activo = $("anexoActivo").value === "true";

    console.log("Anexo actualizado (conéctalo a Supabase aquí):", anexoSeleccionado);
    showAlert(
      "✅ Configuración de formulario guardada (solo en memoria, listo para conectar a BD)."
    );
  });

  // Botón “vista previa”
  const btnPreview = $("btnVistaPreviaAnexo");
  if (btnPreview) {
    btnPreview.addEventListener("click", () => {
      showAlert(
        "Aquí podrías abrir otra ventana/modal con una vista previa usando el HTML configurado."
      );
    });
  }
}

function seleccionarAnexo(id) {
  const anexo = anexosDemo.find((a) => a.id === id);
  if (!anexo) return;
  anexoSeleccionado = anexo;

  $("anexoCodigo").textContent = anexo.codigo;
  $("anexoTitulo").value = anexo.titulo;
  $("anexoHeader").value = anexo.header;
  $("anexoBody").value = anexo.body;
  $("anexoFooter").value = anexo.footer;
  $("anexoOrientacion").value = anexo.orientacion;
  $("anexoBorder").value = anexo.borde;
  $("anexoActivo").value = anexo.activo ? "true" : "false";
}

/* ============================================================
   AUDITORÍA (solo wiring básico)
============================================================ */

function inicializarAuditoriaUI() {
  const tbody = $("tbodyAuditoria");
  if (!tbody) return;

  // Por ahora solo un ejemplo estático
  tbody.innerHTML = `
    <tr>
      <td>2025-11-24 10:30</td>
      <td>admin${DOMINIO_ADMIN}</td>
      <td>Usuarios</td>
      <td>Crear</td>
      <td>Creó usuario de prueba</td>
    </tr>
  `;

  // Más adelante aquí puedes conectar con supabase:
  // supabase.from("auditoria_admin").select("*").order("fecha", { ascending: false })
}
