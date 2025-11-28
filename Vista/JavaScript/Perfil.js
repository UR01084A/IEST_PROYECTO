import { supabase } from "../../Modelo/supabase.js";

/* ============================================================
   UTILIDADES BÁSICAS
============================================================ */
const $ = (id) => document.getElementById(id);

function obtenerUsuarioActual() {
    const user = JSON.parse(localStorage.getItem("usuario"));
    if (!user || !user.id) {
        console.warn("No hay sesión activa.");
        window.location.href = "login.html";
        return null;
    }
    return user;
}

function setBtnLoading(btn, isLoading, textoNormal = "Guardar cambios") {
    if (!btn) return;
    btn.disabled = isLoading;
    btn.textContent = isLoading ? "Guardando..." : textoNormal;
}

/* ============================================================
   HASH DE CONTRASEÑA (BCRYPT EN EL CLIENTE)
   - Usamos la librería bcryptjs incluida en el HTML
============================================================ */
function hashPasswordBcrypt(password, saltRounds = 10) {
    return new Promise((resolve, reject) => {
        if (typeof bcrypt === "undefined") {
            return reject(
                new Error("No se encontró la librería bcryptjs en la página.")
            );
        }

        bcrypt.genSalt(saltRounds, (err, salt) => {
            if (err) return reject(err);

            bcrypt.hash(password, salt, (errHash, hash) => {
                if (errHash) return reject(errHash);
                resolve(hash);
            });
        });
    });
}


/* ============================================================
   1. CARGAR DATOS DEL PERFIL
============================================================ */
async function cargarPerfil() {
    const user = obtenerUsuarioActual();
    if (!user) return;

    try {
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
            Swal.fire("Error", "No se pudo cargar la información del perfil.", "error");
            return;
        }

        // Mostrar datos en inputs
        $("inputUsername").value = data.username || "";
        $("inputEmail").value = data.email || "";
        $("inputRol").value = data.roles?.nombre || "";
        $("inputEstado").value = data.estado ? "Activo" : "Inactivo";
        $("inputFecha").value = data.fecha_creacion
            ? new Date(data.fecha_creacion).toLocaleString()
            : "";

        // Mostramos texto genérico, no el hash real
        const inputHash = $("inputPasswordHash");
        if (inputHash) {
            inputHash.value = data.password_hash ? "******** (hash almacenado)" : "";
        }

        // Foto
        if (data.foto_url) {
            $("fotoPerfil").src = data.foto_url;
        }

        // Nombre en el header
        const headerName = $("userNameHeader");
        if (headerName) headerName.textContent = data.username || "Usuario";
    } catch (err) {
        console.error("Excepción al cargar perfil:", err);
        Swal.fire("Error", "Ocurrió un problema inesperado al cargar el perfil.", "error");
    }
}

/* ============================================================
   2. SUBIR FOTO DE PERFIL (carpeta por usuario)
============================================================ */
function inicializarCambioFoto() {
    const inputFoto = $("inputFoto");
    if (!inputFoto) return;

    inputFoto.addEventListener("change", async (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;

        const user = obtenerUsuarioActual();
        if (!user) return;

        // Validar tipo de archivo
        const tiposPermitidos = ["image/jpeg", "image/png", "image/jpg"];
        if (!tiposPermitidos.includes(archivo.type)) {
            Swal.fire(
                "Formato no permitido",
                "Solo se permiten imágenes JPG, JPEG o PNG.",
                "warning"
            );
            inputFoto.value = "";
            return;
        }

        // Validar tamaño (máx. 3 MB)
        const maxMB = 3;
        const maxBytes = maxMB * 1024 * 1024;
        if (archivo.size > maxBytes) {
            Swal.fire(
                "Archivo muy pesado",
                `La imagen debe pesar máximo ${maxMB} MB.`,
                "warning"
            );
            inputFoto.value = "";
            return;
        }

        // Vista previa rápida antes de subir
        const reader = new FileReader();
        reader.onload = (ev) => {
            $("fotoPerfil").src = ev.target.result;
        };
        reader.readAsDataURL(archivo);

        try {
            // ===== RUTA NUEVA: <uid>/foto-perfil.ext =====
            let extension = archivo.name.split(".").pop()?.toLowerCase();
            if (!extension || extension.length > 5) {
                extension = archivo.type === "image/png" ? "png" : "jpg";
            }

            const nombreArchivo = `${user.id}/foto-perfil.${extension}`;

            const { error: uploadError } = await supabase.storage
                .from("fotos_perfil")
                .upload(nombreArchivo, archivo, {
                    upsert: true,
                    cacheControl: "3600",
                    contentType: archivo.type,
                });

            if (uploadError) {
                console.error(uploadError);
                Swal.fire("Error", "No se pudo subir la foto.", "error");
                return;
            }

            // Obtener URL pública
            const { data: urlData } = supabase.storage
                .from("fotos_perfil")
                .getPublicUrl(nombreArchivo);

            const fotoURL = urlData?.publicUrl;
            if (!fotoURL) {
                Swal.fire("Error", "No se pudo obtener la URL pública de la foto.", "error");
                return;
            }

            // Guardar en BD
            const { error: updateError } = await supabase
                .from("usuarios")
                .update({ foto_url: fotoURL })
                .eq("id", user.id);

            if (updateError) {
                console.error(updateError);
                Swal.fire(
                    "Error",
                    "La foto se subió, pero no se pudo guardar en la base de datos.",
                    "error"
                );
                return;
            }

            $("fotoPerfil").src = fotoURL;
            Swal.fire("Éxito", "Foto de perfil actualizada correctamente.", "success");
        } catch (err) {
            console.error("Excepción al subir foto:", err);
            Swal.fire("Error", "Ocurrió un problema al actualizar la foto de perfil.", "error");
        } finally {
            inputFoto.value = "";
        }
    });
}

