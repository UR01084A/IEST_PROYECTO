import { supabase } from "../../Modelo/supabase.js";

/* ============================================================
   1. OBTENER USUARIO DESDE LOCALSTORAGE
============================================================ */
function obtenerUsuarioActual() {
    const user = JSON.parse(localStorage.getItem("usuario"));
    if (!user || !user.id) {
        console.warn("No hay sesión activa.");
        window.location.href = "login.html";
        return null;
    }
    return user;
}

/* ============================================================
   2. CARGAR DATOS DEL PERFIL DESDE TABLA usuarios
============================================================ */
async function cargarPerfil() {
    const user = obtenerUsuarioActual();
    if (!user) return;

    const { data, error } = await supabase
        .from("usuarios")
        .select(`
            id,
            username,
            email,
            rol_id,
            password_hash,
            estado,
            fecha_creacion,
            foto_url,
            roles (nombre)
        `)
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Error al cargar perfil:", error);
        return;
    }

    console.log("PERFIL:", data);

    // Mostrar datos
    document.getElementById("inputUsername").value = data.username || "";
    document.getElementById("inputEmail").value = data.email || "";
    document.getElementById("inputRol").value = data.roles?.nombre || "";
    document.getElementById("inputEstado").value = data.estado ? "Activo" : "Inactivo";
    document.getElementById("inputFecha").value = new Date(data.fecha_creacion).toLocaleString();
    document.getElementById("inputPasswordHash").value = data.password_hash;

    if (data.foto_url) {
        document.getElementById("fotoPerfil").src = data.foto_url;
    }

    // Nombre en navbar
    const headerName = document.getElementById("userNameHeader");
    if (headerName) headerName.textContent = data.username;
}

cargarPerfil();

/* ============================================================
   3. SUBIR FOTO DE PERFIL (CORREGIDO)
============================================================ */
document.getElementById("inputFoto").addEventListener("change", async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    const user = obtenerUsuarioActual();
    if (!user) return;

    const extension = archivo.name.split(".").pop();
    const nombreArchivo = `foto_${user.id}.${extension}`;

    // 🚀 FIX: contentType obligatorio
    const { error: uploadError } = await supabase.storage
        .from("fotos_perfil")
        .upload(nombreArchivo, archivo, {
            upsert: true,
            cacheControl: "3600",
            contentType: archivo.type
        });

    if (uploadError) {
        console.error(uploadError);
        Swal.fire("Error", "No se pudo subir la foto", "error");
        return;
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
        .from("fotos_perfil")
        .getPublicUrl(nombreArchivo);

    const fotoURL = urlData.publicUrl;

    // Guardar en BD
    const { error: updateError } = await supabase
        .from("usuarios")
        .update({ foto_url: fotoURL })
        .eq("id", user.id);

    if (updateError) {
        Swal.fire("Error", "No se pudo guardar la foto en la base de datos", "error");
        return;
    }

    // Actualizar imagen en pantalla
    document.getElementById("fotoPerfil").src = fotoURL;
    Swal.fire("Éxito", "Foto de perfil actualizada", "success");
});

/* ============================================================
   4. ACTUALIZAR CONTRASEÑA
============================================================ */
document.getElementById("btnGuardar").addEventListener("click", async () => {
    const nuevaPass = document.getElementById("inputNuevaPassword").value.trim();

    if (nuevaPass === "") {
        Swal.fire("Sin cambios", "No ingresaste una nueva contraseña", "info");
        return;
    }

    const user = obtenerUsuarioActual();
    if (!user) return;

    const { error } = await supabase
        .from("usuarios")
        .update({ password_hash: nuevaPass })
        .eq("id", user.id);

    if (error) {
        Swal.fire("Error", "No se pudo actualizar la contraseña", "error");
        return;
    }

    Swal.fire("Éxito", "Contraseña actualizada correctamente", "success");
    document.getElementById("inputNuevaPassword").value = "";
});

/* ============================================================
   5. CERRAR SESIÓN
============================================================ */
document.getElementById("btnLogout").addEventListener("click", () => {
    localStorage.removeItem("usuario");
    window.location.href = "login.html";
});
