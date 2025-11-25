auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            // 1. Cargar datos del estudiante y verificar rol
            const doc = await db.collection('usuarios').doc(user.uid).get();
            if (doc.exists && doc.data().rol === 'estudiante') {
                const userData = doc.data();
                
                // Mostrar datos del perfil
                document.getElementById('nombre-usuario').textContent = userData.nombre || 'N/A';
                document.getElementById('documento').textContent = userData.documento || 'N/A';
                document.getElementById('carrera').textContent = userData.carrera || 'N/A';
                // Asumo que tienes campos 'telefono' y 'emergencia' en tu colección 'usuarios'
                document.getElementById('telefono').textContent = userData.telefono || 'N/A'; 
                document.getElementById('emergencia').textContent = userData.emergencia || 'N/A'; 
                document.getElementById('activo').textContent = userData.activo ? 'Sí' : 'No';

                // 2. Cargar inscripciones y torneos
                cargarMisInscripciones(user.uid);
                cargarTorneosDisponibles();

            } else {
                // Usuario autenticado pero no es estudiante, o rol desconocido.
                console.log("Acceso denegado: No es estudiante.");
                auth.signOut();
                window.location.href = './login.html'; // Redirigir al login
            }
        } catch (error) {
            console.error("Error al verificar perfil:", error);
            auth.signOut();
            window.location.href = './login.html';
        }
    } else {
        // No autenticado, redirigir
        window.location.href = './login.html';
    }
});

// 3. Listar las inscripciones del estudiante (como representante)
function cargarMisInscripciones(usuarioUid) {
    const listaDiv = document.getElementById('lista-mis-inscripciones');
    listaDiv.innerHTML = '';
    document.getElementById('mensaje-inscripciones').style.display = 'block';

    db.collection('inscripciones')
        .where('representanteUid', '==', usuarioUid) // Filtra por el UID del representante
        .orderBy('fechaInscripcion', 'desc')
        .onSnapshot(snapshot => {
            document.getElementById('mensaje-inscripciones').style.display = 'none';

            if (snapshot.empty) {
                listaDiv.innerHTML = '<p class="mensaje-alerta">Aún no has inscrito ningún equipo como representante.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const inscripcion = doc.data();
                const tarjeta = document.createElement('div');
                // Clase dinámica para estilos basados en el estado (aprobado, pendiente, rechazado)
                tarjeta.className = `tarjeta-inscripcion estado-${inscripcion.estado}`; 
                
                tarjeta.innerHTML = `
                    <h3>${inscripcion.equipo} <span class="estado-tag estado-${inscripcion.estado}">${inscripcion.estado.toUpperCase()}</span></h3>
                    <p><strong>Torneo:</strong> ${inscripcion.torneoNombre}</p>
                    <p><strong>Deporte:</strong> ${inscripcion.deporte}</p>
                    <p><strong>Jugadores:</strong> ${inscripcion.jugadores ? inscripcion.jugadores.length : 0}</p>
                `;
                listaDiv.appendChild(tarjeta);
            });
        }, e => {
            console.error("Error cargando inscripciones:", e);
            document.getElementById('mensaje-inscripciones').textContent = 'Error al cargar tus inscripciones.';
        });
}

// 4. Listar torneos disponibles para inscripción
function cargarTorneosDisponibles() {
    const listaCuerpo = document.getElementById('lista-torneos-disponibles');
    listaCuerpo.innerHTML = '<tr><td colspan="5" style="text-align: center;">Cargando torneos...</td></tr>';

    // Buscar torneos en estado 'proximo' que permitan inscripciones
    db.collection('torneos').where('estado', '==', 'proximo').orderBy('fechaInicio', 'asc').get().then(snapshot => {
        listaCuerpo.innerHTML = '';
        if (snapshot.empty) {
            listaCuerpo.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay torneos abiertos actualmente para inscripción.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const torneo = doc.data();
            const fila = listaCuerpo.insertRow();
            fila.innerHTML = `
                <td>${torneo.nombre}</td>
                <td>${torneo.deporte}</td>
                <td>${torneo.fechaInicio}</td>
                <td><span class="etiqueta proximo">${torneo.estado.toUpperCase()}</span></td>
                <td>
                    <a href="./inscripcion.html?torneoId=${doc.id}" class="btn-accion btn-inscribir"><i class="fas fa-edit"></i> Inscribir</a>
                </td>
            `;
        });
    }).catch(e => {
        console.error("Error cargando torneos:", e);
        listaCuerpo.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Error al cargar los torneos.</td></tr>';
    });
}

// Funcionalidad de Cerrar Sesión
document.getElementById('btn-logout').addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = './login.html'; 
    }).catch(error => {
        console.error('Error al cerrar sesión:', error);
    });
});