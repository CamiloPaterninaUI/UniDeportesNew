auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            // Verificar el rol del usuario
            const doc = await db.collection('usuarios').doc(user.uid).get();
            if (doc.exists && doc.data().rol === 'admin') {
                document.getElementById('user-email').textContent = doc.data().nombre || user.email;

                // Cargar estadísticas
                cargarEstadisticas();
            } else {
                // No es administrador, cerrar sesión
                console.log("Acceso denegado: No es administrador.");
                auth.signOut();
                window.location.href = './login.html'; 
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

function cargarEstadisticas() {
    // 1. Torneos Activos/Próximos
    db.collection('torneos').where('estado', 'in', ['activo', 'proximo']).get().then(snapshot => {
        document.getElementById('stat-torneos-activos').textContent = snapshot.size;
    }).catch(e => console.error("Error Torneos Activos:", e));

    // 2. Partidos Programados (pendientes de jugar)
    db.collection('partidos').where('estado', '==', 'programado').get().then(snapshot => {
        document.getElementById('stat-partidos-prog').textContent = snapshot.size;
    }).catch(e => console.error("Error Partidos Prog:", e));

    // 3. Usuarios Registrados (Estudiantes + Admin)
    db.collection('usuarios').get().then(snapshot => {
        document.getElementById('stat-usuarios').textContent = snapshot.size;
    }).catch(e => console.error("Error Usuarios:", e));
}

// Funcionalidad de Cerrar Sesión
document.getElementById('btn-logout').addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = './login.html'; 
    }).catch((error) => {
        console.error('Error al cerrar sesión:', error);
        alert('Hubo un error al cerrar sesión.');
    });
});