/* ============================================================
   3. ACTUALIZAR CONTRASEÑA (bcrypt automático)
============================================================ */
async function actualizarPassword() {
    const nuevaPass = $("inputNuevaPassword").value.trim();
    const btnGuardar = $("btnGuardar");

    if (!nuevaPass) {
        Swal.fire("Sin cambios", "No ingresaste una nueva contraseña.", "info");
        return;
    }

    if (nuevaPass.length < 8) {
        Swal.fire(
            "Contraseña muy corta",
            "La contraseña debe tener al menos 8 caracteres.",
            "warning"
        );
        return;
    }

    const confirmar = await Swal.fire({
        title: "Confirmar cambio",
        text: "¿Deseas actualizar tu contraseña?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, actualizar",
        cancelButtonText: "Cancelar",
    });

    if (!confirmar.isConfirmed) return;

    const user = obtenerUsuarioActual();
    if (!user) return;

    try {
        setBtnLoading(btnGuardar, true);

        // 1) Generar hash bcrypt en el navegador
        const passwordHash = await hashPasswordBcrypt(nuevaPass);

        // 2) Guardar solo el hash en Supabase
        const { error } = await supabase
            .from("usuarios")
            .update({ password_hash: passwordHash })
            .eq("id", user.id);

        if (error) {
            console.error(error);
            Swal.fire("Error", "No se pudo actualizar la contraseña.", "error");
            return;
        }

        Swal.fire("Éxito", "Contraseña actualizada correctamente.", "success");
        $("inputNuevaPassword").value = "";

        const inputHash = $("inputPasswordHash");
        if (inputHash) {
            inputHash.value = "******** (hash actualizado)";
        }
    } catch (err) {
        console.error("Excepción al actualizar contraseña:", err);
        Swal.fire(
            "Error",
            err.message || "Ocurrió un problema al actualizar la contraseña.",
            "error"
        );
    } finally {
        setBtnLoading(btnGuardar, false);
    }
}

function inicializarCambioPassword() {
    const btnGuardar = $("btnGuardar");
    if (!btnGuardar) return;

    btnGuardar.addEventListener("click", actualizarPassword);
}

/* ============================================================
   4. CERRAR SESIÓN
============================================================ */
function inicializarLogout() {
    const btnLogout = $("btnLogout");
    if (!btnLogout) return;

    btnLogout.addEventListener("click", async () => {
        const res = await Swal.fire({
            title: "Cerrar sesión",
            text: "¿Seguro que deseas salir?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, salir",
            cancelButtonText: "Cancelar",
        });

        if (!res.isConfirmed) return;

        localStorage.removeItem("usuario");
        window.location.href = "login.html";
    });
}

/* ============================================================
   5. INICIALIZACIÓN GENERAL
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
    cargarPerfil();
    inicializarCambioFoto();
    inicializarCambioPassword();
    inicializarLogout();
});
