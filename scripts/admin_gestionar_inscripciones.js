document.addEventListener("DOMContentLoaded", () => {
    // Referencias a elementos del DOM y Firebase
    const listaInscripcionesCuerpo = document.getElementById("lista-inscripciones-cuerpo");
    const mensajeCarga = document.getElementById("mensaje-carga");
    const filtroEstado = document.getElementById("filtro-estado");
    
    // Referencias del Modal de Detalle
    const modalDetalle = document.getElementById("modal-detalle");
    const cerrarModalBtn = document.querySelector(".cerrar-modal");
    const equipoModal = document.getElementById("equipo-modal");
    const torneoModal = document.getElementById("torneo-modal");
    const cantidadJugadores = document.getElementById("cantidad-jugadores");
    const listaJugadoresModal = document.getElementById("lista-jugadores-modal");
    const btnAprobar = document.getElementById("btn-aprobar");
    const btnRechazar = document.getElementById("btn-rechazar");

    let torneoCache = {}; // Cache para guardar nombres de torneos y evitar reconsultar

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
            // Si es admin, empieza a escuchar los cambios en el filtro
            filtroEstado.addEventListener('change', cargarInscripciones);
            // Carga inicial
            cargarInscripciones(); 
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
    // 2. CARGAR Y MOSTRAR INSCRIPCIONES (READ)
    // =======================================================
    async function getTorneoNombre(torneoId) {
        if (torneoCache[torneoId]) {
            return torneoCache[torneoId];
        }
        try {
            const doc = await db.collection("torneos").doc(torneoId).get();
            const nombre = doc.exists ? doc.data().nombre : 'Torneo no encontrado';
            torneoCache[torneoId] = nombre;
            return nombre;
        } catch (error) {
            console.error("Error al obtener nombre del torneo:", error);
            return 'Error de carga';
        }
    }

    async function cargarInscripciones() {
        listaInscripcionesCuerpo.innerHTML = '';
        mensajeCarga.style.display = 'block';

        const estadoSeleccionado = filtroEstado.value;
        let query = db.collection("inscripciones").orderBy("fecha_inscripcion", "desc");

        if (estadoSeleccionado !== "todos") {
            query = query.where("estado", "==", estadoSeleccionado);
        }

        try {
            const snapshot = await query.get();

            mensajeCarga.style.display = 'none';
            
            if (snapshot.empty) {
                listaInscripcionesCuerpo.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #555;">No hay solicitudes de inscripción en este estado.</td></tr>';
                return;
            }

            // Mapear y esperar todas las promesas para obtener los nombres de los torneos
            const rows = await Promise.all(snapshot.docs.map(async doc => {
                const inscripcion = doc.data();
                const id = doc.id;
                const torneoNombre = await getTorneoNombre(inscripcion.torneoId);
                const estadoClass = `estado-${inscripcion.estado}`;

                return `
                    <tr>
                        <td>${torneoNombre}</td>
                        <td>${inscripcion.nombre_equipo}</td>
                        <td>${inscripcion.deporte}</td>
                        <td>${inscripcion.representante}</td>
                        <td>${inscripcion.jugadores.length}</td>
                        <td><span class="${estadoClass}">${inscripcion.estado.toUpperCase()}</span></td>
                        <td class="acciones">
                            <button class="btn-accion btn-ver-detalle" data-id="${id}"><i class="fas fa-search"></i> Revisar</button>
                        </td>
                    </tr>
                `;
            }));

            listaInscripcionesCuerpo.innerHTML = rows.join('');
            
            // Agregar listeners a los botones recién creados
            document.querySelectorAll('.btn-ver-detalle').forEach(btn => {
                btn.addEventListener('click', (e) => abrirModalDetalle(e.currentTarget.dataset.id));
            });

        } catch (error) {
            console.error("Error al cargar inscripciones:", error);
            mensajeCarga.textContent = '❌ Error al cargar las inscripciones.';
        }
    }

    // =======================================================
    // 3. LÓGICA DEL MODAL (UPDATE)
    // =======================================================
    let currentInscripcionId = null;

    async function abrirModalDetalle(inscripcionId) {
        currentInscripcionId = inscripcionId;
        listaJugadoresModal.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Cargando detalles...</p>';
        
        try {
            const doc = await db.collection("inscripciones").doc(inscripcionId).get();
            if (!doc.exists) {
                alert("Inscripción no encontrada.");
                return;
            }

            const data = doc.data();
            const torneoNombre = await getTorneoNombre(data.torneoId);

            // Rellenar cabecera
            equipoModal.textContent = data.nombre_equipo;
            torneoModal.textContent = torneoNombre;
            cantidadJugadores.textContent = data.jugadores.length;

            // Rellenar lista de jugadores
            listaJugadoresModal.innerHTML = data.jugadores.map((jugador, index) => `
                <div class="jugador-card">
                    <strong>Jugador ${index + 1}</strong>
                    <p>Nombre: ${jugador.nombre}</p>
                    <p>Correo: ${jugador.correo}</p>
                    <p>Edad: ${jugador.edad} / Tipo Sangre: ${jugador.tipo_sangre}</p>
                    <p>Telf: ${jugador.telefono} / Emergencia: ${jugador.emergencia}</p>
                    <p>Activo U: ${jugador.activo}</p>
                </div>
            `).join('');

            // Habilitar/Deshabilitar botones de acción según el estado actual
            const isPending = data.estado === 'pendiente';
            btnAprobar.disabled = !isPending;
            btnRechazar.disabled = !isPending;
            
            if (!isPending) {
                // Si ya fue revisada, deshabilitar acciones y cambiar texto
                btnAprobar.textContent = data.estado === 'aprobado' ? "APROBADO" : "Aprobar";
                btnRechazar.textContent = data.estado === 'rechazado' ? "RECHAZADO" : "Rechazar";
            } else {
                btnAprobar.textContent = "Aprobar";
                btnRechazar.textContent = "Rechazar";
            }

            modalDetalle.style.display = 'block';

        } catch (error) {
            console.error("Error al cargar detalle de inscripción:", error);
            alert("Ocurrió un error al cargar los detalles.");
        }
    }

    // Cerrar el modal
    cerrarModalBtn.addEventListener('click', () => {
        modalDetalle.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modalDetalle) {
            modalDetalle.style.display = 'none';
        }
    });

    // Función para actualizar el estado de la inscripción
    async function actualizarEstadoInscripcion(estado) {
        if (!currentInscripcionId) return;

        try {
            await db.collection("inscripciones").doc(currentInscripcionId).update({
                estado: estado,
                fecha_revision: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert(`✅ Inscripción actualizada a: ${estado.toUpperCase()}.`);
            modalDetalle.style.display = 'none';
            cargarInscripciones(); // Recargar la lista
            currentInscripcionId = null;

        } catch (error) {
            console.error("Error al actualizar estado:", error);
            alert("❌ Error al actualizar el estado de la inscripción.");
        }
    }

    // Listener para el botón Aprobar
    btnAprobar.addEventListener('click', () => {
        if (confirm("¿Confirma que desea APROBAR esta inscripción de equipo?")) {
            actualizarEstadoInscripcion('aprobado');
        }
    });

    // Listener para el botón Rechazar
    btnRechazar.addEventListener('click', () => {
        if (confirm("¿Confirma que desea RECHAZAR esta inscripción de equipo?")) {
            actualizarEstadoInscripcion('rechazado');
        }
    });
});