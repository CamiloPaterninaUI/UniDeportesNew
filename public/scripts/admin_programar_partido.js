auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = './login.html';
        return;
    }
    cargarTorneosYEquipos();
});

const selectTorneo = document.getElementById('torneo-partido');
const selectEquipoA = document.getElementById('equipo-a');
const selectEquipoB = document.getElementById('equipo-b');

// 1. Cargar torneos activos al dropdown
function cargarTorneosYEquipos() {
    selectTorneo.innerHTML = '<option value="">Cargando torneos...</option>';

    db.collection('torneos').where('estado', 'in', ['activo', 'proximo']).get().then(snapshot => {
        selectTorneo.innerHTML = '<option value="" disabled selected>Seleccione Torneo...</option>';
        snapshot.forEach(doc => {
            selectTorneo.innerHTML += `<option value="${doc.id}" data-nombre="${doc.data().nombre}" data-deporte="${doc.data().deporte}">${doc.data().nombre} (${doc.data().deporte})</option>`;
        });
        if (snapshot.empty) {
            selectTorneo.innerHTML = '<option value="" disabled selected>No hay torneos disponibles</option>';
        }
    }).catch(e => console.error("Error cargando torneos:", e));
}

// 2. Cargar equipos cuando se selecciona un torneo
selectTorneo.addEventListener('change', () => {
    const torneoId = selectTorneo.value;
    selectEquipoA.innerHTML = '<option value="" disabled selected>Cargando equipos...</option>';
    selectEquipoB.innerHTML = '<option value="" disabled selected>Cargando equipos...</option>';

    if (!torneoId) return;

    // Buscar inscripciones APROBADAS para el torneo
    db.collection('inscripciones').where('torneoId', '==', torneoId).where('estado', '==', 'aprobado').get().then(snapshot => {
        const optionsHtml = '<option value="" disabled selected>Seleccione un equipo...</option>';
        let equiposHtml = optionsHtml;

        snapshot.forEach(doc => {
            const equipo = doc.data().equipo;
            equiposHtml += `<option value="${equipo}">${equipo}</option>`;
        });

        selectEquipoA.innerHTML = equiposHtml;
        selectEquipoB.innerHTML = equiposHtml;

        if (snapshot.empty) {
            selectEquipoA.innerHTML = '<option value="" disabled selected>No hay equipos aprobados en este torneo</option>';
            selectEquipoB.innerHTML = '<option value="" disabled selected>No hay equipos aprobados en este torneo</option>';
        }
    }).catch(e => console.error("Error cargando equipos:", e));
});

// 3. Manejar el envío del formulario de programación
document.getElementById('form-programar-partido').addEventListener('submit', async (e) => {
    e.preventDefault();

    const equipoA = selectEquipoA.value;
    const equipoB = selectEquipoB.value;

    if (equipoA === equipoB) {
        alert('Los equipos A y B deben ser diferentes.');
        return;
    }

    if (!selectTorneo.value) {
         alert('Debe seleccionar un torneo.');
         return;
    }
    
    const torneoNombre = selectTorneo.options[selectTorneo.selectedIndex].getAttribute('data-nombre');
    const deporte = selectTorneo.options[selectTorneo.selectedIndex].getAttribute('data-deporte');
    const btnSubmit = e.submitter;
    btnSubmit.disabled = true;


    const nuevoPartido = {
        torneoId: selectTorneo.value,
        torneoNombre: torneoNombre,
        deporte: deporte,
        equipoA: equipoA,
        equipoB: equipoB,
        fecha: document.getElementById('fecha-partido').value,
        hora: document.getElementById('hora-partido').value,
        lugar: document.getElementById('lugar-partido').value,
        fase: document.getElementById('fase-partido').value,
        estado: 'programado', // Estado inicial
        marcadorA: null,
        marcadorB: null,
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('partidos').add(nuevoPartido);
        alert(`Partido entre ${equipoA} vs ${equipoB} programado exitosamente.`);
        document.getElementById('form-programar-partido').reset();
    } catch (error) {
        console.error('Error al programar partido:', error);
        alert('Error al programar el partido. Revisa la consola.');
    } finally {
        btnSubmit.disabled = false;
        // Recargar listas de equipos después de reset
        selectTorneo.dispatchEvent(new Event('change')); 
    }
});