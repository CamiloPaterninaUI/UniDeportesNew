let inscripcionSeleccionadaId = null;

auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = './login.html';
        return;
    }
    cargarInscripciones('pendiente'); // Cargar pendientes por defecto
});

// 1. Cargar y listar inscripciones (filtro por estado)
function cargarInscripciones(estadoFiltro) {
    const listaCuerpo = document.getElementById('lista-inscripciones-cuerpo');
    listaCuerpo.innerHTML = '<tr><td colspan="7" style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Cargando inscripciones...</td></tr>';

    // Usamos onSnapshot para ver los cambios en tiempo real
    let query = db.collection('inscripciones').orderBy('fechaInscripcion', 'asc');
    
    if (estadoFiltro !== 'todos') {
        query = query.where('estado', '==', estadoFiltro);
    }
    
    query.onSnapshot(snapshot => {
        listaCuerpo.innerHTML = '';
        if (snapshot.empty) {
            listaCuerpo.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay inscripciones para este estado.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const inscripcion = doc.data();
            const fila = listaCuerpo.insertRow();
            
            const estadoDisplay = inscripcion.estado.charAt(0).toUpperCase() + inscripcion.estado.slice(1); 

            fila.innerHTML = `
                <td>${inscripcion.equipo}</td>
                <td>${inscripcion.torneoNombre}</td>
                <td>${inscripcion.deporte}</td>
                <td>${inscripcion.representante}</td>
                <td>${inscripcion.jugadores ? inscripcion.jugadores.length : 0}</td>
                <td><span class="etiqueta ${inscripcion.estado}">${estadoDisplay}</span></td>
                <td>
                    <button class="btn-accion btn-ver-detalle" data-id="${doc.id}"><i class="fas fa-eye"></i> Detalle</button>
                </td>
            `;

            fila.querySelector('.btn-ver-detalle').addEventListener('click', () => mostrarDetalle(doc.id, inscripcion));
        });
    }, error => {
        console.error("Error cargando inscripciones:", error);
        listaCuerpo.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error al cargar las inscripciones.</td></tr>';
    });
}

// 2. Mostrar detalle de inscripción en el modal
function mostrarDetalle(id, inscripcion) {
    inscripcionSeleccionadaId = id;
    document.getElementById('equipo-modal').textContent = inscripcion.equipo;
    document.getElementById('torneo-modal').textContent = inscripcion.torneoNombre;
    document.getElementById('cantidad-jugadores').textContent = inscripcion.jugadores ? inscripcion.jugadores.length : 0;
    
    // Mostrar botones de acción solo si está pendiente
    const accionesModal = document.querySelector('.acciones-modal');
    if (inscripcion.estado === 'pendiente') {
         accionesModal.style.display = 'flex';
    } else {
         accionesModal.style.display = 'none';
    }


    const listaJugadoresDiv = document.getElementById('lista-jugadores-modal');
    if (inscripcion.jugadores) {
        listaJugadoresDiv.innerHTML = inscripcion.jugadores.map((jugador, index) =>
            `<p><strong>${index + 1}. ${jugador.nombre}</strong> (ID: ${jugador.documento}) - ${jugador.carrera}</p>`
        ).join('');
    } else {
         listaJugadoresDiv.innerHTML = '<p>No se encontraron datos de jugadores.</p>';
    }
    
    document.getElementById('modal-detalle').style.display = 'flex';
}

// 3. Manejar la acción de Aprobar
document.getElementById('btn-aprobar').addEventListener('click', async () => {
    if (!inscripcionSeleccionadaId) return;

    try {
        await db.collection('inscripciones').doc(inscripcionSeleccionadaId).update({
            estado: 'aprobado',
            fechaRespuesta: firebase.firestore.FieldValue.serverTimestamp(),
            // Se puede agregar aquí el UID del administrador que aprobó: aprobadoPorUid: auth.currentUser.uid
        });

        alert(`Inscripción aprobada: ${document.getElementById('equipo-modal').textContent}.`);
        document.getElementById('modal-detalle').style.display = 'none';
        inscripcionSeleccionadaId = null;
        // La lista se actualizará automáticamente gracias a onSnapshot
    } catch (error) {
        console.error('Error al aprobar inscripción:', error);
        alert('Error al aprobar la inscripción. Revisa la consola.');
    }
});

// 4. Manejar la acción de Rechazar
document.getElementById('btn-rechazar').addEventListener('click', async () => {
    if (!inscripcionSeleccionadaId) return;

    if (!confirm('¿Está seguro de rechazar esta inscripción?')) return;

    try {
        await db.collection('inscripciones').doc(inscripcionSeleccionadaId).update({
            estado: 'rechazado',
            fechaRespuesta: firebase.firestore.FieldValue.serverTimestamp(),
        });

        alert(`Inscripción rechazada: ${document.getElementById('equipo-modal').textContent}.`);
        document.getElementById('modal-detalle').style.display = 'none';
        inscripcionSeleccionadaId = null;
    } catch (error) {
        console.error('Error al rechazar inscripción:', error);
        alert('Error al rechazar la inscripción. Revisa la consola.');
    }
});

// Cerrar Modal
document.querySelector('.cerrar-modal').addEventListener('click', () => {
    document.getElementById('modal-detalle').style.display = 'none';
    inscripcionSeleccionadaId = null;
});