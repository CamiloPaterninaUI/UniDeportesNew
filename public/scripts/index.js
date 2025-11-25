document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar estado de autenticación para la navegación
    auth.onAuthStateChanged(user => {
        const navAuth = document.getElementById('nav-auth');
        if (navAuth) {
            navAuth.innerHTML = ''; // Limpiar el contenido actual
            if (user) {
                // Si hay un usuario logueado, mostrar el panel
                navAuth.innerHTML = '<li><a href="./admin_dashboard.html">Panel</a></li><li><button id="btn-logout" class="btn-link">Cerrar Sesión</button></li>';
                document.getElementById('btn-logout').addEventListener('click', () => {
                    auth.signOut().then(() => {
                        window.location.reload(); // Recargar la página para actualizar la nav
                    }).catch(error => console.error('Error al cerrar sesión:', error));
                });
            } else {
                // Si no hay usuario, mostrar Iniciar Sesión y Registro
                navAuth.innerHTML = '<li><a href="login.html">Iniciar Sesión</a></li><li><a href="registro.html">Registrarse</a></li>';
            }
        }
    });

    // 2. Cargar Torneos Activos
    cargarTorneosActivos();

    // 3. Cargar Próximos Encuentros
    cargarProximosEncuentros();
});

function cargarTorneosActivos() {
    const tbody = document.querySelector('.tabla-datos:first-of-type tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="sin-datos"><i class="fas fa-spinner fa-spin"></i> Cargando torneos...</td></tr>';

    db.collection('torneos').where('estado', 'in', ['activo', 'proximo']).limit(5).get()
        .then(snapshot => {
            tbody.innerHTML = ''; // Limpiar
            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="5" class="sin-datos">No hay torneos en curso actualmente.</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const torneo = doc.data();
                const fila = tbody.insertRow();
                fila.innerHTML = `
                    <td>${torneo.nombre}</td>
                    <td>${torneo.deporte}</td>
                    <td>Sede Principal</td>
                    <td>${torneo.fechaInicio}</td>
                    <td>${torneo.fechaFin}</td>
                `;
            });
        })
        .catch(error => {
            console.error('Error al cargar torneos:', error);
            tbody.innerHTML = '<tr><td colspan="5" class="sin-datos error">Error al cargar torneos.</td></tr>';
        });
}

function cargarProximosEncuentros() {
    const tbody = document.querySelector('.tabla-datos:last-of-type tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="sin-datos"><i class="fas fa-spinner fa-spin"></i> Cargando encuentros...</td></tr>';

    // Buscar partidos programados, ordenados por fecha
    db.collection('partidos').where('estado', '==', 'programado').orderBy('fecha', 'asc').limit(5).get()
        .then(snapshot => {
            tbody.innerHTML = ''; // Limpiar
            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="5" class="sin-datos">No hay partidos programados.</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const partido = doc.data();
                const fila = tbody.insertRow();
                fila.innerHTML = `
                    <td>${partido.equipoA}</td>
                    <td>vs</td>
                    <td>${partido.equipoB}</td>
                    <td>${partido.fecha}</td>
                    <td>${partido.hora}</td>
                `;
            });
        })
        .catch(error => {
            console.error('Error al cargar partidos:', error);
            tbody.innerHTML = '<tr><td colspan="5" class="sin-datos error">Error al cargar partidos.</td></tr>';
        });
}