document.addEventListener("DOMContentLoaded", () => {
    if (typeof firebase === 'undefined') {
        alert("🚨 Error: Firebase no está cargado. Asegúrate de incluir el SDK en el HTML.");
        return;
    }
    
    // =======================================================
    // FUNCIÓN PARA CARGAR Y MOSTRAR LAS INSCRIPCIONES
    // =======================================================
    async function cargarInscripcionesDelUsuario(userEmail) {
        // 1. Referencia a la colección e inicio del query
        const inscripcionesRef = db.collection("inscripciones");
        const contenedor = document.getElementById("contenedor-inscripciones");
        
        // Inicializar mensaje de carga
        if (contenedor) {
            contenedor.innerHTML = "<p>Cargando tus inscripciones...</p>";
        }

        try {
            // 2. Ejecutar la consulta: obtener las inscripciones donde el capitán sea el usuario actual
            const querySnapshot = await inscripcionesRef.where("capitanCorreo", "==", userEmail).get();
            
            const inscripciones = [];
            querySnapshot.forEach(doc => {
                // Recorre cada documento encontrado y añade los datos al array
                inscripciones.push({ id: doc.id, ...doc.data() });
            });

            // 3. Llamar a una función para renderizar los resultados en tu panel HTML
            mostrarInscripcionesEnElPanel(inscripciones);
            
        } catch (error) {
            console.error("Error al cargar las inscripciones:", error);
            if (contenedor) {
                contenedor.innerHTML = 
                    "<p class='alert alert-danger'>Error al cargar tus inscripciones.</p>";
            }
        }
    }


    // =======================================================
    // FUNCIÓN PARA RENDERIZAR EN HTML
    // =======================================================
    function mostrarInscripcionesEnElPanel(inscripciones) {
        const contenedor = document.getElementById("contenedor-inscripciones");
        if (!contenedor) return; // Salir si el contenedor no existe en el HTML

        let htmlContent = '';

        if (inscripciones.length === 0) {
            htmlContent = "<p class='alert alert-info'>Aún no has inscrito ningún equipo.</p>";
        } else {
            // Generar el contenido HTML para cada inscripción
            inscripciones.forEach(inscripcion => {
                const estadoClase = inscripcion.estado === 'pendiente_revision' ? 'badge-warning' : 'badge-success';
                
                // Formatear la fecha
                let fechaInscripcion = 'N/A';
                if (inscripcion.fechaInscripcion && inscripcion.fechaInscripcion.toDate) {
                    fechaInscripcion = inscripcion.fechaInscripcion.toDate().toLocaleDateString();
                }

                htmlContent += `
                    <div class="card mb-3">
                        <div class="card-body">
                            <h5 class="card-title">${inscripcion.nombreEquipo}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">Estado: <span class="badge ${estadoClase}">${inscripcion.estado}</span></h6>
                            <p class="card-text">${inscripcion.descripcion || 'Sin descripción.'}</p>
                            <p>Total Jugadores: ${inscripcion.jugadores.length}</p>
                            <p>Fecha de Inscripción: ${fechaInscripcion}</p>
                        </div>
                    </div>
                `;
            });
        }

        contenedor.innerHTML = htmlContent;
    }


    // =======================================================
    // LÓGICA PRINCIPAL DE CARGA DE PERFIL Y LLAMADA A INSCRIPCIONES
    // =======================================================
    // Función de chequeo de estado de autenticación (Firebase)
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Usuario autenticado, ahora cargamos sus datos de perfil desde Firestore
            try {
                // Usamos el correo como ID del documento
                const doc = await db.collection("usuarios").doc(user.email).get();
                
                if (doc.exists && doc.data().rol === "estudiante") {
                    const usuarioActivo = doc.data();
                    
                    // Rellenar información del perfil
                    document.getElementById("nombre-estudiante").textContent = usuarioActivo.nombre || user.displayName || "N/A";
                    document.getElementById("correo").textContent = usuarioActivo.correo || "N/A";
                    document.getElementById("codigo").textContent = usuarioActivo.codigo || "N/A";
                    document.getElementById("edad").textContent = usuarioActivo.edad || "N/A";
                    document.getElementById("tipo_sangre").textContent = usuarioActivo.tipo_sangre || "N/A";
                    document.getElementById("telefono").textContent = usuarioActivo.telefono || "N/A";
                    document.getElementById("emergencia").textContent = usuarioActivo.emergencia || "N/A";
                    document.getElementById("activo").textContent = usuarioActivo.activo || "N/A";
                    
                    // 💥 LLAMADA CLAVE: Cargar las inscripciones del usuario actual 💥
                    await cargarInscripcionesDelUsuario(user.email);


                } else {
                    // Si el usuario existe en Auth pero no en la BD o no es estudiante
                    alert("Acceso denegado. No se encontró su perfil de estudiante o su rol es incorrecto.");
                    await auth.signOut(); // Cerrar sesión
                    window.location.href = "login.html";
                }

            } catch (error) {
                console.error("Error al cargar datos de Firestore:", error);
                alert("Ocurrió un error al cargar su perfil. Intente nuevamente.");
                await auth.signOut();
                window.location.href = "login.html";
            }

        } else {
            // No hay usuario activo, redirigir al login
            alert("Debe iniciar sesión para acceder a su panel.");
            window.location.href = "login.html";
        }
    });

    // =======================================================
    // MANEJO DEL CIERRE DE SESIÓN
    // =======================================================
    document.getElementById("cerrar-sesion").addEventListener("click", async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            alert("Sesión cerrada correctamente.");
            window.location.href = "login.html";
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert("Ocurrió un error al cerrar la sesión.");
        }
    });
});