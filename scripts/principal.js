document.addEventListener("DOMContentLoaded", () => {
	// ===== FORZAR MISMO LOCALSTORAGE ENTRE RUTAS =====
// Si los datos se guardaron desde otra carpeta, intenta acceder al almacenamiento global del navegador
if (!localStorage.getItem("partidos") && window.opener) {
  Object.keys(window.opener.localStorage).forEach(k => {
    localStorage.setItem(k, window.opener.localStorage.getItem(k));
  });
}

  const menuToggle = document.getElementById("menu-toggle");
  const menuLista = document.getElementById("menu-lista");
  const fecha = document.getElementById("fecha-actual");

  // ===== Menú responsive =====
  menuToggle.addEventListener("click", () => {
    menuLista.classList.toggle("activo");
  });

  // ===== Fecha actual =====
  const hoy = new Date();
  fecha.textContent = `${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()}`;

  // ===== Función para cargar datos del localStorage =====
  const loadArray = (key) => JSON.parse(localStorage.getItem(key) || "[]");

  // ===== Actualizar torneos en curso =====
  function mostrarTorneos() {
    const torneos = loadArray("torneos");
    const tbody = document.querySelector("section:nth-of-type(1) tbody");
    tbody.innerHTML = "";

    const activos = torneos.filter((t) => t.estado === "Activo");
    if (!activos.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="sin-datos">No hay torneos en curso actualmente.</td></tr>`;
      return;
    }

    activos.forEach((t) => {
      const finEstimado = calcularFinEstimado(t.inicio);
      tbody.innerHTML += `
        <tr>
          <td>${t.nombre}</td>
          <td>${t.deporte}</td>
          <td>${t.sede}</td>
          <td>${t.inicio}</td>
          <td>${finEstimado}</td>
        </tr>
      `;
    });
  }

  // Estimación de fecha de finalización (+30 días desde el inicio)
  function calcularFinEstimado(inicio) {
    const fecha = new Date(inicio);
    if (isNaN(fecha)) return "—";
    fecha.setDate(fecha.getDate() + 30);
    return fecha.toISOString().split("T")[0];
  }

  // ===== Actualizar próximos partidos =====
  function mostrarPartidos() {
    const partidos = loadArray("partidos");
    const torneos = loadArray("torneos");
    const tbody = document.querySelector("section:nth-of-type(2) tbody");
    tbody.innerHTML = "";

    if (!partidos.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="sin-datos">No hay partidos programados.</td></tr>`;
      return;
    }

    // Ordenar por fecha y hora
    const proximos = partidos
      .filter((p) => new Date(p.fecha) >= new Date())
      .sort((a, b) => new Date(a.fecha + " " + a.hora) - new Date(b.fecha + " " + b.hora));

    if (!proximos.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="sin-datos">No hay partidos próximos.</td></tr>`;
      return;
    }

    proximos.forEach((p) => {
      const torneo = torneos.find((t) => t.id === p.torneoId);
      tbody.innerHTML += `
        <tr>
          <td>${p.equipoA}</td>
          <td>vs</td>
          <td>${p.equipoB}</td>
          <td>${p.fecha}</td>
          <td>${p.hora}</td>
        </tr>
      `;
    });
  }

  // ===== Cargar datos iniciales =====
  mostrarTorneos();
  mostrarPartidos();

  // ===== Actualización automática cada 10 segundos =====
  setInterval(() => {
    mostrarTorneos();
    mostrarPartidos();
  }, 10000); // 10 segundos
});
