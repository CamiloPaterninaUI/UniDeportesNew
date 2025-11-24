document.addEventListener("DOMContentLoaded", () => {
    // Referencias a elementos del DOM y Firebase
    const formProgramarPartido = document.getElementById("form-programar-partido");
    const selectTorneo = document.getElementById("torneo");

    // =======================================================
    // 1. AUTENTICACIÓN Y SEGURIDAD DE ACCESO (Admin)
    // =======================================================
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "login_estudiante.html"; // No logueado
            return;
        }
        
        try {
            const doc = await db.collection("usuarios").doc(user.email).get();
            if (!doc.exists || doc.data().rol !== "admin") {
                alert("Acceso denegado. Se requiere rol de administrador.");
                await auth.signOut();
                window.location.href = "login_estudiante.html";
            }
            // Si es admin, carga los torneos
            cargarTorneosActivos();
        } catch (error) {
            console.error("Error al verificar rol:", error);
            await auth.signOut();
            window.location.href = "login_estudiante.html";
        }
    });

    // Cierre de sesión
    document.getElementById("cerrar-sesion").addEventListener("click", async (e) => {
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
    // 2. CARGAR TORNEOS ACTIVOS
    // =======================================================
    async function cargarTorneosActivos() {
        try {
            // Consulta: obtener solo los torneos con estado 'activo'
            const snapshot = await db.collection("torneos")
                .where("estado", "==", "activo")
                .orderBy("fecha_inicio", "asc")
                .get();

            selectTorneo.innerHTML = '<option value="">Seleccione un torneo...</option>';

            if (snapshot.empty) {
                selectTorneo.innerHTML = '<option value="">No hay torneos activos para programar partidos.</option>';
                return;
            }

            snapshot.forEach(doc => {
                const torneo = doc.data();
                const option = document.createElement("option");
                option.value = doc.id; // El ID de Firestore será el valor
                option.textContent = `${torneo.nombre} (${torneo.deporte} - ${torneo.genero})`;
                selectTorneo.appendChild(option);
            });

        } catch (error) {
            console.error("Error al cargar torneos:", error);
            selectTorneo.innerHTML = '<option value="">Error al cargar torneos.</option>';
        }
    }

    // =======================================================
    // 3. LÓGICA DE PROGRAMACIÓN DE PARTIDO
    // =======================================================
    formProgramarPartido.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 1. Capturar datos
        const torneoId = selectTorneo.value;
        const equipoLocal = document.getElementById("equipo-local").value.trim();
        const equipoVisitante = document.getElementById("equipo-visitante").value.trim();
        const fechaPartido = document.getElementById("fecha-partido").value;
        const horaPartido = document.getElementById("hora-partido").value;
        const lugarPartido = document.getElementById("lugar-partido").value.trim();
        const fasePartido = document.getElementById("fase-partido").value;

        if (!torneoId) {
            alert("Debe seleccionar un torneo.");
            return;
        }

        if (equipoLocal === equipoVisitante) {
            alert("El equipo local y el visitante no pueden ser el mismo.");
            return;
        }

        const fechaCompleta = new Date(`${fechaPartido}T${horaPartido}:00`);
        if (isNaN(fechaCompleta)) {
            alert("La fecha u hora del partido no son válidas.");
            return;
        }

        const nuevoPartido = {
            torneoId,
            equipoLocal,
            equipoVisitante,
            fecha_hora: firebase.firestore.Timestamp.fromDate(fechaCompleta),
            lugar: lugarPartido,
            fase: fasePartido,
            estado: "programado", // 'programado', 'en curso', 'finalizado', 'aplazado'
            marcadorLocal: null,
            marcadorVisitante: null,
            fecha_programacion: firebase.firestore.FieldValue.serverTimestamp(),
        };

        try {
            // 2. Guardar en Firestore en la colección 'partidos'
            const docRef = await db.collection("partidos").add(nuevoPartido);
            
            alert(`✅ Partido programado exitosamente (ID: ${docRef.id}) entre ${equipoLocal} vs ${equipoVisitante}.`);
            formProgramarPartido.reset(); // Limpiar el formulario
            cargarTorneosActivos(); // Recargar el selector

        } catch (error) {
            console.error("Error al programar el partido:", error);
            alert("❌ Ocurrió un error al guardar el partido. Verifique la consola.");
        }
    });
});