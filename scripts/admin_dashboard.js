document.addEventListener("DOMContentLoaded", () => {
    // Verificar si Firebase está cargado (auth y db vienen del HTML)
    if (typeof firebase === 'undefined' || typeof auth === 'undefined' || typeof db === 'undefined') {
        alert("🚨 Error: Firebase no está cargado. Asegúrate de incluir el SDK en el HTML.");
        return;
    }

    const nombreAdminSpan = document.getElementById('admin-nombre');
    const cerrarSesionBtn = document.getElementById('cerrar-sesion');

    // ===============================================
    // 1. AUTENTICACIÓN Y AUTORIZACIÓN (El Pilar de la Seguridad)
    // ===============================================
    // Esta función se dispara cada vez que el estado de autenticación cambia
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // El usuario está logueado, ahora verificar su rol en Firestore
            try {
                const doc = await db.collection("usuarios").doc(user.email).get();

                if (doc.exists && doc.data().rol === 'admin') {
                    // 🎉 Es un administrador: Cargar datos
                    const userData = doc.data();
                    
                    // 1. Mostrar el nombre del administrador
                    nombreAdminSpan.textContent = userData.nombre || user.email;
                    
                    // 2. Cargar datos de resumen
                    // Esta función se puede expandir para cargar estadísticas reales
                    cargarEstadisticasPlaceholder(); 

                } else {
                    // No es admin o no tiene perfil: Redirigir inmediatamente
                    alert("🚫 Acceso denegado. No tienes permisos de administrador.");
                    await auth.signOut();
                    window.location.href = "../estudiante/login.html";
                }

            } catch (error) {
                console.error("Error al obtener datos del usuario:", error);
                alert("Hubo un error al verificar su perfil. Intente de nuevo.");
                await auth.signOut();
                window.location.href = "../estudiante/login.html";
            }
        } else {
            // No hay usuario logueado: Redirigir al login
            alert("🔒 Debe iniciar sesión para acceder al panel de administración.");
            window.location.href = "../estudiante/login.html";
        }
    });

    // ===============================================
    // 2. CERRAR SESIÓN
    // ===============================================
    cerrarSesionBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            alert("👋 Sesión cerrada correctamente.");
            window.location.href = "../estudiante/login.html"; // Redirige al login
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert("Hubo un error al cerrar la sesión.");
        }
    });


    // ===============================================
    // 3. FUNCIÓN DE PRUEBA PARA ESTADÍSTICAS
    // TODO: Reemplazar con llamadas reales a Firestore
    // ===============================================
    function cargarEstadisticasPlaceholder() {
        // Simulación de carga de datos
        document.getElementById("stat-torneos-activos").textContent = "5";
        document.getElementById("stat-partidos-prog").textContent = "24";
        document.getElementById("stat-usuarios").textContent = "150";
    }

});