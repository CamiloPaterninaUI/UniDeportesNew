let partidoSeleccionado = null;

auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = './login.html';
        return;
    }
    cargarFiltroTorneos();
});

// 1. Cargar torneos al filtro
function cargarFiltroTorneos() {
    const filtro = document.getElementById('filtro-torneo');
    filtro.innerHTML = '<option value="">Cargando torneos...</option>';

    db.collection('torneos').where('estado', 'in', ['activo', 'proximo']).get().then(snapshot => {
        filtro.innerHTML = '<option value="todos" selected>Todos los Torneos Activos</option>';
        snapshot.forEach(doc => {
            filtro.innerHTML += `<option value="${doc.id}">${doc.data().nombre}</option>`;
        });
        cargarPartidos(); // Cargar todos al inicio
    }).catch(e => console.error("Error cargando torneos para filtro:", e));
}

// 2. Cargar partidos al cambiar el filtro
document.getElementById('filtro-torneo').addEventListener('change', cargarPartidos);

// 3. Cargar y listar partidos pendientes de resultado
function cargarPartidos() {
    const torneoId = document.getElementById('filtro-torneo').value;
    const listaCuerpo = document.getElementById('lista-partidos-cuerpo');
    listaCuerpo.innerHTML = '<tr><td colspan="6" style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Buscando partidos pendientes...</td></tr>';

    let query = db.collection('partidos').where('estado', '==', 'programado').orderBy('fecha', 'asc');

    if (torneoId && torneoId !== 'todos') {
        query = query.where('torneoId', '==', torneoId);
    }

    query.onSnapshot(snapshot => {
        listaCuerpo.innerHTML = '';
        if (snapshot.empty) {
            listaCuerpo.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay partidos pendientes de resultado.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const partido = doc.data();
            const fila = listaCuerpo.insertRow();
            fila.innerHTML = `
                <td>${partido.torneoNombre}</td>
                <td><strong>${partido.equipoA}</strong> vs <strong>${partido.equipoB}</strong></td>
                <td>${partido.fecha} / ${partido.hora}</td>
                <td>${partido.lugar}</td>
                <td>${partido.fase}</td>
                <td>
                    <button class="btn-accion btn-registrar" data-id="${doc.id}"><i class="fas fa-scoreboard"></i> Registrar</button>
                </td>
            `;

            fila.querySelector('.btn-registrar').addEventListener('click', () => abrirModalMarcador(doc.id, partido));
        });
    }, error => {
        console.error("Error cargando partidos:", error);
        listaCuerpo.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error al cargar los partidos.</td></tr>';
    });
}

// 4. Abrir modal y prellenar datos
function abrirModalMarcador(id, partido) {
    partidoSeleccionado = { id, ...partido };
    
    document.getElementById('partido-id').value = id;
    document.getElementById('torneo-nombre-modal').textContent = partido.torneoNombre;
    document.getElementById('equipos-modal').textContent = `${partido.equipoA} vs ${partido.equipoB}`;
    document.getElementById('label-equipo-a').textContent = partido.equipoA;
    document.getElementById('label-equipo-b').textContent = partido.equipoB;
    
    document.getElementById('marcador-a').value = 0;
    document.getElementById('marcador-b').value = 0;

    document.getElementById('modal-marcador').style.display = 'flex';
}

// 5. Manejar el envío del formulario de marcador
document.getElementById('form-marcador').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!partidoSeleccionado) return;

    const marcadorA = parseInt(document.getElementById('marcador-a').value);
    const marcadorB = parseInt(document.getElementById('marcador-b').value);

    if (isNaN(marcadorA) || isNaN(marcadorB) || marcadorA < 0 || marcadorB < 0) {
        alert('Por favor, ingresa marcadores válidos (números no negativos).');
        return;
    }
    
    const btnSubmit = e.submitter;
    btnSubmit.disabled = true;

    const partidoId = partidoSeleccionado.id;
    const datosResultado = {
        marcadorA: marcadorA,
        marcadorB: marcadorB,
        estado: 'jugado', // Cambiar estado
        fechaRegistroResultado: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('partidos').doc(partidoId).update(datosResultado);
        alert('✅ Resultado registrado y partido marcado como jugado. ¡Recuerda actualizar la tabla de clasificación!');
        
        // NOTA: En un proyecto real, se llamaría a una función para actualizar la tabla de clasificación.
        // actualizarClasificacion(partidoSeleccionado, marcadorA, marcadorB); 
        
        document.getElementById('modal-marcador').style.display = 'none';
        partidoSeleccionado = null;
    } catch (error) {
        console.error('Error al registrar resultado:', error);
        alert('❌ Error al registrar el resultado. Revisa la consola.');
    } finally {
        btnSubmit.disabled = false;
    }
});

// Cerrar Modal
document.querySelector('.cerrar-modal').addEventListener('click', () => {
    document.getElementById('modal-marcador').style.display = 'none';
    partidoSeleccionado = null;
});