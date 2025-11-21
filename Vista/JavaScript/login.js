import { supabase } from "../Modelo/supabase.js";
import { getEmail, getPassword } from "../Vista/JavaScript/login.js";
import * as bcrypt from "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js";

const DASHBOARD = {
  1: "../Vista/admin_dashboard.html",
  2: "../Vista/jefeunidad_dashboard.html",
  3: "../Vista/docente_dashboard.html"
};

let intentos = 3;
let bloqueado = false;
let restanteSeg = 60;
let timerId = null;

const btnIngresar = document.getElementById("btnIngresar");
const emailLocal  = document.getElementById("emailLocal");
const passInput   = document.getElementById("password");
const timerBox    = document.getElementById("timerBox");
const timerSec    = document.getElementById("timerSec");

function setDisabled(disabled) {
  if (btnIngresar) btnIngresar.disabled = disabled;
  if (emailLocal)  emailLocal.disabled = disabled;
  if (passInput)   passInput.disabled = disabled;
}

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

document.addEventListener("UI_LOGIN_TRY", async () => {
  if (bloqueado) return;

  const email = getEmail();
  const pass  = getPassword();

  if (!email) { alert("Ingrese usuario"); return; }
  if (!pass)  { alert("Ingrese contraseña"); return; }

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, email, rol_id, password_hash, estado")
    .eq("email", email)
    .eq("estado", true)
    .maybeSingle();

  if (error || !data) {
    intentos--;
    if (intentos <= 0) { iniciarBloqueo(); return; }
    alert(`Usuario no encontrado. Intentos restantes: ${intentos}`);
    return;
  }

  try {
    const hash = data.password_hash || "";
    const ok = bcrypt.compareSync(pass, hash);

    if (!ok) {
      intentos--;
      if (intentos <= 0) { iniciarBloqueo(); return; }
      alert(`Contraseña incorrecta. Intentos restantes: ${intentos}`);
      return;
    }
  } catch (e) {
    console.error("Error comparando contraseña:", e);
    intentos--;
    if (intentos <= 0) { iniciarBloqueo(); return; }
    alert("Error comprobando contraseña.");
    return;
  }

  localStorage.setItem("user", JSON.stringify({
    id: data.id,
    email: data.email,
    rol: data.rol_id
  }));

  intentos = 3;
  alert("Inicio de sesión exitoso");
  window.location.href = DASHBOARD[data.rol_id] || "../Vista/admin_dashboard.html";
});
