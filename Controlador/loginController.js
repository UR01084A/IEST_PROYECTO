import { supabase } from "../Modelo/supabase.js";

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        Swal.fire("Error", "Credenciales incorrectas", "error");
        return;
    }

    // Guardamos el usuario en localStorage
    localStorage.setItem("usuario", JSON.stringify(data.user));

    Swal.fire("Bienvenido", "Inicio de sesión exitoso", "success");

    // Redirigir según el rol
    // 1 = ADMIN, 2 = DOCENTE, 3 = JEFE DE UNIDAD
    const { data: userData } = await supabase
        .from("usuarios")
        .select("rol_id")
        .eq("id", data.user.id)
        .single();

    if (userData.rol_id === 1) window.location.href = "admin_dashboard.html";
    if (userData.rol_id === 2) window.location.href = "docente_dashboard.html";
    if (userData.rol_id === 3) window.location.href = "jefunidad_dashboard.html";
});
