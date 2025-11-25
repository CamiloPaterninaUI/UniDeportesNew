let torneoEditandoId = null;

auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = './login.html';
        return;
    }
    // Asumimos que el rol de admin se verificó en el login
    cargarTorneos();
});

// 1. Manejar la creación de un nuevo torneo
document.getElementById('form-crear-torneo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.submitter;
    btnSubmit.disabled = true;

    const nuevoTorneo = {
        nombre: document.getElementById('nombre-torneo').value,
        deporte: document.getElementById('deporte-torneo').value,
        estado: document.getElementById('estado-torneo').value,
        fechaInicio: document.getElementById('fecha-inicio').value,
        fechaFin: document.getElementById('fecha-fin').value,
        descripcion: document.getElementById('descripcion-torneo').value,
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('torneos').add(nuevoTorneo);
        alert('Torneo creado exitosamente.');
        document.getElementById('form-crear-torneo').reset();
    } catch (error) {
        console.error('Error al crear torneo:', error);
        alert('Error al crear el torneo. Revisa la consola.');
    } finally {
        btnSubmit.disabled = false;
    }
});

// 2. Cargar y listar torneos (Uso de onSnapshot para tiempo real)
function cargarTorneos() {
    const listaCuerpo = document.getElementById('lista-torneos-cuerpo');
    listaCuerpo.innerHTML = '<tr><td colspan="6" style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Cargando torneos...</td></tr>';

    db.collection('torneos').orderBy('fechaInicio', 'desc').onSnapshot(snapshot => {
        listaCuerpo.innerHTML = ''; 
        if (snapshot.empty) {
            listaCuerpo.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay torneos registrados.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const torneo = doc.data();
            const fila = listaCuerpo.insertRow();
            
            // Reemplazo de guiones por espacios y mayúsculas para mejor visual
            const estadoDisplay = torneo.estado.charAt(0).toUpperCase() + torneo.estado.slice(1); 

            fila.innerHTML = `
                <td>${torneo.nombre}</td>
                <td>${torneo.deporte}</td>
                <td><span class="etiqueta ${torneo.estado}">${estadoDisplay}</span></td>
                <td>${torneo.fechaInicio}</td>
                <td>${torneo.fechaFin}</td>
                <td>
                    <button class="btn-accion btn-editar" data-id="${doc.id}"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn-accion btn-eliminar" data-id="${doc.id}"><i class="fas fa-trash"></i> Eliminar</button>
                </td>
            `;

            fila.querySelector('.btn-editar').addEventListener('click', () => abrirModalEdicion(doc.id, torneo));
            fila.querySelector('.btn-eliminar').addEventListener('click', () => eliminarTorneo(doc.id, torneo.nombre));
        });
    }, error => {
        console.error("Error cargando torneos:", error);
        listaCuerpo.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error al cargar los torneos.</td></tr>';
    });
}

// 3. Abrir modal de edición
function abrirModalEdicion(id, torneo) {
    torneoEditandoId = id;
    document.getElementById('nombre-edicion').value = torneo.nombre;
    document.getElementById('deporte-edicion').value = torneo.deporte;
    document.getElementById('estado-edicion').value = torneo.estado;
    document.getElementById('fecha-inicio-edicion').value = torneo.fechaInicio;
    document.getElementById('fecha-fin-edicion').value = torneo.fechaFin;
    document.getElementById('descripcion-edicion').value = torneo.descripcion;

    document.getElementById('modal-edicion').style.display = 'flex';
}

// 4. Guardar cambios
document.getElementById('form-editar-torneo').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!torneoEditandoId) return;

    const btnSubmit = e.submitter;
    btnSubmit.disabled = true;

    const datosActualizados = {
        nombre: document.getElementById('nombre-edicion').value,
        deporte: document.getElementById('deporte-edicion').value,
        estado: document.getElementById('estado-edicion').value,
        fechaInicio: document.getElementById('fecha-inicio-edicion').value,
        fechaFin: document.getElementById('fecha-fin-edicion').value,
        descripcion: document.getElementById('descripcion-edicion').value,
        fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('torneos').doc(torneoEditandoId).update(datosActualizados);
        alert('Torneo actualizado exitosamente.');
        document.getElementById('modal-edicion').style.display = 'none';
        torneoEditandoId = null;
    } catch (error) {
        console.error('Error al actualizar torneo:', error);
        alert('Error al actualizar el torneo. Revisa la consola.');
    } finally {
        btnSubmit.disabled = false;
    }
});

// 5. Eliminar torneo
async function eliminarTorneo(id, nombre) {
    if (confirm(`¿Está seguro de eliminar el torneo "${nombre}"? Esta acción eliminará el torneo y debería eliminar sus partidos e inscripciones asociadas (Requiere lógica adicional).`)) {
        try {
            await db.collection('torneos').doc(id).delete();
            alert('Torneo eliminado.');
            // Aquí se recomienda usar Cloud Functions para limpiar partidos e inscripciones.
        } catch (error) {
            console.error('Error al eliminar torneo:', error);
            alert('Error al eliminar el torneo. Revisa la consola.');
        }
    }
}

// Cerrar Modal
document.querySelector('.cerrar-modal').addEventListener('click', () => {
    document.getElementById('modal-edicion').style.display = 'none';
    torneoEditandoId = null;
});