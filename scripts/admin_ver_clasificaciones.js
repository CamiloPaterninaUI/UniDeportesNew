document.addEventListener("DOMContentLoaded", () => {
    // Referencias a elementos del DOM
    const filtroTorneo = document.getElementById("filtro-torneo");
    const listaClasificacionesCuerpo = document.getElementById("lista-clasificaciones-cuerpo");
    const mensajeCarga = document.getElementById("mensaje-carga");
    const tituloTabla = document.getElementById("titulo-tabla");
    const infoTorneo = document.getElementById("info-torneo");
    
    // Almacenamiento temporal para estadísticas
    let stats = {};

    // =======================================================
    // 1. AUTENTICACIÓN Y SEGURIDAD DE ACCESO (Admin)
    // =======================================================
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }
        
        try {
            const doc = await db.collection("usuarios").doc(user.email).get();
            if (!doc.exists || doc.data().rol !== "admin") {
                alert("Acceso denegado. Se requiere rol de administrador.");
                await auth.signOut();
                window.location.href = "login.html";
            }
            // Si es admin, carga torneos y configura listeners
            cargarTorneosDisponibles();
            filtroTorneo.addEventListener('change', calcularClasificacion);
        } catch (error) {
            console.error("Error al verificar rol:", error);
            await auth.signOut();
            window.location.href = "login.html";
        }
    });

    // Cierre de sesión
    document.getElementById("cerrar-sesion").addEventListener("click", async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            alert("Sesión de administrador cerrada.");
            window.location.href = "login.html";
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert("Ocurrió un error al cerrar la sesión.");
        }
    });

    // =======================================================
    // 2. CARGAR TORNEOS
    // =======================================================
    async function cargarTorneosDisponibles() {
        filtroTorneo.innerHTML = '<option value="">Cargando torneos...</option>';
        try {
            const snapshot = await db.collection("torneos")
                .orderBy("fecha_inicio", "desc")
                .get();

            filtroTorneo.innerHTML = '<option value="">-- Seleccione un Torneo --</option>';

            if (snapshot.empty) {
                filtroTorneo.innerHTML = '<option value="">No hay torneos registrados.</option>';
                mensajeCarga.textContent = 'No hay torneos para generar clasificaciones.';
                return;
            }

            snapshot.forEach(doc => {
                const torneo = doc.data();
                filtroTorneo.innerHTML += `<option value="${doc.id}" data-deporte="${torneo.deporte}" data-estado="${torneo.estado}">${torneo.nombre} (${torneo.deporte})</option>`;
            });

        } catch (error) {
            console.error("Error al cargar torneos:", error);
            filtroTorneo.innerHTML = '<option value="">Error de carga</option>';
        }
    }

    // =======================================================
    // 3. CÁLCULO DE CLASIFICACIÓN
    // =======================================================

    async function inicializarEstadisticas(torneoId) {
        stats = {};
        const inscripcionesSnapshot = await db.collection("inscripciones")
            .where("torneoId", "==", torneoId)
            .where("estado", "==", "aprobado") // Solo equipos aprobados
            .get();

        inscripcionesSnapshot.forEach(doc => {
            const nombreEquipo = doc.data().nombre_equipo;
            stats[nombreEquipo] = {
                equipo: nombreEquipo,
                PJ: 0, // Partidos Jugados
                PG: 0, // Partidos Ganados
                PE: 0, // Partidos Empatados
                PP: 0, // Partidos Perdidos
                GF: 0, // Goles a Favor
                GC: 0, // Goles en Contra
                DG: 0, // Diferencia de Goles
                PTS: 0  // Puntos
            };
        });
    }

    async function procesarPartidos(torneoId) {
        const partidosSnapshot = await db.collection("partidos")
            .where("torneoId", "==", torneoId)
            .where("estado", "==", "finalizado") // Solo partidos con resultado
            .get();

        partidosSnapshot.forEach(doc => {
            const p = doc.data();
            const equipoA = p.equipoA;
            const equipoB = p.equipoB;
            const marcadorA = parseInt(p.marcadorA);
            const marcadorB = parseInt(p.marcadorB);

            // Asegurarse de que los equipos existen en el objeto stats
            if (!stats[equipoA] || !stats[equipoB]) return;

            // Procesar Equipo A
            stats[equipoA].PJ++;
            stats[equipoA].GF += marcadorA;
            stats[equipoA].GC += marcadorB;

            // Procesar Equipo B
            stats[equipoB].PJ++;
            stats[equipoB].GF += marcadorB;
            stats[equipoB].GC += marcadorA;

            // Determinar resultado y puntos
            if (marcadorA > marcadorB) {
                // Gana A
                stats[equipoA].PG++;
                stats[equipoA].PTS += 3;
                stats[equipoB].PP++;
            } else if (marcadorA < marcadorB) {
                // Gana B
                stats[equipoB].PG++;
                stats[equipoB].PTS += 3;
                stats[equipoA].PP++;
            } else {
                // Empate
                stats[equipoA].PE++;
                stats[equipoA].PTS += 1;
                stats[equipoB].PE++;
                stats[equipoB].PTS += 1;
            }
        });

        // Calcular Diferencia de Goles (DG)
        Object.keys(stats).forEach(equipo => {
            stats[equipo].DG = stats[equipo].GF - stats[equipo].GC;
        });
    }

    // Criterios de ordenamiento: 
    // 1. Puntos (desc) 
    // 2. Diferencia de Goles (desc) 
    // 3. Goles a Favor (desc) 
    // 4. Nombre del Equipo (asc)
    function ordenarEstadisticas() {
        return Object.values(stats).sort((a, b) => {
            if (b.PTS !== a.PTS) return b.PTS - a.PTS;
            if (b.DG !== a.DG) return b.DG - a.DG;
            if (b.GF !== a.GF) return b.GF - a.GF;
            return a.equipo.localeCompare(b.equipo);
        });
    }


    async function calcularClasificacion() {
        const torneoId = filtroTorneo.value;
        const selectedOption = filtroTorneo.options[filtroTorneo.selectedIndex];
        
        listaClasificacionesCuerpo.innerHTML = '';
        mensajeCarga.style.display = 'block';
        infoTorneo.textContent = '';
        tituloTabla.textContent = 'Seleccione un torneo para ver la clasificación.';

        if (!torneoId) {
            mensajeCarga.textContent = 'Seleccione un torneo para procesar las estadísticas.';
            return;
        }

        const torneoNombre = selectedOption.textContent;
        const torneoDeporte = selectedOption.dataset.deporte;
        const torneoEstado = selectedOption.dataset.estado;

        tituloTabla.textContent = `Tabla de Posiciones: ${torneoNombre}`;
        infoTorneo.textContent = `Estado: ${torneoEstado.toUpperCase()}. Deporte: ${torneoDeporte}.`;
        mensajeCarga.textContent = '⏳ Inicializando estadísticas y procesando resultados...';

        try {
            await inicializarEstadisticas(torneoId);
            const numEquipos = Object.keys(stats).length;
            
            if (numEquipos === 0) {
                listaClasificacionesCuerpo.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #dc3545;">No hay equipos aprobados en este torneo.</td></tr>';
                mensajeCarga.style.display = 'none';
                return;
            }

            mensajeCarga.textContent = `⏳ Procesando ${numEquipos} equipos y partidos finalizados...`;
            await procesarPartidos(torneoId);
            
            const clasificacionFinal = ordenarEstadisticas();
            
            mensajeCarga.style.display = 'none';
            let html = '';

            if (clasificacionFinal.every(e => e.PJ === 0)) {
                html = '<tr><td colspan="10" style="text-align: center; color: #ffc107;">Aún no hay partidos finalizados en este torneo.</td></tr>';
            } else {
                 clasificacionFinal.forEach((equipo, index) => {
                    html += `
                        <tr>
                            <td class="pos">${index + 1}</td>
                            <td>${equipo.equipo}</td>
                            <td>${equipo.PJ}</td>
                            <td>${equipo.PG}</td>
                            <td>${equipo.PE}</td>
                            <td>${equipo.PP}</td>
                            <td>${equipo.GF}</td>
                            <td>${equipo.GC}</td>
                            <td>${equipo.DG}</td>
                            <td class="puntos">${equipo.PTS}</td>
                        </tr>
                    `;
                });
            }

            listaClasificacionesCuerpo.innerHTML = html;

        } catch (error) {
            console.error("Error al calcular la clasificación:", error);
            mensajeCarga.textContent = '❌ Error grave al calcular las clasificaciones.';
            mensajeCarga.style.display = 'block';
        }
    }

});