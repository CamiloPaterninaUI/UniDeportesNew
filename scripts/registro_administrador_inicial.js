document.addEventListener("DOMContentLoaded", () => {
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

        // === VALIDACIONES ===
        if (!nombre || !correo || !password) {
            alert("Por favor, complete todos los campos requeridos.");
            return;
        }

        // Validación de formato de correo (más permisiva para el administrador)
        if (!correo.includes('@')) {
            alert("Por favor, ingrese un correo electrónico válido.");
            return;
        }

        if (password.length < 6) {
            alert("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        try {
            // 1. CREACIÓN DE AUTENTICACIÓN (Email y Contraseña)
            const userCredential = await auth.createUserWithEmailAndPassword(correo, password);
            const user = userCredential.user;

            // 2. GUARDAR DATOS DEL PERFIL EN FIRESTORE, ESTABLECIENDO EL ROL COMO "admin"
            await db.collection("usuarios").doc(user.email).set({
                uid: user.uid,
                nombre,
                correo,
                rol: "admin", // <--- CLAVE PARA EL ACCESO DE ADMINISTRADOR
                fecha_registro: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 3. ACTUALIZAR EL NOMBRE DE PANTALLA EN FIREBASE
            await user.updateProfile({ displayName: nombre });


            alert("✅ Registro de Administrador exitoso. Serás redirigido al inicio de sesión.");
            // Redirigir al login del administrador
            window.location.href = "login_administrador.html";

        } catch (error) {
            let mensaje = "❌ Error al registrar usuario.";
            if (error.code === 'auth/email-already-in-use') {
                mensaje = "❌ Este correo ya está registrado. Si ya eres administrador, inicia sesión.";
            } else if (error.code === 'auth/weak-password') {
                mensaje = "❌ La contraseña es demasiado débil (mínimo 6 caracteres).";
            } else {
                 mensaje += ` Código de error: ${error.code}`;
            }
            alert(mensaje);
            console.error(error);
        }
    });
});