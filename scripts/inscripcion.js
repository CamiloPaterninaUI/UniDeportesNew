document.addEventListener("DOMContentLoaded", () => {
    // Verificar si Firebase está cargado (las variables 'auth' y 'db' vienen del HTML)
    if (typeof firebase === 'undefined') {
        alert("🚨 Error: Firebase no está cargado. Asegúrate de incluir el SDK en el HTML.");
        return;
    }

    const listaJugadores = document.getElementById("lista-jugadores");
    const btnAgregar = document.getElementById("btn-agregar-jugador");
    const formInscripcion = document.getElementById("form-inscripcion");

    // Función para re-indexar los números de los jugadores después de eliminar uno
    const reindexJugadores = () => {
        document.querySelectorAll(".jugador-card").forEach((card, i) => {
            card.querySelector("h3").textContent = `Jugador ${i + 1}`;
        });
    };

    // ===============================================
    // 1. FUNCIÓN PARA AGREGAR JUGADOR DINÁMICAMENTE
    // ===============================================
    const agregarJugador = () => {
        const index = listaJugadores.children.length + 1;

        const card = document.createElement("div");
        card.classList.add("jugador-card");
        
        // Estructura del formulario de jugador (ajustada para el mínimo de edad)
        card.innerHTML = `
            <h3>Jugador ${index}</h3>
            <div class="campo"><label>Nombre:</label><input type="text" class="nombre" required></div>
            <div class="campo"><label>Correo (Gmail o institucional):</label><input type="email" class="correo" required></div>
            <div class="campo"><label>Edad:</label><input type="number" class="edad" min="15" max="80" required></div>
            <div class="campo"><label>Tipo de sangre:</label>
              <select class="tipo-sangre" required>
                <option value="">Seleccione...</option>
                <option>O+</option><option>O-</option><option>A+</option><option>A-</option>
                <option>B+</option><option>B-</option><option>AB+</option><option>AB-</option>
              </select>
            </div>
            <div class="campo"><label>Teléfono:</label><input type="tel" class="telefono" required></div>
            <div class="campo"><label>Contacto de emergencia:</label><input type="text" class="emergencia" required></div>
            <div class="campo"><label>¿Activo en la universidad?</label>
              <select class="activo" required>
                <option value="">Seleccione...</option>
                <option>Sí</option>
                <option>No</option>
              </select>
            </div>
            <button type="button" class="btn-eliminar">Eliminar jugador</button>
        `;
        
        // Evento para eliminar la tarjeta
        card.querySelector(".btn-eliminar").addEventListener("click", () => {
            card.remove();
            reindexJugadores(); // Re-indexar después de la eliminación
        });

        listaJugadores.appendChild(card);
    };
    
    btnAgregar.addEventListener("click", agregarJugador);
    
    // Añadir un jugador inicial para iniciar el formulario de lista
    agregarJugador(); 

    // ===============================================
    // 2. LÓGICA DE INSCRIPCIÓN AL ENVIAR (GUARDA EN FIRESTORE)
    // ===============================================
    formInscripcion.addEventListener("submit", async (event) => {
        event.preventDefault();

        // A. Verificar autenticación
        const user = auth.currentUser;
        if (!user) {
            alert("❌ Debe iniciar sesión para poder inscribir un equipo.");
            window.location.href = "login_estudiante.html";
            return;
        }

        // B. Capturar datos generales del equipo
        const deporte = document.getElementById("deporte").value.trim();
        const nombreEquipo = document.getElementById("nombre_equipo").value.trim();
        const representante = document.getElementById("representante").value.trim();
        const correoRepresentante = document.getElementById("correo_representante").value.trim();
        const telefonoEquipo = document.getElementById("telefono_equipo").value.trim();
        
        // Validación de campos generales
        if (!deporte || !nombreEquipo || !representante || !correoRepresentante || !telefonoEquipo) {
            alert("⚠️ Por favor, complete toda la información general del equipo.");
            return;
        }

        // C. Validación CRÍTICA: El representante debe ser el usuario logueado
        if (correoRepresentante !== user.email) {
            alert(`❌ El correo del representante debe ser el mismo correo con el que inició sesión: ${user.email}`);
            return;
        }

        // D. Capturar y validar datos de los jugadores
        const jugadoresElements = document.querySelectorAll(".jugador-card");
        
        // Validar mínimo de jugadores (ej. 5 para Fútsal/Básquet)
        if (jugadoresElements.length < 5) {
            alert(`Debe agregar un mínimo de 5 jugadores para inscribir el equipo.`);
            return;
        }

        const jugadores = [];
        const patronCorreo = /^[a-zA-Z0-9._%+-]+@(gmail\.com|estudiantesunibague\.edu\.co)$/i;
        
        // Set para validar correos únicos (incluyendo el del representante)
        let correosJugadores = new Set();
        correosJugadores.add(correoRepresentante.toLowerCase()); 

        for (let i = 0; i < jugadoresElements.length; i++) {
            const card = jugadoresElements[i];
            const nombre = card.querySelector(".nombre").value.trim();
            const correo = card.querySelector(".correo").value.trim();
            const edad = card.querySelector(".edad").value.trim();
            const tipoSangre = card.querySelector(".tipo-sangre").value;
            const telefono = card.querySelector(".telefono").value.trim();
            const emergencia = card.querySelector(".emergencia").value.trim();
            const activo = card.querySelector(".activo").value;
            
            // Validaciones de jugador
            if (!nombre || !correo || !edad || !tipoSangre || !telefono || !emergencia || !activo) {
                alert(`⚠️ Por favor, complete todos los campos del Jugador ${i + 1}.`);
                return;
            }

            if (!patronCorreo.test(correo)) {
                alert(`❌ El correo del Jugador ${i + 1} no es un correo Gmail o institucional válido.`);
                return;
            }
            
            if (correosJugadores.has(correo.toLowerCase())) {
                 alert(`❌ El correo "${correo}" del Jugador ${i + 1} ya fue ingresado (o es el mismo del representante). Los correos deben ser únicos.`);
                return;
            }
            correosJugadores.add(correo.toLowerCase());


            jugadores.push({
                nombre,
                correo,
                edad: parseInt(edad),
                tipo_sangre: tipoSangre,
                telefono,
                emergencia,
                activo,
                rol: "jugador"
            });
        }
        
        // E. Crear objeto de inscripción a guardar
        const inscripcionData = {
            torneo: deporte, 
            nombre_equipo: nombreEquipo,
            representante: {
                nombre: representante,
                correo: correoRepresentante,
                telefono: telefonoEquipo,
                uid: user.uid,
                rol: "representante"
            },
            jugadores,
            estado: "Pendiente", // Estado inicial
            fecha_inscripcion: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            // F. Guardar la inscripción en la colección "inscripciones" de Firestore
            await db.collection("inscripciones").add(inscripcionData);

            alert(`✅ Inscripción enviada con éxito! Su equipo "${nombreEquipo}" ha sido registrado.`);
            
            // Redirigir al panel
            window.location.href = "panel_estudiante.html";

        } catch (error) {
            console.error("Error al guardar la inscripción en Firestore:", error);
            alert("❌ Error al enviar la inscripción. Intente de nuevo. Código: " + (error.code || error.message));
        }
    });

});