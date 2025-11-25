// Configuración Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCGYWe2CcXLo0LJUVZNDK5ZEeBtU2aVjxw",
    authDomain: "proyecto-unibague.firebaseapp.com",
    projectId: "proyecto-unibague",
    storageBucket: "proyecto-unibague.firebasestorage.app",
    messagingSenderId: "68419956684",
    appId: "1:68419956684:web:cc4f156083423c489af769"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let inscripcionSeleccionadaId = null;

// Verificar estado de autenticación
auth.onAuthStateChanged(user => {
    if (!user) return window.location.href = './login.html';
    cargarInscripciones('pendiente'); // Por defecto pendientes
});

// Filtrar inscripciones
document.getElementById('filtro-estado').addEventListener('change', (e) => {
    cargarInscripciones(e.target.value);
});

// 1. Cargar y listar inscripciones
function cargarInscripciones(estadoFiltro) {
    const listaCuerpo = document.getElementById('lista-inscripciones-cuerpo');
    listaCuerpo.innerHTML = '<tr><td colspan="8" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

    let query = db.collection('inscripciones').orderBy('fechaInscripcion', 'asc');
    if (estadoFiltro !== 'todos') query = query.where('estado', '==', estadoFiltro);

    query.onSnapshot(snapshot => {
        listaCuerpo.innerHTML = '';
        if (snapshot.empty) {
            listaCuerpo.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay inscripciones.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const inscripcion = doc.data();
            const fila = listaCuerpo.insertRow();

            const estadoDisplay = inscripcion.estado.charAt(0).toUpperCase() + inscripcion.estado.slice(1);

            fila.innerHTML = `
                <td>${inscripcion.torneoNombre}</td>
                <td>$${inscripcion.costo || 0}</td>
                <td>${inscripcion.equipo}</td>
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
        listaCuerpo.innerHTML = '<tr><td colspan="8" style="text-align:center;color:red;">Error al cargar inscripciones.</td></tr>';
    });
}

// 2. Mostrar detalle de inscripción
function mostrarDetalle(id, inscripcion) {
    inscripcionSeleccionadaId = id;
    document.getElementById('equipo-modal').textContent = inscripcion.equipo;
    document.getElementById('torneo-modal').textContent = inscripcion.torneoNombre;
    document.getElementById('costo-modal').textContent = inscripcion.costo || 0;
    document.getElementById('cantidad-jugadores').textContent = inscripcion.jugadores ? inscripcion.jugadores.length : 0;

    const accionesModal = document.querySelector('.acciones-modal');
    accionesModal.style.display = (inscripcion.estado === 'pendiente') ? 'flex' : 'none';

    const listaJugadoresDiv = document.getElementById('lista-jugadores-modal');
    listaJugadoresDiv.innerHTML = inscripcion.jugadores ? inscripcion.jugadores.map((j, i) =>
        `<p><strong>${i + 1}. ${j.nombre}</strong> (ID: ${j.documento}) - ${j.carrera}</p>`
    ).join('') : '<p>No hay jugadores.</p>';

    document.getElementById('modal-detalle').style.display = 'flex';
}

// 3. Aprobar inscripción
document.getElementById('btn-aprobar').addEventListener('click', async () => {
    if (!inscripcionSeleccionadaId) return;
    try {
        await db.collection('inscripciones').doc(inscripcionSeleccionadaId).update({
            estado: 'aprobado',
            fechaRespuesta: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert(`Inscripción aprobada: ${document.getElementById('equipo-modal').textContent}`);
        document.getElementById('modal-detalle').style.display = 'none';
        inscripcionSeleccionadaId = null;
    } catch (error) {
        console.error('Error al aprobar inscripción:', error);
        alert('Error al aprobar la inscripción.');
    }
});

// 4. Rechazar inscripción
document.getElementById('btn-rechazar').addEventListener('click', async () => {
    if (!inscripcionSeleccionadaId) return;
    if (!confirm('¿Desea rechazar esta inscripción?')) return;
    try {
        await db.collection('inscripciones').doc(inscripcionSeleccionadaId).update({
            estado: 'rechazado',
            fechaRespuesta: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert(`Inscripción rechazada: ${document.getElementById('equipo-modal').textContent}`);
        document.getElementById('modal-detalle').style.display = 'none';
        inscripcionSeleccionadaId = null;
    } catch (error) {
        console.error('Error al rechazar inscripción:', error);
        alert('Error al rechazar la inscripción.');
    }
});

// 5. Cerrar modal
document.querySelector('.cerrar-modal').addEventListener('click', () => {
    document.getElementById('modal-detalle').style.display = 'none';
    inscripcionSeleccionadaId = null;
});

// 6. Cerrar sesión
document.getElementById('cerrar-sesion').addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = '../login.html');
});
