// aplicar_tema_global.js
// Lee el tema guardado por el admin y lo aplica a la página actual
// (dashboards, formularios y login).

const THEME_KEY = "admin_tema_investigacion";

// Valores por defecto (por si falta algo en el tema guardado)
const DEFAULT_THEME = {
  esquema: "azul",
  primary: "#0f6cfb",
  header: "#0f172a",
  background: "#f1f5f9",
  card: "#ffffff",
  text: "#0f172a",

  // Login
  loginBg: "#0d2c3f",
  loginCardBg: "rgba(255,255,255,0.18)",
  loginText: "#ffffff",

  // Opciones avanzadas
  navbarLink: "#ffffff",
  navbarLinkActive: "#ffffff",
  btnPrimaryBg: "#0f6cfb",
  btnPrimaryText: "#ffffff",
  tableHeaderBg: "#e5e7eb",
  tableHeaderText: "#0f172a",
};

/* ============================================================
   UTILIDADES
============================================================ */

function mergeTema(raw) {
  if (!raw) return { ...DEFAULT_THEME };
  return { ...DEFAULT_THEME, ...raw };
}

function cargarTemaGuardado() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) return { ...DEFAULT_THEME };
    const parsed = JSON.parse(raw);
    return mergeTema(parsed);
  } catch {
    return { ...DEFAULT_THEME };
  }
}

/** Devuelve true si la ruta / body / formularios parecen de login */
function esPaginaLogin() {
  const path = window.location.pathname.toLowerCase();
  const body = document.body || document.documentElement;

  const porRuta = path.includes("login");
  const porClase = body.classList.contains("login-page");
  const porForm =
    document.querySelector("form#loginForm") ||
    document.querySelector("form[id*='login']");
  const porContenedor = document.querySelector(".login-container");

  return Boolean(porRuta || porClase || porForm || porContenedor);
}

/** Convierte "#rrggbb" a {r,g,b} */
function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return { r: 0, g: 0, b: 0 };
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

/** Devuelve blanco o casi-negro según qué contraste mejor */
function getContrastingTextColor(bgHex) {
  const { r, g, b } = hexToRgb(bgHex);
  const luminancia = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminancia > 140 ? "#0f172a" : "#ffffff";
}

function aplicarStyles(el, styles) {
  if (!el) return;
  Object.entries(styles).forEach(([prop, value]) => {
    if (value !== undefined && value !== null) {
      el.style[prop] = value;
    }
  });
}

/* ============================================================
   APLICAR TEMA EN LOGIN
============================================================ */

