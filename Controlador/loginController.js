import { supabase } from "../../Modelo/supabase.js";
import * as bcrypt from "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js";

// ✅ Dashboards por rol
const DASHBOARD = {
  1: "../Vista/Vistas/admin_dashboard.html",
  2: "../Vista/Vistas/jefeunidad_dashboard.html",
  3: "../Vista/Vistas/docente_dashboard.html"
};

// Variables de control
let intentos = 3;
let bloqueado = false;
let restanteSeg = 60;
let timerId = null;

// Elementos del DOM
const btnIngresar = document.getElementById("btnIngresar");
const emailLocal  = document.getElementById("emailLocal");
const passInput   = document.getElementById("password");
const timerBox    = document.getElementById("timerBox");
const timerSec    = document.getElementById("timerSec");

// ✅ Función para desactivar controles
function setDisabled(disabled) {
  if (btnIngresar) btnIngresar.disabled = disabled;
  if (emailLocal)  emailLocal.disabled = disabled;
  if (passInput)   passInput.disabled = disabled;
}

// ✅ Bloqueo tras varios intentos fallidos
function iniciarBloqueo() {
  bloqueado = true;
  restanteSeg = 60;
  setDisabled(true);

  if (timerSec) timerSec.textContent = restanteSeg;
  if (timerBox) timerBox.classList.remove("hidden");

  timerId = setInterval(() => {
    restanteSeg--;
    if (timerSec) timerSec.textContent = restanteSeg;
    if (restanteSeg <= 0) {
      clearInterval(timerId);
      intentos = 3;
      bloqueado = false;
      setDisabled(false);
      if (timerBox) timerBox.classList.add("hidden");
    }
  }, 1000);
}

// ✅ Evento principal de login
document.addEventListener("UI_LOGIN_TRY", async () => {
  if (bloqueado) return;

  const email = getEmail();
  const pass  = getPassword();

  console.log("📧 Usuario:", email);
  console.log("🔐 Contraseña:", pass ? "(oculta)" : "vacía");

  if (!email) { alert("Ingrese usuario"); return; }
  if (!pass)  { alert("Ingrese contraseña"); return; }

  // Consulta a Supabase
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, email, rol_id, password_hash, estado")
    .eq("email", email)
    .eq("estado", true)
    .maybeSingle();

  console.log("📦 Resultado Supabase:", data, error);

  if (error || !data) {
    intentos--;
    if (intentos <= 0) { iniciarBloqueo(); return; }
    alert(`Usuario no encontrado. Intentos restantes: ${intentos}`);
    return;
  }

  // Comparar contraseña encriptada
  try {
    const hash = data.password_hash || "";
    const ok = bcrypt.compareSync(pass, hash);
    console.log("🔍 Comparación bcrypt:", ok);

    if (!ok) {
      intentos--;
      if (intentos <= 0) { iniciarBloqueo(); return; }
      alert(`Contraseña incorrecta. Intentos restantes: ${intentos}`);
      return;
    }
  } catch (e) {
    console.error("❌ Error comparando contraseña:", e);
    intentos--;
    if (intentos <= 0) { iniciarBloqueo(); return; }
    alert("Error comprobando contraseña.");
    return;
  }

  // ✅ Guardar sesión local
  localStorage.setItem("user", JSON.stringify({
    id: data.id,
    email: data.email,
    rol: data.rol_id
  }));

  intentos = 3;
  alert("✅ Inicio de sesión exitoso");
  window.location.href = DASHBOARD[data.rol_id] || "../Vista/Vistas/admin_dashboard.html";
});
