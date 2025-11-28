import { supabase } from "../../Modelo/supabase.js";

const emailInput = document.getElementById("emailLocal");
const passwordInput = document.getElementById("password");
const btnIngresar = document.getElementById("btnIngresar");
const btnCancelar = document.getElementById("btnCancelar");
const domainSpan = document.getElementById("domain");

// 🔹 Dominios automáticos según tipo de usuario
const dominios = {
  admin: "@institutocajasAdmin.edu.pe",
  jefe: "@institutocajasEvaluador.edu.pe",
  docente: "@institutocajas.edu.pe",
};

// 🔹 Actualizar dominio automáticamente
emailInput.addEventListener("input", () => {
  const valor = emailInput.value.trim().toLowerCase();
  domainSpan.textContent = dominios[valor] || "@institutocajas.edu.pe";
});

// 🔹 Unir el usuario + dominio
function getEmail() {
  const local = emailInput.value.trim().toLowerCase();
  const dominio = domainSpan.textContent;
  return local ? `${local}${dominio}` : "";
}

// 🔹 Inicio de sesión
btnIngresar.addEventListener("click", async () => {
  const email = getEmail();
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Por favor ingrese usuario y contraseña");
    return;
  }

  try {
    // Buscar usuario
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error || !data) {
      alert("Usuario no encontrado");
      return;
    }

    // Validación simple de contraseña
    if (password !== "12345") {
      alert("Contraseña incorrecta");
      return;
    }

    // Guardamos al usuario en localStorage
    localStorage.setItem("usuario", JSON.stringify(data));

    // Redirigir por rol
    switch (data.rol_id) {
      case 1:
        window.location.href = "admin_dashboard.html";
        break;
      case 2:
        window.location.href = "jefeunidad_dashboard.html";
        break;
      case 3:
        window.location.href = "docente_dashboard.html";
        break;
      default:
        alert("Rol no definido");
    }

  } catch (err) {
    console.error("Error al iniciar sesión:", err);
    alert("Ocurrió un error al intentar iniciar sesión");
  }
});

// 🔹 Botón Cancelar
btnCancelar.addEventListener("click", () => {
  emailInput.value = "";
  passwordInput.value = "";
  domainSpan.textContent = "@institutocajas.edu.pe";
});
