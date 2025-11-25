let torneoEditandoId = null;
let accion = "crear"; // 'crear' o 'editar'

document.addEventListener('DOMContentLoaded', () => {

    // Verificar auth
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = './login.html';
            return;
        }
        cargarTorneos();
    });

    const modal = document.getElementById('modal-torneo');
    const form = document.getElementById('form-torneo');

    // Abrir modal crear
    document.getElementById('btn-crear-torneo').addEventListener('click', () => {
        accion = "crear";
        torneoEditandoId = null;
        document.getElementById('titulo-modal').textContent = "Crear Torneo";
        form.reset();
        modal.style.display = 'flex';
    });

    // Cerrar modal
    document.querySelector('.cerrar-modal').addEventListener('click', () => {
        modal.style.display = 'none';
        torneoEditandoId = null;
    });

    // Guardar torneo
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const btnSubmit = e.submitter;
        btnSubmit.disabled = true;

        const torneoData = {
            nombre: document.getElementById('nombre-torneo').value,
            deporte: document.getElementById('deporte-torneo').value,
            estado: document.getElementById('estado-torneo').value,
            fechaInicio: document.getElementById('fecha-inicio').value,
            fechaFin: document.getElementById('fecha-fin').value,
            descripcion: document.getElementById('descripcion-torneo').value,
            costo: Number(document.getElementById('costo-torneo').value),
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            if (accion === "crear") {
                torneoData.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('torneos').add(torneoData);
                alert('Torneo creado exitosamente.');
            } else if (accion === "editar" && torneoEditandoId) {
                await db.collection('torneos').doc(torneoEditandoId).update(torneoData);
                alert('Torneo actualizado exitosamente.');
            }
            modal.style.display = 'none';
            form.reset();
            torneoEditandoId = null;

        } catch (error) {
            console.error('Error al guardar torneo:', error);
            alert('Error al guardar el torneo. Revisa la consola.');
        } finally {
            btnSubmit.disabled = false;
        }
    });

    // Cerrar sesión
    document.getElementById('cerrar-sesion').addEventListener('click', async () => {
        await auth.signOut();
        window.location.href = './login.html';
    });
});

// Cargar torneos en tiempo real
function cargarTorneos() {
    const tbody = document.getElementById('lista-torneos-cuerpo');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Cargando torneos...</td></tr>';

    db.collection('torneos').orderBy('fechaInicio', 'desc').onSnapshot(snapshot => {
        tbody.innerHTML = '';
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay torneos registrados.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const t = doc.data();
            const fila = tbody.insertRow();
            fila.innerHTML = `
                <td>${t.nombre}</td>
                <td>${t.deporte}</td>
                <td>${t.fechaInicio}</td>
                <td>${t.fechaFin}</td>
                <td><span class="etiqueta ${t.estado}">${t.estado.charAt(0).toUpperCase() + t.estado.slice(1)}</span></td>
                <td>
                    <button class="btn-accion btn-editar" data-id="${doc.id}"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn-accion btn-eliminar" data-id="${doc.id}"><i class="fas fa-trash"></i> Eliminar</button>
                </td>
            `;
            fila.querySelector('.btn-editar').addEventListener('click', () => abrirModalEdicion(doc.id, t));
            fila.querySelector('.btn-eliminar').addEventListener('click', () => eliminarTorneo(doc.id, t.nombre));
        });
    }, error => {
        console.error("Error cargando torneos:", error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar los torneos.</td></tr>';
    });
}

// Editar torneo
function abrirModalEdicion(id, t) {
    accion = "editar";
    torneoEditandoId = id;
    document.getElementById('titulo-modal').textContent = "Editar Torneo";
    document.getElementById('nombre-torneo').value = t.nombre;
    document.getElementById('deporte-torneo').value = t.deporte;
    document.getElementById('estado-torneo').value = t.estado;
    document.getElementById('fecha-inicio').value = t.fechaInicio;
    document.getElementById('fecha-fin').value = t.fechaFin;
    document.getElementById('descripcion-torneo').value = t.descripcion;
    document.getElementById('costo-torneo').value = t.costo || 0;
    document.getElementById('modal-torneo').style.display = 'flex';
}

// Eliminar torneo
async function eliminarTorneo(id, nombre) {
    if (!confirm(`¿Eliminar el torneo "${nombre}"?`)) return;
    try {
        await db.collection('torneos').doc(id).delete();
        alert('Torneo eliminado.');
    } catch (error) {
        console.error('Error al eliminar torneo:', error);
        alert('Error al eliminar torneo. Revisa la consola.');
    }
}
