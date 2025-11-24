document.addEventListener("DOMContentLoaded", () => {
    // Las referencias 'auth' y 'db' se obtienen del bloque de configuración en el HTML
    if (typeof firebase === 'undefined' || typeof auth === 'undefined') {
        alert("🚨 Error: Firebase no está cargado. Asegúrate de incluir el SDK en el HTML.");
        return;
    }

    const formLogin = document.getElementById("form-login");
    const btnGoogleLogin = document.getElementById("btn-google-login");

    // Patrón de correo para estudiantes (Gmail o institucional)
    const patronCorreo = /^[a-zA-Z0-9._%+-]+@(gmail\.com|estudiantesunibague\.edu\.co)$/i;


    // ===============================================
    // 1. INICIO DE SESIÓN CON CORREO Y CONTRASEÑA
    // ===============================================
    formLogin.addEventListener("submit", async (event) => {
        event.preventDefault();

        const correo = document.getElementById("correo").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!correo || !password) {
            alert("Por favor, complete todos los campos.");
            return;
        }

        if (!patronCorreo.test(correo)) {
          alert("Solo se permiten correos Gmail o institucionales (@estudiantesunibague.edu.co).");
          return;
        }

        try {
            const userCredential = await auth.signInWithEmailAndPassword(correo, password);
            const user = userCredential.user;

            // 2. Verificar el rol en Firestore después de la autenticación
            const doc = await db.collection("usuarios").doc(user.email).get();

            if (doc.exists && doc.data().rol === "estudiante") {
                alert(`✅ Inicio de sesión exitoso con ${correo}. Redirigiendo al panel de estudiante.`);
                window.location.href = "panel_estudiante.html";
            } else {
                // Si el usuario existe pero no tiene el rol de estudiante (ej. es admin)
                alert("🚫 Acceso denegado. Este login es solo para estudiantes.");
                await auth.signOut(); // Cierra la sesión inmediatamente
            }


        } catch (error) {
            let mensaje = "❌ Error al iniciar sesión.";

            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                mensaje = "❌ Credenciales incorrectas o usuario no registrado.";
            } else if (error.code === 'auth/invalid-email') {
                mensaje = "❌ El formato del correo electrónico es inválido.";
            } else {
                 mensaje += ` Código: ${error.code}`;
            }
            alert(mensaje);
        }
    });

    // ===============================================
    // 2. INICIO DE SESIÓN / REGISTRO CON GOOGLE
    // ===============================================
    btnGoogleLogin.addEventListener("click", async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            // 1. Verificar/Crear información en Firestore usando el correo como ID del documento
            const userRef = db.collection("usuarios").doc(user.email);
            const doc = await userRef.get();

            // Validar que el correo de Google cumpla con el patrón de la universidad
            if (!patronCorreo.test(user.email)) {
                alert("🚫 Su correo de Google no cumple con el requisito institucional o Gmail. Acceso denegado.");
                await auth.signOut(); // Cierra la sesión inmediatamente
                return;
            }

            if (doc.exists) {
                // El usuario ya existe en Firestore
                if (doc.data().rol === "estudiante") {
                    // Ya existe y es estudiante: Acceso concedido
                    alert(`✅ Inicio de sesión exitoso con Google. Bienvenido/a ${user.displayName || user.email}.`);
                    window.location.href = "panel_estudiante.html";
                } else {
                    // Existe pero no es estudiante (ej. es admin): Bloquear el acceso
                    alert("🚫 Acceso denegado. Este login es solo para estudiantes.");
                    await auth.signOut();
                }
            } else {
                // No existe en Firestore: Registrarlo como nuevo estudiante
                 await userRef.set({
                    uid: user.uid,
                    nombre: user.displayName || "Usuario Google",
                    correo: user.email,
                    codigo: "N/A", // Se pedirá en el panel que complete el perfil
                    edad: "N/A",
                    tipo_sangre: "N/A",
                    telefono: "N/A",
                    emergencia: "N/A",
                    activo: "Sí",
                    rol: "estudiante", // Rol por defecto al registrarse con Google
                    fecha_registro: firebase.firestore.FieldValue.serverTimestamp()
                });

                alert(`✅ Registro y Sesión exitosos con Google. Bienvenido/a ${user.displayName || user.email}.`);
                window.location.href = "panel_estudiante.html";
            }

        } catch (error) {
            let mensaje = "❌ Error al iniciar sesión con Google.";
            if (error.code === 'auth/popup-closed-by-user') {
                mensaje = "❌ Ventana de inicio de sesión de Google cerrada por el usuario.";
            } else {
                mensaje = `❌ Error desconocido: ${error.message}`;
            }
            alert(mensaje);
            console.error(error);
        }
    });
});