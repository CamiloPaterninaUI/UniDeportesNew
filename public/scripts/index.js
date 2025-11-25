// scripts/index.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Estado de autenticación y navegación dinámica
    auth.onAuthStateChanged(async (user) => {
        const navAuth = document.getElementById('nav-auth');
        if (!navAuth) return;

        navAuth.innerHTML = ''; // Limpiar contenido

        if (user) {
            // Obtener rol del usuario
            try {
                const doc = await db.collection('usuarios').doc(user.uid).get();
                const rol = doc.exists ? doc.data().rol : 'estudiante'; // Default estudiante

                let panelLink = '';
                if (rol === 'administrador') panelLink = './administrador/admin_dashboard.html';
                else panelLink = './estudiante/estudiante_dashboard.html';

                navAuth.innerHTML = `
                    <li><a href="${panelLink}">Panel</a></li>
                    <li><button id="btn-logout" class="btn-link">Cerrar Sesión</button></li>
                `;

                document.getElementById('btn-logout').addEventListener('click', () => {
                    auth.signOut().then(() => {
                        window.location.reload();
                    }).catch(err => console.error('Error al cerrar sesión:', err));
                });

            } catch (error) {
                console.error('Error al obtener rol:', error);
                navAuth.innerHTML = `
                    <li><a href="login.html">Iniciar Sesión</a></li>
                    <li><a href="registro.html">Registrarse</a></li>
                `;
            }
        } else {
            // Invitado
            navAuth.innerHTML = `
                <li><a href="login.html">Iniciar Sesión</a></li>
                <li><a href="registro.html">Registrarse</a></li>
            `;
        }
    });

    // 2. Cargar torneos activos
    cargarTorneosActivos();

    // 3. Cargar próximos encuentros
    cargarProximosEncuentros();
});

// Función: Cargar Torneos Activos
function cargarTorneosActivos() {
    const tbody = document.querySelector('.tabla-datos:first-of-type tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="sin-datos"><i class="fas fa-spinner fa-spin"></i> Cargando torneos...</td></tr>';

    db.collection('torneos')
        .where('estado', '==', 'activo')
        .orderBy('fechaInicio', 'asc')
        .limit(5)
        .get()
        .then(snapshot => {
            tbody.innerHTML = '';
            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="5" class="sin-datos">No hay torneos activos.</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const torneo = doc.data();
                const fila = tbody.insertRow();
                fila.innerHTML = `
                    <td>${torneo.nombre}</td>
                    <td>${torneo.deporte}</td>
                    <td>${torneo.sede || 'Principal'}</td>
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

// Función: Cargar Próximos Encuentros
function cargarProximosEncuentros() {
    const tbody = document.querySelector('.tabla-datos:last-of-type tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="sin-datos"><i class="fas fa-spinner fa-spin"></i> Cargando encuentros...</td></tr>';

    db.collection('partidos')
        .where('estado', '==', 'programado')
        .orderBy('fecha', 'asc')
        .limit(5)
        .get()
        .then(snapshot => {
            tbody.innerHTML = '';
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



