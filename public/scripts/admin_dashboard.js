// Verificar estado de autenticación
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        // No autenticado
        window.location.href = '../login.html';
        return;
    }

    try {
        const docRef = await db.collection('usuarios').doc(user.uid).get();

        if (docRef.exists && docRef.data().rol === 'administrador') {
            // Mostrar nombre real del administrador
            document.getElementById('nombre-admin').textContent = docRef.data().nombre || user.email;

            // Cargar estadísticas
            cargarEstadisticas();
        } else {
            console.warn("Acceso denegado: Rol incorrecto o inexistente.");
            await auth.signOut();
            window.location.href = '../login.html';
        }
    } catch (error) {
        console.error("Error al verificar perfil:", error);
        await auth.signOut();
        window.location.href = '../login.html';
    }
});

// Funcionalidad de Cerrar Sesión
document.getElementById('btn-cerrar-sesion').addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = '../login.html';
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
});

// Función para cargar estadísticas
async function cargarEstadisticas() {
    try {
        // Torneos activos
        const torneosSnap = await db.collection('torneos').get();
        document.getElementById('stat-torneos-activos').textContent = torneosSnap.size || 0;

        // Partidos programados
        const partidosSnap = await db.collection('partidos').get();
        document.getElementById('stat-partidos-prog').textContent = partidosSnap.size || 0;

        // Usuarios registrados
        const usuariosSnap = await db.collection('usuarios').get();
        document.getElementById('stat-usuarios').textContent = usuariosSnap.size || 0;

    } catch (error) {
        console.error("Error al cargar estadísticas:", error);
        document.getElementById('stat-torneos-activos').textContent = '-';
        document.getElementById('stat-partidos-prog').textContent = '-';
        document.getElementById('stat-usuarios').textContent = '-';
    }
}
