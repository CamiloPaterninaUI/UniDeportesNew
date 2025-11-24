document.addEventListener("DOMContentLoaded", () => {
    // Verificar si Firebase está cargado (las variables 'auth' y 'db' vienen del HTML)
    if (typeof firebase === 'undefined') {
        alert("🚨 Error: Firebase no está cargado. Asegúrate de incluir el SDK en el HTML.");
        return;
    }
    
    const form = document.getElementById("form-registro");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        // === CAPTURAR VALORES DEL FORMULARIO ===
        const nombre = document.getElementById("nombre").value.trim();
        const correo = document.getElementById("correo").value.trim();
        const password = document.getElementById("password").value.trim();
        const codigo = document.getElementById("codigo").value.trim();
        const edad = document.getElementById("edad").value.trim();
        const tipo_sangre = document.getElementById("tipo_sangre").value;
        const telefono = document.getElementById("telefono").value.trim();
        const emergencia = document.getElementById("emergencia").value.trim();
        const activo = document.getElementById("activo")?.value || "N/A"; // Uso de optional chaining por si el campo no está en HTML

        // === VALIDACIONES ===
        if (!nombre || !correo || !password || !codigo || !edad || !telefono || !emergencia || !tipo_sangre || !activo) {
            alert("Por favor, complete todos los campos requeridos.");
            return;
        }

        const patronCorreo = /^[a-zA-Z0-9._%+-]+@(gmail\.com|estudiantesunibague\.edu\.co)$/i;
        if (!patronCorreo.test(correo)) {
            alert("Solo se permiten correos Gmail o institucionales (@estudiantesunibague.edu.co).");
            return;
        }

        if (password.length < 6) {
            alert("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        // ==============================================================
        // 💥 LÓGICA DE REGISTRO CON FIREBASE 💥
        // ==============================================================
        try {
            // 1. CREAR USUARIO EN FIREBASE AUTHENTICATION (Email y Contraseña)
            const userCredential = await auth.createUserWithEmailAndPassword(correo, password);
            const user = userCredential.user;

            // 2. ACTUALIZAR EL NOMBRE DE PANTALLA EN FIREBASE AUTH
            await user.updateProfile({ displayName: nombre });
            
            // 3. GUARDAR DATOS ADICIONALES DEL PERFIL EN FIRESTORE (Base de Datos)
            // Usamos el correo como ID del documento, como en el panel
            await db.collection("usuarios").doc(user.email).set({
                uid: user.uid,
                nombre,
                correo,
                codigo,
                edad,
                tipo_sangre,
                telefono,
                emergencia,
                activo,
                rol: "estudiante", // Rol fijo
                fecha_registro: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert("✅ Registro exitoso. Ahora puedes iniciar sesión.");
            // Redirigir al login en lugar de al panel, para que inicie sesión formalmente
            window.location.href = "login_estudiante.html"; 

        } catch (error) {
            let mensaje = "❌ Error al registrar usuario.";
            
            if (error.code === 'auth/email-already-in-use') {
                mensaje = "❌ Este correo ya está registrado.";
            } else if (error.code === 'auth/weak-password') {
                mensaje = "❌ La contraseña es demasiado débil (mínimo 6 caracteres).";
            } else {
                 mensaje += ` Código de error: ${error.code}`;
            }
            
            alert(mensaje);
            console.error("Error de registro:", error);
        }
    });

});