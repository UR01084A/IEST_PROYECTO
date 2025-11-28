// evaluar_formulario.js
// Calcula el puntaje del formulario (anexo 01–06) usando los rangos ORIGINALES
// y muestra el nivel (Bueno / Regular / Malo) y la condición (Aprobado / Desaprobado).

document.addEventListener("DOMContentLoaded", () => {

  // Tomamos el primer formulario de la página (si tuvieras más, puedes ajustar esto)
  const form = document.querySelector("form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // 1. Obtener valores del formulario
    //    Convención: cada ítem tiene value="1" si cumple / SÍ, y "0" si NO.
    const formData = new FormData(form);
    let total = 0;

    for (const [, value] of formData.entries()) {
      // sumamos solo cuando es "1" (si es "0" o cualquier otra cosa cuenta como 0)
      if (value === "1") {
        total += 1;
      }
    }

    // 2. Identificar qué anexo es según el ID del formulario
    const id = form.id; // ej: "formAnexo01", "formAnexo02", ...
    const rango = detectarRango(id, total);

    // 3. Mostrar resultado (puedes cambiar alert por SweetAlert si quieres)
    alert(
      "PUNTAJE OBTENIDO: " + total +
      "\nNIVEL: " + rango.nivel +
      "\nCONDICIÓN: " + rango.condicion
    );

    // Si luego quieres guardar estos datos en BD, tienes aquí el objeto:
    // rango.nivel, rango.condicion, total
    // (por ahora solo mostramos el alert)
  });

  // ============================================================
  // FUNCIÓN QUE APLICA EL RANGO SEGÚN EL ANEXO (puntajes ORIGINALES)
  // ============================================================
  function detectarRango(id, total) {

    // ANEXO 01 → Investigación Aplicada (35 ítems)
    // 25 – 35 (Bueno)  => Aprobado
    // 16 – 24 (Regular)=> Desaprobado
    // 00 – 15 (Malo)   => Desaprobado
    if (id === "formAnexo01") {
      if (total >= 25) return { nivel: "Bueno",   condicion: "Aprobado" };
      if (total >= 16) return { nivel: "Regular", condicion: "Desaprobado" };
      return             { nivel: "Malo",    condicion: "Desaprobado" };
    }

    // ANEXO 02 → Innovación Tecnológica (29 ítems)
    // 20 – 29 (Bueno)  => Aprobado
    // 11 – 19 (Regular)=> Desaprobado
    // 00 – 10 (Malo)   => Desaprobado
    if (id === "formAnexo02") {
      if (total >= 20) return { nivel: "Bueno",   condicion: "Aprobado" };
      if (total >= 11) return { nivel: "Regular", condicion: "Desaprobado" };
      return             { nivel: "Malo",    condicion: "Desaprobado" };
    }

    // ANEXO 03 → Innovación Pedagógica (27 ítems)
    // 20 – 27 (Bueno)  => Aprobado
    // 11 – 19 (Regular)=> Desaprobado
    // 00 – 10 (Malo)   => Desaprobado
    if (id === "formAnexo03") {
      if (total >= 20) return { nivel: "Bueno",   condicion: "Aprobado" };
      if (total >= 11) return { nivel: "Regular", condicion: "Desaprobado" };
      return             { nivel: "Malo",    condicion: "Desaprobado" };
    }

    // ANEXO 04 → Informe Final Aplicada (47 ítems)
    // 33 – 47 (Bueno)  => Aprobado
    // 22 – 32 (Regular)=> Desaprobado
    // 00 – 21 (Malo)   => Desaprobado
    if (id === "formAnexo04") {
      if (total >= 33) return { nivel: "Bueno",   condicion: "Aprobado" };
      if (total >= 22) return { nivel: "Regular", condicion: "Desaprobado" };
      return             { nivel: "Malo",    condicion: "Desaprobado" };
    }

    // ANEXO 05 → Informe Final Tecnológica (40 ítems)
    // 28 – 40 (Bueno)  => Aprobado
    // 15 – 27 (Regular)=> Desaprobado
    // 00 – 14 (Malo)   => Desaprobado
    if (id === "formAnexo05") {
      if (total >= 28) return { nivel: "Bueno",   condicion: "Aprobado" };
      if (total >= 15) return { nivel: "Regular", condicion: "Desaprobado" };
      return             { nivel: "Malo",    condicion: "Desaprobado" };
    }

    // ANEXO 06 → Informe Final Pedagógico Institucional (38 ítems)
    // 27 – 38 (Bueno)  => Aprobado
    // 14 – 26 (Regular)=> Desaprobado
    // 00 – 13 (Malo)   => Desaprobado
    if (id === "formAnexo06") {
      if (total >= 27) return { nivel: "Bueno",   condicion: "Aprobado" };
      if (total >= 14) return { nivel: "Regular", condicion: "Desaprobado" };
      return             { nivel: "Malo",    condicion: "Desaprobado" };
    }

    // Si por alguna razón el ID no coincide con ningún anexo
    return { nivel: "-", condicion: "-" };
  }

});
