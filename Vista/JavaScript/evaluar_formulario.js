document.addEventListener("DOMContentLoaded", () => {

    const form = document.querySelector("form");
    if (!form) return;

    form.addEventListener("submit", e => {
        e.preventDefault();

        // 1. Obtener valores del formulario (SÍ = 1, NO = 0)
        const formData = new FormData(form);
        let total = 0;

        for (let [key, value] of formData.entries()) {
            total += value === "1" ? 1 : 0;
        }

        // 2. Identificar qué formulario es según su ID
        const id = form.id;
        let rango = detectarRango(id, total);

        // 3. Mostrar resultado
        alert(
            "PUNTAJE OBTENIDO: " + total +
            "\nNIVEL: " + rango.nivel +
            "\nCONDICIÓN: " + rango.condicion
        );
    });


    // ============================================================
    //         FUNCIÓN QUE APLICA EL RANGO SEGÚN EL FORMULARIO
    // ============================================================
    function detectarRango(id, total) {

        // ANEXO 01 → Investigación Aplicada (35 preguntas)
        if (id === "formAnexo01") {
            if (total >= 25) return {nivel:"Bueno", condicion:"Aprobado"};
            if (total >= 16) return {nivel:"Regular", condicion:"Desaprobado"};
            return {nivel:"Malo", condicion:"Desaprobado"};
        }

        // ANEXO 02 → Innovación Tecnológica (29 preguntas)
        if (id === "formAnexo02") {
            if (total >= 20) return {nivel:"Bueno", condicion:"Aprobado"};
            if (total >= 11) return {nivel:"Regular", condicion:"Desaprobado"};
            return {nivel:"Malo", condicion:"Desaprobado"};
        }

        // ANEXO 03 → Innovación Pedagógica (27 preguntas)
        if (id === "formAnexo03") {
            if (total >= 20) return {nivel:"Bueno", condicion:"Aprobado"};
            if (total >= 11) return {nivel:"Regular", condicion:"Desaprobado"};
            return {nivel:"Malo", condicion:"Desaprobado"};
        }

        // ANEXO 04 → Informe Final Aplicada (47 preguntas)
        if (id === "formAnexo04") {
            if (total >= 33) return {nivel:"Bueno", condicion:"Aprobado"};
            if (total >= 22) return {nivel:"Regular", condicion:"Desaprobado"};
            return {nivel:"Malo", condicion:"Desaprobado"};
        }

        // ANEXO 05 → Informe Final Tec. (40 preguntas)
        if (id === "formAnexo05") {
            if (total >= 28) return {nivel:"Bueno", condicion:"Aprobado"};
            if (total >= 15) return {nivel:"Regular", condicion:"Desaprobado"};
            return {nivel:"Malo", condicion:"Desaprobado"};
        }

        // ANEXO 06 → Informe Final Pedagógico (38 preguntas)
        if (id === "formAnexo06") {
            if (total >= 27) return {nivel:"Bueno", condicion:"Aprobado"};
            if (total >= 14) return {nivel:"Regular", condicion:"Desaprobado"};
            return {nivel:"Malo", condicion:"Desaprobado"};
        }

        // Si algo falla
        return {nivel:"-", condicion:"-"};
    }

});
