document.addEventListener("DOMContentLoaded", () => {
    // Referencias a elementos del DOM
    const filtroTorneo = document.getElementById("filtro-torneo");
    const listaPartidosCuerpo = document.getElementById("lista-partidos-cuerpo");
    const mensajeCarga = document.getElementById("mensaje-carga");
    
    // Referencias del Modal de Marcador
    const modalMarcador = document.getElementById("modal-marcador");
    const cerrarModalBtn = document.querySelector(".cerrar-modal");
    const formMarcador = document.getElementById("form-marcador");
    
    // Campos del modal
    const partidoIdInput = document.getElementById("partido-id");
    const torneoNombreModal = document.getElementById("torneo-nombre-modal");
    const equiposModal = document.getElementById("equipos-modal");
    const labelEquipoA = document.getElementById("label-equipo-a");
    const labelEquipoB = document.getElementById("label-equipo-b");
    const marcadorAInput = document.getElementById("marcador-a");
    const marcadorBInput = document.getElementById("marcador-b");

    // Variables globales
    let currentTorneoNombre = '';
    let currentPartidoData = {};

    // =======================================================
    // 1. AUTENTICACIÓN Y SEGURIDAD DE ACCESO (Admin)
    // =======================================================
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "login_estudiante.html";
            return;
        }
        
        try {
            const doc = await db.collection("usuarios").doc(user.email).get();
            if (!doc.exists || doc.data().rol !== "admin") {
                alert("Acceso denegado. Se requiere rol de administrador.");
                await auth.signOut();
                window.location.href = "login_estudiante.html";
            }
            // Si es admin, carga torneos y configura listeners
            cargarTorneosActivos();
            filtroTorneo.addEventListener('change', cargarPartidos);
        } catch (error) {
            console.error("Error al verificar rol:", error);
            await auth.signOut();
            window.location.href = "login_estudiante.html";
        }
    });

    // Cierre de sesión
    document.getElementById("cerrar-sesion").addEventListener("click", async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            alert("Sesión de administrador cerrada.");
            window.location.href = "login_estudiante.html";
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert("Ocurrió un error al cerrar la sesión.");
        }
    });

    // =======================================================
    // 2. CARGAR TORNEOS ACTIVOS
    // =======================================================
    async function cargarTorneosActivos() {
        filtroTorneo.innerHTML = '<option value="">Cargando torneos...</option>';
        try {
            // Obtener torneos que estén 'activo' o 'proximo'
            const snapshot = await db.collection("torneos")
                .where("estado", "in", ["activo", "proximo"])
                .orderBy("fecha_inicio", "asc")
                .get();

            filtroTorneo.innerHTML = '<option value="">-- Seleccione un Torneo --</option>';

            if (snapshot.empty) {
                filtroTorneo.innerHTML = '<option value="">No hay torneos activos.</option>';
                mensajeCarga.innerHTML = '<i class="fas fa-exclamation-triangle"></i> No hay torneos activos para registrar resultados.';
                return;
            }

            snapshot.forEach(doc => {
                const torneo = doc.data();
                filtroTorneo.innerHTML += `<option value="${doc.id}" data-nombre="${torneo.nombre}">${torneo.nombre}</option>`;
            });

        } catch (error) {
            console.error("Error al cargar torneos:", error);
            filtroTorneo.innerHTML = '<option value="">Error de carga</option>';
        }
    }

    // =======================================================
    // 3. CARGAR Y MOSTRAR PARTIDOS PENDIENTES
    // =======================================================
    async function cargarPartidos() {
        const torneoId = filtroTorneo.value;
        const selectedOption = filtroTorneo.options[filtroTorneo.selectedIndex];
        currentTorneoNombre = selectedOption.dataset.nombre || '';

        listaPartidosCuerpo.innerHTML = '';
        mensajeCarga.style.display = 'block';
        mensajeCarga.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando partidos...';

        if (!torneoId) {
            mensajeCarga.innerHTML = '<i class="fas fa-info-circle"></i> Seleccione un torneo para ver sus partidos.';
            return;
        }

        try {
            // Obtener partidos programados para el torneo seleccionado
            const snapshot = await db.collection("partidos")
                .where("torneoId", "==", torneoId)
                .orderBy("fecha", "asc")
                .orderBy("hora", "asc")
                .get();

            mensajeCarga.style.display = 'none';

            if (snapshot.empty) {
                listaPartidosCuerpo.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #555;">No hay partidos programados o pendientes en este torneo.</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const partido = doc.data();
                const id = doc.id;
                const estadoClass = `estado-${partido.estado}`;
                
                let accionBoton = '';
                let estadoTexto = partido.estado.toUpperCase();
                
                // Si el partido está programado, permite registrar resultado
                if (partido.estado === 'programado') {
                    accionBoton = `<button class="btn-accion btn-registrar" data-id="${id}"><i class="fas fa-futbol"></i> Registrar Resultado</button>`;
                } else {
                    // Si ya está finalizado, muestra el marcador y permite ver/editar
                    estadoTexto = `<span class="estado-finalizado">${partido.marcadorA} - ${partido.marcadorB}</span>`;
                    accionBoton = `<button class="btn-accion btn-ver" data-id="${id}"><i class="fas fa-eye"></i> Ver/Editar</button>`;
                }
                
                const row = listaPartidosCuerpo.insertRow();
                row.innerHTML = `
                    <td>${partido.fecha}</td>
                    <td>${partido.hora} / ${partido.sede || 'N/A'}</td>
                    <td><span class="info-equipos">${partido.equipoA} vs ${partido.equipoB}</span></td>
                    <td>${estadoTexto}</td>
                    <td class="acciones-partido">${accionBoton}</td>
                `;

                // Almacenar los datos del partido para usarlos en el modal
                currentPartidoData[id] = partido;
            });

            // Agregar listeners a los botones recién creados
            document.querySelectorAll('.btn-registrar, .btn-ver').forEach(btn => {
                btn.addEventListener('click', (e) => abrirModalMarcador(e.currentTarget.dataset.id));
            });

        } catch (error) {
            console.error("Error al cargar partidos:", error);
            mensajeCarga.textContent = '❌ Error al cargar los partidos.';
        }
    }

    // =======================================================
    // 4. LÓGICA DEL MODAL DE MARCADOR (UPDATE)
    // =======================================================

    function abrirModalMarcador(partidoId) {
        const partido = currentPartidoData[partidoId];

        if (!partido) {
            alert("Detalle del partido no encontrado.");
            return;
        }

        // 1. Llenar la información del modal
        partidoIdInput.value = partidoId;
        torneoNombreModal.textContent = currentTorneoNombre;
        equiposModal.textContent = `${partido.equipoA} vs ${partido.equipoB}`;
        labelEquipoA.textContent = partido.equipoA;
        labelEquipoB.textContent = partido.equipoB;
        
        // 2. Pre-llenar marcadores si ya existen (para edición)
        marcadorAInput.value = partido.marcadorA || 0;
        marcadorBInput.value = partido.marcadorB || 0;
        
        // 3. Mostrar el modal
        modalMarcador.style.display = 'block';
    }

    // Cerrar el modal
    cerrarModalBtn.addEventListener('click', () => {
        modalMarcador.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modalMarcador) {
            modalMarcador.style.display = 'none';
        }
    });

    // Guardar el marcador
    formMarcador.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = partidoIdInput.value;
        const marcadorA = parseInt(marcadorAInput.value);
        const marcadorB = parseInt(marcadorBInput.value);
        
        // Validaciones simples
        if (marcadorA < 0 || marcadorB < 0) {
            alert("Los marcadores no pueden ser números negativos.");
            return;
        }

        const datosActualizados = {
            marcadorA: marcadorA,
            marcadorB: marcadorB,
            estado: 'finalizado', // Marcar como finalizado al registrar marcador
            fecha_resultado: firebase.firestore.FieldValue.serverTimestamp() // Fecha de registro
        };
        
        const equipoA = labelEquipoA.textContent;
        const equipoB = labelEquipoB.textContent;

        if (!confirm(`¿Confirma el resultado: ${equipoA} (${marcadorA}) vs ${equipoB} (${marcadorB})?`)) {
            return;
        }

        try {
            await db.collection("partidos").doc(id).update(datosActualizados);
            alert(`✅ Resultado registrado exitosamente para el partido: ${equipoA} vs ${equipoB}.`);
            modalMarcador.style.display = 'none';
            cargarPartidos(); // Recargar la lista para ver el cambio de estado

        } catch (error) {
            console.error("Error al registrar el marcador:", error);
            alert("❌ Error al guardar el resultado. Verifique la consola.");
        }
    });
});