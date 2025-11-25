document.addEventListener("DOMContentLoaded", () => {
    // Referencias a elementos del DOM y Firebase
    const listaTorneosCuerpo = document.getElementById("lista-torneos-cuerpo");
    const mensajeCarga = document.getElementById("mensaje-carga");
    
    // Referencias del Modal de Edición
    const modalEdicion = document.getElementById("modal-edicion");
    const cerrarModalBtn = document.querySelector(".cerrar-modal");
    const formEditarTorneo = document.getElementById("form-editar-torneo");
    const torneoNombreModal = document.getElementById("torneo-nombre-modal");
    
    // Campos del formulario de edición
    const torneoIdEdicion = document.getElementById("torneo-id-edicion");
    const nombreEdicion = document.getElementById("nombre-edicion");
    const deporteEdicion = document.getElementById("deporte-edicion");
    const estadoEdicion = document.getElementById("estado-edicion");
    const fechaInicioEdicion = document.getElementById("fecha-inicio-edicion");
    const fechaFinEdicion = document.getElementById("fecha-fin-edicion");
    const descripcionEdicion = document.getElementById("descripcion-edicion");

    // =======================================================
    // 1. AUTENTICACIÓN Y SEGURIDAD DE ACCESO (Admin)
    // =======================================================
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "login.html"; // No logueado
            return;
        }
        
        try {
            const doc = await db.collection("usuarios").doc(user.email).get();
            if (!doc.exists || doc.data().rol !== "admin") {
                alert("Acceso denegado. Se requiere rol de administrador.");
                await auth.signOut();
                window.location.href = "login.html";
            }
            // Si es admin, carga los torneos
            cargarTorneos();
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
    // 2. CARGAR Y MOSTRAR TORNEOS (READ)
    // =======================================================
    async function cargarTorneos() {
        listaTorneosCuerpo.innerHTML = '';
        mensajeCarga.style.display = 'block';

        try {
            // Obtener todos los torneos ordenados por fecha de inicio
            const snapshot = await db.collection("torneos")
                .orderBy("fecha_inicio", "desc")
                .get();

            mensajeCarga.style.display = 'none';
            
            if (snapshot.empty) {
                listaTorneosCuerpo.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #555;">No hay torneos registrados.</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const torneo = doc.data();
                const id = doc.id;
                
                // Función auxiliar para formatear Timestamp de Firestore a string de fecha
                const formatFecha = (timestamp) => {
                    if (timestamp && typeof timestamp.toDate === 'function') {
                        // Formato YYYY-MM-DD
                        return timestamp.toDate().toISOString().split('T')[0];
                    }
                    return 'N/A';
                };

                const fechaInicio = formatFecha(torneo.fecha_inicio);
                const fechaFin = formatFecha(torneo.fecha_fin);
                
                // Asignar una clase CSS basada en el estado
                const estadoClass = `estado-${torneo.estado}`;

                const row = listaTorneosCuerpo.insertRow();
                row.innerHTML = `
                    <td>${torneo.nombre}</td>
                    <td>${torneo.deporte}</td>
                    <td>${fechaInicio}</td>
                    <td>${fechaFin}</td>
                    <td><span class="${estadoClass}">${torneo.estado.toUpperCase()}</span></td>
                    <td class="acciones">
                        <button class="btn-accion btn-editar" data-id="${id}"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn-accion btn-eliminar" data-id="${id}"><i class="fas fa-trash"></i> Eliminar</button>
                    </td>
                `;

                // Agregar listeners a los botones recién creados
                row.querySelector('.btn-editar').addEventListener('click', () => abrirModalEdicion(id));
                row.querySelector('.btn-eliminar').addEventListener('click', () => eliminarTorneo(id, torneo.nombre));
            });

        } catch (error) {
            console.error("Error al cargar torneos:", error);
            mensajeCarga.textContent = '❌ Error al cargar los torneos.';
        }
    }

    // =======================================================
    // 3. LÓGICA DE EDICIÓN (UPDATE)
    // =======================================================

    async function abrirModalEdicion(torneoId) {
        try {
            const doc = await db.collection("torneos").doc(torneoId).get();
            if (!doc.exists) {
                alert("Torneo no encontrado.");
                return;
            }

            const data = doc.data();

            // Llenar el formulario del modal
            torneoIdEdicion.value = torneoId;
            torneoNombreModal.textContent = data.nombre;
            nombreEdicion.value = data.nombre;
            deporteEdicion.value = data.deporte;
            estadoEdicion.value = data.estado;
            descripcionEdicion.value = data.descripcion;

            // Formatear Timestamp a string de fecha (YYYY-MM-DD) para los inputs type="date"
            const formatTimestampToDateString = (timestamp) => {
                if (timestamp && typeof timestamp.toDate === 'function') {
                    return timestamp.toDate().toISOString().split('T')[0];
                }
                return '';
            };
            
            fechaInicioEdicion.value = formatTimestampToDateString(data.fecha_inicio);
            fechaFinEdicion.value = formatTimestampToDateString(data.fecha_fin);

            // Mostrar el modal
            modalEdicion.style.display = 'block';

        } catch (error) {
            console.error("Error al cargar datos para edición:", error);
            alert("Ocurrió un error al cargar los datos del torneo.");
        }
    }

    // Cerrar el modal
    cerrarModalBtn.addEventListener('click', () => {
        modalEdicion.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modalEdicion) {
            modalEdicion.style.display = 'none';
        }
    });

    // Guardar cambios del formulario de edición
    formEditarTorneo.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = torneoIdEdicion.value;
        const nombre = nombreEdicion.value.trim();
        const deporte = deporteEdicion.value;
        const estado = estadoEdicion.value;
        const fechaInicioStr = fechaInicioEdicion.value;
        const fechaFinStr = fechaFinEdicion.value;
        const descripcion = descripcionEdicion.value.trim();

        // Convertir las fechas a objetos Timestamp de Firestore
        const fechaInicio = firebase.firestore.Timestamp.fromDate(new Date(fechaInicioStr));
        const fechaFin = firebase.firestore.Timestamp.fromDate(new Date(fechaFinStr));

        const datosActualizados = {
            nombre,
            deporte,
            estado,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            descripcion,
            fecha_actualizacion: firebase.firestore.FieldValue.serverTimestamp() // Campo de auditoría
        };

        try {
            await db.collection("torneos").doc(id).update(datosActualizados);
            alert(`✅ Torneo "${nombre}" actualizado exitosamente.`);
            modalEdicion.style.display = 'none';
            cargarTorneos(); // Recargar la lista para ver los cambios

        } catch (error) {
            console.error("Error al actualizar el torneo:", error);
            alert("❌ Error al actualizar el torneo. Verifique la consola.");
        }
    });

    // =======================================================
    // 4. LÓGICA DE ELIMINACIÓN (DELETE)
    // =======================================================
    async function eliminarTorneo(torneoId, nombreTorneo) {
        if (!confirm(`⚠️ ¿Está seguro que desea ELIMINAR permanentemente el torneo "${nombreTorneo}"? Esto eliminará también sus partidos programados y las inscripciones de equipos asociados. Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            // Eliminar el torneo por su ID
            await db.collection("torneos").doc(torneoId).delete();
            
            // NOTA: Para una aplicación real, también deberías eliminar de Firestore:
            // 1. Los documentos en la colección 'partidos' que tengan torneoId == torneoId
            // 2. Los documentos en la colección 'inscripciones' que tengan torneoId == torneoId
            // Esto se haría con consultas adicionales y operaciones de "batch write" para eficiencia.
            
            alert(`🗑️ Torneo "${nombreTorneo}" eliminado exitosamente.`);
            cargarTorneos(); // Recargar la lista

        } catch (error) {
            console.error("Error al eliminar el torneo:", error);
            alert("❌ Ocurrió un error al eliminar el torneo. Verifique la consola.");
        }
    }
    
});