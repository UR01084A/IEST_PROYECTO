// ===============================
// 🔹 DATOS SIMULADOS
// ===============================
const proyectos = [
  {
    id: 1,
    titulo: "Sistema de Gestión Escolar",
    docente: "Luis Paredes",
    fecha: "2025-10-01",
    archivo: "proyecto1.pdf",
    estado: "pendiente",
    observaciones: "",
  },
  {
    id: 2,
    titulo: "App de Reciclaje",
    docente: "Carla Gómez",
    fecha: "2025-09-25",
    archivo: "proyecto2.pdf",
    estado: "aprobado",
    observaciones: "Cumple los criterios.",
  },
  {
    id: 3,
    titulo: "Plataforma de Cursos",
    docente: "Miguel Torres",
    fecha: "2025-09-18",
    archivo: "proyecto3.pdf",
    estado: "desaprobado",
    observaciones: "No cumple con los requisitos mínimos.",
  },
];

// ===============================
// 🔹 RENDER PRINCIPAL DE PROYECTOS
// ===============================
function renderProyectos(filtro = "", estado = "") {
  const tbody = document.getElementById("tbodyProyectos");
  tbody.innerHTML = "";

  proyectos
    .filter(
      (p) =>
        p.titulo.toLowerCase().includes(filtro.toLowerCase()) &&
        (estado === "" || p.estado === estado)
    )
    .forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.titulo}</td>
        <td>${p.docente}</td>
        <td>${p.fecha}</td>
        <td><a href="${p.archivo}" target="_blank">Ver</a></td>
        <td><span class="badge bg-${getBadgeColor(p.estado)}">${p.estado}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-info" onclick="abrirEvaluacion(${p.id})">
            <i class="bi bi-search"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  actualizarDashboard();
  renderReportes();
}

// ===============================
// 🔹 FUNCIONES AUXILIARES
// ===============================
function getBadgeColor(estado) {
  switch (estado) {
    case "aprobado":
      return "success";
    case "desaprobado":
      return "danger";
    default:
      return "warning";
  }
}

// ===============================
// 🔹 MODAL DE EVALUACIÓN
// ===============================
let proyectoSeleccionado = null;

function abrirEvaluacion(id) {
  const p = proyectos.find((x) => x.id === id);
  proyectoSeleccionado = p;
  document.getElementById("visorArchivo").src = p.archivo;
  new bootstrap.Modal(document.getElementById("modalEvaluar")).show();
}

document
  .querySelector("#formEvaluacion .btn-success")
  .addEventListener("click", () => guardarEvaluacion("aprobado"));
document
  .querySelector("#formEvaluacion .btn-danger")
  .addEventListener("click", () => guardarEvaluacion("desaprobado"));

function guardarEvaluacion(estado) {
  if (!proyectoSeleccionado) return;

  const form = document.getElementById("formEvaluacion");
  const data = Object.fromEntries(new FormData(form).entries());
  proyectoSeleccionado.estado = estado;
  proyectoSeleccionado.observaciones = data.observaciones;

  bootstrap.Modal.getInstance(
    document.getElementById("modalEvaluar")
  ).hide();

  renderProyectos();
  renderChart();
}

// ===============================
// 🔹 DASHBOARD Y GRÁFICO
// ===============================
function actualizarDashboard() {
  const countPendientes = proyectos.filter((p) => p.estado === "pendiente").length;
  const countAprobados = proyectos.filter((p) => p.estado === "aprobado").length;
  const countDesaprobados = proyectos.filter((p) => p.estado === "desaprobado").length;

  document.getElementById("countPendientes").textContent = countPendientes;
  document.getElementById("countAprobados").textContent = countAprobados;
  document.getElementById("countDesaprobados").textContent = countDesaprobados;
}

let chartEstados;

function renderChart() {
  const ctx = document.getElementById("chartEstados");

  const data = [
    proyectos.filter((p) => p.estado === "pendiente").length,
    proyectos.filter((p) => p.estado === "aprobado").length,
    proyectos.filter((p) => p.estado === "desaprobado").length,
  ];

  if (chartEstados) chartEstados.destroy();

  chartEstados = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Pendientes", "Aprobados", "Desaprobados"],
      datasets: [
        {
          data,
          backgroundColor: ["#ffc107", "#28a745", "#dc3545"],
        },
      ],
    },
  });
}

// ===============================
// 🔹 REPORTES Y EXPORTACIÓN
// ===============================
function renderReportes() {
  const tbody = document.getElementById("tbodyReportes");
  tbody.innerHTML = "";
  proyectos.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.titulo}</td>
      <td>Evaluador</td>
      <td>${p.fecha}</td>
      <td><span class="badge bg-${getBadgeColor(p.estado)}">${p.estado}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function exportarExcel() {
  let csv = "Proyecto,Docente,Fecha,Estado,Observaciones\n";
  proyectos.forEach((p) => {
    csv += `"${p.titulo}","${p.docente}","${p.fecha}","${p.estado}","${p.observaciones}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "reporte_proyectos.csv";
  link.click();
}

function imprimirReporte() {
  const ventana = window.open("", "_blank");
  ventana.document.write(`
    <html><head><title>Reporte de Proyectos</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    </head><body class="p-4">
      <h3>Reporte General de Proyectos</h3>
      <table class="table table-bordered table-sm mt-3">
        <thead><tr><th>Proyecto</th><th>Docente</th><th>Fecha</th><th>Estado</th><th>Observaciones</th></tr></thead>
        <tbody>
          ${proyectos
            .map(
              (p) => `
              <tr>
                <td>${p.titulo}</td>
                <td>${p.docente}</td>
                <td>${p.fecha}</td>
                <td>${p.estado}</td>
                <td>${p.observaciones}</td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </body></html>
  `);
  ventana.document.close();
  ventana.print();
}

// ===============================
// 🔹 EVENTOS INICIALES
// ===============================
document.getElementById("buscar").addEventListener("input", (e) => {
  renderProyectos(e.target.value, document.getElementById("filtroEstado").value);
});

document.getElementById("filtroEstado").addEventListener("change", (e) => {
  renderProyectos(document.getElementById("buscar").value, e.target.value);
});

document.getElementById("btnExportarExcel").addEventListener("click", exportarExcel);
document.getElementById("btnImprimirReporte").addEventListener("click", imprimirReporte);

// ===============================
// 🔹 INICIO
// ===============================
renderProyectos();
renderChart();
