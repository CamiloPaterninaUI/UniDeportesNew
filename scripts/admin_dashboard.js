document.addEventListener("DOMContentLoaded", () => {
    const adminNombreSpan = document.getElementById("admin-nombre");
    const cerrarSesionBtn = document.getElementById("cerrar-sesion");
    const statTorneosActivos = document.getElementById("stat-torneos-activos");
    const statPartidosProg = document.getElementById("stat-partidos-prog");
    const statUsuarios = document.getElementById("stat-usuarios");

    // =======================================================
    // 1. AUTENTICACIÓN Y SEGURIDAD DE ACCESO
    // =======================================================
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // No logueado, redirigir al login
            window.location.href = "login_estudiante.html"; 
            return;
        }

        try {
            // Verificar si el usuario es administrador
            const doc = await db.collection("usuarios").doc(user.email).get();
            if (!doc.exists || doc.data().rol !== "admin") {
                alert("Acceso denegado. Se requiere rol de administrador.");
                await auth.signOut();
                window.location.href = "login_estudiante.html";
                return;
            }

            // Si es admin: mostrar nombre y cargar estadísticas
            const adminData = doc.data();
            const nombreMostrar = adminData.nombre || user.displayName || user.email;
            adminNombreSpan.textContent = nombreMostrar.split(' ')[0]; // Mostrar solo el primer nombre
            
            cargarEstadisticas();

        } catch (error) {
            console.error("Error al verificar rol o cargar datos:", error);
            await auth.signOut();
            window.location.href = "login_estudiante.html";
        }
    });

    // Cierre de sesión
    cerrarSesionBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            alert("Sesión de administrador cerrada.");
            window.location.href = "login_estudiante.html";
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert("Ocurrió un error al cerrar la sesión.");
        }
    });
    
    // =======================================================
    // 2. CARGAR ESTADÍSTICAS DEL SISTEMA
    // =======================================================
    async function cargarEstadisticas() {
        try {
            // 1. Torneos Activos
            const torneosActivosSnapshot = await db.collection("torneos")
                .where("estado", "==", "activo")
                .get();
            statTorneosActivos.textContent = torneosActivosSnapshot.size;

            // 2. Partidos Programados (que no estén finalizados)
            const partidosProgramadosSnapshot = await db.collection("partidos")
                .where("estado", "==", "programado")
                .get();
            statPartidosProg.textContent = partidosProgramadosSnapshot.size;

            // 3. Usuarios Registrados (Estudiantes + Admin)
            const usuariosSnapshot = await db.collection("usuarios").get();
            statUsuarios.textContent = usuariosSnapshot.size;

        } catch (error) {
            console.error("Error al cargar estadísticas:", error);
            // Mostrar error en lugar del número
            statTorneosActivos.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            statPartidosProg.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            statUsuarios.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        }
    }

});