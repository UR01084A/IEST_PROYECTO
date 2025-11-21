import { supabase } from "../../Modelo/supabase.js";

// Función para limpiar nombres de archivo
function sanitizeFileName(name) {
    return name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // quitar tildes
        .replace(/[^\w.-]/g, "_")                          // reemplazar caracteres raros
        .replace(/\s+/g, "_")                              // reemplazar espacios
        .toLowerCase();                                    // opcional: hacer minúsculas
}

export async function uploadFile() {
    const fileInput = document.getElementById("fileInput");
    const result = document.getElementById("result");
    const preview = document.getElementById("preview");

    if (fileInput.files.length === 0) {
        result.textContent = "Selecciona un archivo primero.";
        result.style.color = "red";
        return;
    }

    const file = fileInput.files[0];

    // Sanitizamos el nombre original del archivo
    const cleanName = sanitizeFileName(file.name);

    // Crear nombre único limpio
    const filePath = `uploads/${Date.now()}_${cleanName}`;

    const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(file.type)) {
        result.textContent = "Solo se permiten PDF o DOCX.";
        result.style.color = "red";
        return;
    }

    const { error } = await supabase.storage
        .from("archivos")
        .upload(filePath, file);

    if (error) {
        result.textContent = "Error al subir: " + error.message;
        result.style.color = "red";
        return;
    }

    const { data } = supabase.storage
        .from("archivos")
        .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    result.textContent = "Archivo subido correctamente ✔";
    result.style.color = "green";

    if (file.type === "application/pdf") {
        preview.innerHTML = `
            <iframe src="${publicUrl}" width="100%" height="500px"></iframe>
        `;
    } else {
        preview.innerHTML = `
            <a href="${publicUrl}" target="_blank">📄 Abrir documento Word</a>
        `;
    }
}

window.uploadFile = uploadFile;