function aplicarTemaLogin(tema) {
  const header = tema.header;
  const primary = tema.primary;
  const background = tema.background;
  const card = tema.card;
  const text = tema.text;

  const headerText = getContrastingTextColor(header);
  const primaryText = getContrastingTextColor(primary);

  // Colores específicos derivados para login
  const loginBg = tema.loginBg || header || background; // fondo de toda la pantalla
  const loginCardBg = tema.loginCardBg || card;         // fondo del cuadro de login
  const loginText = tema.loginText || getContrastingTextColor(loginCardBg);

  // Variables CSS globales
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--color-header-bg", header);
  rootStyle.setProperty("--color-header-text", headerText);
  rootStyle.setProperty("--color-primary", primary);
  rootStyle.setProperty("--color-primary-text", primaryText);
  rootStyle.setProperty("--color-page-bg", background);
  rootStyle.setProperty("--color-card-bg", card);
  rootStyle.setProperty("--color-card-text", text);

  rootStyle.setProperty("--color-login-bg", loginBg);
  rootStyle.setProperty("--color-login-card-bg", loginCardBg);
  rootStyle.setProperty("--color-login-text", loginText);

  // variables avanzadas (aunque en login casi no se usan)
  const navbarLink = tema.navbarLink || headerText;
  const navbarLinkActive = tema.navbarLinkActive || primaryText;
  const btnPrimaryBg = tema.btnPrimaryBg || primary;
  const btnPrimaryText = tema.btnPrimaryText || primaryText;
  const tableHeaderBg = tema.tableHeaderBg || primary;
  const tableHeaderText = tema.tableHeaderText || primaryText;

  rootStyle.setProperty("--color-navbar-link", navbarLink);
  rootStyle.setProperty("--color-navbar-link-active", navbarLinkActive);
  rootStyle.setProperty("--color-btn-primary-bg", btnPrimaryBg);
  rootStyle.setProperty("--color-btn-primary-text", btnPrimaryText);
  rootStyle.setProperty("--color-table-header-bg", tableHeaderBg);
  rootStyle.setProperty("--color-table-header-text", tableHeaderText);

  // Fondo general de la página de login
  if (document.body) {
    document.body.style.backgroundColor = loginBg;
    document.body.style.color = loginText;
  }

  // Contenedor principal del login
  document.querySelectorAll(".login-container").forEach((wrapper) => {
    aplicarStyles(wrapper, {
      background: loginBg,
      color: loginText,
    });
  });

  // Tarjeta principal de login (el cuadro)
  document
    .querySelectorAll(".login-card, .card-login")
    .forEach((cardEl) => {
      aplicarStyles(cardEl, {
        backgroundColor: loginCardBg,
        color: loginText,
        borderColor: "rgba(255, 255, 255, 0.15)",
      });
    });

  // Botón principal de login
  document.querySelectorAll(".btn-login").forEach((btn) => {
    aplicarStyles(btn, {
      backgroundColor: btnPrimaryBg,
      borderColor: btnPrimaryBg,
      color: btnPrimaryText,
    });
  });

  // Botón secundario de login
  document.querySelectorAll(".btn-secondary").forEach((btn) => {
    aplicarStyles(btn, {
      backgroundColor: "transparent",
      borderColor: primary,
      color: primary,
    });
  });

  // Iconos dentro de inputs
  document.querySelectorAll(".input-group .icon").forEach((icon) => {
    icon.style.color = primary;
  });

  // Span del dominio (@institutocajas.edu.pe)
  document.querySelectorAll(".domain").forEach((span) => {
    aplicarStyles(span, {
      backgroundColor: primary,
      color: primaryText,
    });
  });

  // Título principal del login
  document
    .querySelectorAll(".titulo-login, .login-title, h1, h2")
    .forEach((tit) => {
      tit.style.color = loginText;
    });
}

/* ============================================================
   APLICAR TEMA GENERAL (dashboards, formularios, etc.)
============================================================ */

