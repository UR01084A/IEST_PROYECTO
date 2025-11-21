const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!usuario) {
  window.location.href = "login.html";
}

// Mostrar nombre en header
if (document.getElementById("nombreUsuario")) {
  document.getElementById("nombreUsuario").textContent =
    usuario.nombre || usuario.email;
}

// Mostrar nombre en el título principal
if (document.getElementById("nombreUsuarioTitulo")) {
  document.getElementById("nombreUsuarioTitulo").textContent =
    usuario.nombre || usuario.email;
}
