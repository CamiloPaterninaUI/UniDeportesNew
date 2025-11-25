let contadorJugadores = 0;
let torneoSeleccionadoId = null;

auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = './login.html';
        return;
    }
    
    // Obtener ID del torneo de la URL
    const urlParams = new URLSearchParams(window.location.search);
    torneoSeleccionadoId = urlParams.get('torneoId');

    if (torneoSeleccionadoId) {
        cargarInfoTorneo(torneoSeleccionadoId);
    } else {
        alert('Error: No se ha especificado un torneo para la inscripción.');
        window.location.href = './estudiante_dashboard.html';
    }
    
    cargarDatosRepresentante(user.uid);
    agregarCampoJugador(); // Agregar al menos el primer campo de jugador
});

// Cargar la información del torneo seleccionado
async function cargarInfoTorneo(torneoId) {
    try {
        const doc = await db.collection('torneos').doc(torneoId).get();
        if (doc.exists) {
            const torneoData = doc.data();
            document.getElementById('torneo_nombre_display').textContent = torneoData.nombre; // Para el título/display
            document.getElementById('deporte_display').textContent = torneoData.deporte; // Para el título/display
            document.getElementById('deporte').value = torneoData.deporte; // Guardar el valor real
        } else {
            alert('El torneo especificado no existe o no está disponible.');
            window.location.href = './estudiante_dashboard.html';
        }
    } catch (e) {
        console.error('Error cargando torneo:', e);
    }
}

// Cargar datos del representante (usuario actual)
async function cargarDatosRepresentante(uid) {
    try {
        const doc = await db.collection('usuarios').doc(uid).get();
        if (doc.exists) {
            const userData = doc.data();
            document.getElementById('representante').value = userData.nombre || '';
            document.getElementById('correo_representante').value = userData.correo || '';
            document.getElementById('telefono_equipo').value = userData.telefono || ''; 
            
            // Guardamos el UID del representante
            document.getElementById('representante').setAttribute('data-uid', uid);
        }
    } catch (e) {
        console.error('Error cargando datos de representante:', e);
    }
}


// 1. Agregar campo de jugador dinámicamente
document.getElementById('btn-agregar-jugador').addEventListener('click', (e) => {
    e.preventDefault();
    agregarCampoJugador();
});

function agregarCampoJugador() {
    contadorJugadores++;
    const listaJugadoresDiv = document.getElementById('lista-jugadores');

    const jugadorDiv = document.createElement('div');
    jugadorDiv.className = 'jugador-item';
    jugadorDiv.id = `jugador-${contadorJugadores}`;
    jugadorDiv.innerHTML = `
        <h4>Jugador #${contadorJugadores}</h4>
        <div class="doble-campo">
            <div class="campo">
                <label for="jugador_nombre_${contadorJugadores}">Nombre:</label>
                <input type="text" id="jugador_nombre_${contadorJugadores}" required />
            </div>
            <div class="campo">
                <label for="jugador_doc_${contadorJugadores}">Documento/ID:</label>
                <input type="text" id="jugador_doc_${contadorJugadores}" required />
            </div>
        </div>
        <div class="doble-campo">
            <div class="campo">
                <label for="jugador_carrera_${contadorJugadores}">Carrera:</label>
                <input type="text" id="jugador_carrera_${contadorJugadores}" required />
            </div>
            <div class="campo">
                <label for="jugador_tel_${contadorJugadores}">Teléfono (Opcional):</label>
                <input type="tel" id="jugador_tel_${contadorJugadores}" />
            </div>
        </div>
        <button type="button" class="btn-remover" data-id="${contadorJugadores}">- Remover Jugador</button>
        <hr>
    `;

    listaJugadoresDiv.appendChild(jugadorDiv);
    
    // Agregar listener al botón de remover
    jugadorDiv.querySelector('.btn-remover').addEventListener('click', (e) => {
        e.preventDefault();
        const idToRemove = e.target.getAttribute('data-id');
        document.getElementById(`jugador-${idToRemove}`).remove();
    });
}

// 2. Manejar el envío del formulario de inscripción
document.getElementById('form-inscripcion').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btnSubmit = document.querySelector('.btn-inscribir');
    btnSubmit.textContent = 'Enviando...';
    btnSubmit.disabled = true;
    
    // Recolectar datos de los jugadores
    const jugadoresInscritos = [];
    const jugadorItems = document.querySelectorAll('.jugador-item');

    jugadorItems.forEach(item => {
        const id = item.id.split('-')[1];
        jugadoresInscritos.push({
            nombre: document.getElementById(`jugador_nombre_${id}`).value.trim(),
            documento: document.getElementById(`jugador_doc_${id}`).value.trim(),
            carrera: document.getElementById(`jugador_carrera_${id}`).value.trim(),
            telefono: document.getElementById(`jugador_tel_${id}`).value.trim()
        });
    });

    if (jugadoresInscritos.length < 1) { 
        alert('Debes agregar al menos 1 jugador para el equipo.');
        btnSubmit.textContent = 'Enviar Inscripción';
        btnSubmit.disabled = false;
        return;
    }

    const nuevaInscripcion = {
        torneoId: torneoSeleccionadoId,
        torneoNombre: document.getElementById('torneo_nombre_display').textContent,
        deporte: document.getElementById('deporte').value, // El valor cargado en la función cargarInfoTorneo
        equipo: document.getElementById('nombre_equipo').value.trim(),
        representante: document.getElementById('representante').value.trim(),
        representanteUid: document.getElementById('representante').getAttribute('data-uid'),
        correoRepresentante: document.getElementById('correo_representante').value.trim(),
        telefonoEquipo: document.getElementById('telefono_equipo').value.trim(),
        jugadores: jugadoresInscritos,
        estado: 'pendiente', 
        fechaInscripcion: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (!torneoSeleccionadoId) {
         alert('Error crítico: El ID del torneo no fue encontrado.');
         btnSubmit.textContent = 'Enviar Inscripción';
         btnSubmit.disabled = false;
         return;
    }

    try {
        await db.collection('inscripciones').add(nuevaInscripcion);
        alert('✅ ¡Inscripción enviada con éxito! Esperando aprobación del administrador.');
        window.location.href = './estudiante_dashboard.html'; 
    } catch (error) {
        console.error('Error al enviar inscripción:', error);
        alert(`❌ Error al enviar la inscripción: ${error.message}`);
        btnSubmit.textContent = 'Enviar Inscripción';
        btnSubmit.disabled = false;
    }
});