function aplicarTemaGeneral(tema) {
  const header = tema.header;
  const primary = tema.primary;
  const background = tema.background;
  const card = tema.card;
  const text = tema.text;

  const headerText = getContrastingTextColor(header);
  const primaryText = getContrastingTextColor(primary);

  // avanzados
  const navbarLink = tema.navbarLink || headerText;
  const navbarLinkActive = tema.navbarLinkActive || primaryText;
  const btnPrimaryBg = tema.btnPrimaryBg || primary;
  const btnPrimaryText = tema.btnPrimaryText || primaryText;
  const tableHeaderBg = tema.tableHeaderBg || primary;
  const tableHeaderText = tema.tableHeaderText || primaryText;

  // ==== 1. Variables CSS globales ====
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--color-header-bg", header);
  rootStyle.setProperty("--color-header-text", headerText);
  rootStyle.setProperty("--color-primary", primary);
  rootStyle.setProperty("--color-primary-text", primaryText);
  rootStyle.setProperty("--color-page-bg", background);
  rootStyle.setProperty("--color-card-bg", card);
  rootStyle.setProperty("--color-card-text", text);
  rootStyle.setProperty("--color-text-main", text);

  rootStyle.setProperty("--color-login-bg", tema.loginBg || header);
  rootStyle.setProperty("--color-login-card-bg", tema.loginCardBg || card);
  rootStyle.setProperty(
    "--color-login-text",
    tema.loginText || getContrastingTextColor(tema.loginCardBg || card)
  );

  // nuevas vars
  rootStyle.setProperty("--color-navbar-link", navbarLink);
  rootStyle.setProperty("--color-navbar-link-active", navbarLinkActive);
  rootStyle.setProperty("--color-btn-primary-bg", btnPrimaryBg);
  rootStyle.setProperty("--color-btn-primary-text", btnPrimaryText);
  rootStyle.setProperty("--color-table-header-bg", tableHeaderBg);
  rootStyle.setProperty("--color-table-header-text", tableHeaderText);

  // ==== 2. Fondo general ====
  if (document.body) {
    document.body.style.backgroundColor = background;
    document.body.style.color = text;
  }

  // ==== 3. Barras de navegación / topbars ====
  const navbars = document.querySelectorAll(
    "nav.navbar, header.navbar, .navbar-main, .topbar, .topbar-docente, .topbar-evaluador"
  );

  navbars.forEach((nb) => {
    aplicarStyles(nb, {
      backgroundColor: header,
      color: headerText,
    });

    nb.querySelectorAll(".nav-link, .navbar-brand, .navbar-text, a").forEach((link) => {
      link.style.color = navbarLink;
    });

    nb
      .querySelectorAll(".nav-link.active, .nav-item.active > .nav-link")
      .forEach((link) => {
        link.style.color = navbarLinkActive;
        link.style.borderBottom = `2px solid ${primary}`;
      });
  });

  // ==== 4. Tarjetas / paneles ====
  document
    .querySelectorAll(".card, .panel, .box, .dashboard-card")
    .forEach((cardEl) => {
      if (cardEl.dataset.theme === "ignore") return;
      aplicarStyles(cardEl, {
        backgroundColor: card,
        color: text,
      });
    });

  // ==== 5. Títulos y textos importantes ====
  document
    .querySelectorAll(
      "h1, h2, h3, h4, h5, h6, .card-title, .card-header, .section-title"
    )
    .forEach((el) => {
      if (el.dataset.theme === "ignore") return;
      el.style.color = text;
    });

  // ==== 6. Botones ====
  document.querySelectorAll(".btn-primary").forEach((btn) => {
    if (btn.dataset.theme === "ignore") return;
    aplicarStyles(btn, {
      backgroundColor: btnPrimaryBg,
      borderColor: btnPrimaryBg,
      color: btnPrimaryText,
    });
  });

  document
    .querySelectorAll(".btn-outline-primary, .btn-secondary")
    .forEach((btn) => {
      if (btn.dataset.theme === "ignore") return;
      aplicarStyles(btn, {
        borderColor: primary,
        color: primary,
      });
    });

  // ==== 7. Tablas (cabecera) ====
  document
    .querySelectorAll("table thead, table thead tr")
    .forEach((thead) => {
      if (thead.dataset.theme === "ignore") return;
      aplicarStyles(thead, {
        backgroundColor: tableHeaderBg,
        color: tableHeaderText,
      });
    });

  // ==== 8. Inputs en foco (mínimo) ====
  document
    .querySelectorAll("input, select, textarea")
    .forEach((el) => {
      el.addEventListener("focus", () => {
        el.style.borderColor = primary;
        el.style.boxShadow = `0 0 0 0.1rem ${primary}33`;
      });
      el.addEventListener("blur", () => {
        el.style.boxShadow = "";
      });
    });

  // ==== 9. Data-atributos para afinar manualmente ====
  // data-theme-bg="page|card|header|primary"
  document.querySelectorAll("[data-theme-bg]").forEach((el) => {
    switch (el.dataset.themeBg) {
      case "page":
        el.style.backgroundColor = background;
        break;
      case "card":
        el.style.backgroundColor = card;
        break;
      case "header":
        el.style.backgroundColor = header;
        el.style.color = headerText;
        break;
      case "primary":
        el.style.backgroundColor = primary;
        el.style.color = primaryText;
        break;
    }
  });

  // data-theme-text="main|inverse|primary"
  document.querySelectorAll("[data-theme-text]").forEach((el) => {
    switch (el.dataset.themeText) {
      case "main":
        el.style.color = text;
        break;
      case "inverse":
        el.style.color = getContrastingTextColor(
          window.getComputedStyle(el).backgroundColor || header
        );
        break;
      case "primary":
        el.style.color = primary;
        break;
    }
  });
}

/* ============================================================
   FUNCIÓN PÚBLICA
============================================================ */

export function aplicarTemaGlobalEnPagina() {
  const tema = cargarTemaGuardado();
  if (!tema) return;

  if (esPaginaLogin()) {
    aplicarTemaLogin(tema);
  } else {
    aplicarTemaGeneral(tema);
  }
}

/* ============================================================
   AUTO-APLICAR AL CARGAR
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  aplicarTemaGlobalEnPagina();
});
