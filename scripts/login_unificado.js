document.addEventListener("DOMContentLoaded", () => {
    // Las referencias 'auth' y 'db' se obtienen del bloque de configuración en el HTML
    if (typeof firebase === 'undefined' || typeof auth === 'undefined' || typeof db === 'undefined') {
        alert("🚨 Error: Firebase no está cargado. Asegúrate de incluir el SDK en el HTML.");
        return;
    }

    // ⭐ CONSTANTES DE SEGURIDAD Y VALIDACIÓN ⭐
    const ADMIN_CLAVE_SECRETA = "admin2025"; 
    const ADMIN_DOMAIN = "@unideportes.com"; 
    // Patrón de correo para estudiantes (Gmail o institucional)
    const patronCorreoEstudiante = /^[a-zA-Z0-9._%+-]+@(gmail\.com|estudiantesunibague\\.edu\\.co)$/i;

    // ⭐ REFERENCIAS DEL DOM ⭐
    const formLogin = document.getElementById("form-login");
    const btnGoogleLogin = document.getElementById("btn-google-login"); // Botón unificado de Google

    // ===============================================
    // 1. INICIO DE SESIÓN CON CORREO Y CONTRASEÑA
    // ===============================================
    formLogin.addEventListener("submit", async (event) => {
        event.preventDefault();

        const correo = document.getElementById("correo").value.trim();
        const password = document.getElementById("password").value.trim();
        // Usamos .value.trim() para obtener el valor del campo admin, que puede estar vacío
        const claveSecreta = document.getElementById("admin-clave").value.trim(); 

        if (!correo || !password) {
            alert("Por favor, complete los campos de Correo y Contraseña.");
            return;
        }

        // Determinar si el usuario INTENTA un Login de ADMINISTRADOR
        // Se considera intento admin si tiene clave secreta O si el correo termina en el dominio admin.
        // La validación final la dará Firestore.
        const esIntentoAdmin = claveSecreta.length > 0 || correo.endsWith(ADMIN_DOMAIN);

        // --- Validaciones Preliminares ---
        if (esIntentoAdmin) {
             // Es un intento de Admin: Debe tener el dominio correcto y la clave secreta
            if (!correo.endsWith(ADMIN_DOMAIN)) {
                alert("🚫 Para usar la clave de seguridad, el correo debe ser del dominio administrativo.");
                return;
            }
            if (claveSecreta !== ADMIN_CLAVE_SECRETA) {
                alert("🚫 Clave de seguridad de administrador incorrecta.");
                return;
            }
        } else {
             // Es un intento de Estudiante: Debe cumplir el patrón de estudiante y NO usar clave secreta
            if (!patronCorreoEstudiante.test(correo)) {
                alert("Solo se permiten correos Gmail o institucionales (@estudiantesunibague.edu.co) para el login de estudiantes.");
                return;
            }
        }
        // ---------------------------------

        try {
            // 2. Autenticación con Firebase (Común a ambos)
            const userCredential = await auth.signInWithEmailAndPassword(correo, password);
            const user = userCredential.user;

            // 3. Verificar el Rol en Firestore
            const doc = await db.collection("usuarios").doc(user.email).get();

            if (doc.exists) {
                const rol = doc.data().rol;

                if (rol === "admin") {
                    if (esIntentoAdmin) { // Confirmar que usó el flujo Admin
                        alert(`✅ Inicio de sesión exitoso. Bienvenido, Administrador.`);
                        window.location.href = "../admin/admin_dashboard.html";
                    } else {
                        alert("🚫 Acceso denegado. Su cuenta es de administrador. Por favor, ingrese la clave de seguridad para acceder al panel.");
                        await auth.signOut();
                    }
                } else if (rol === "estudiante") {
                    if (!esIntentoAdmin) { // Confirmar que usó el flujo Estudiante
                        alert(`✅ Inicio de sesión exitoso. Bienvenido/a, Estudiante.`);
                        window.location.href = "panel_estudiante.html";
                    } else {
                        alert("🚫 Acceso denegado. Su cuenta es de estudiante, no de administrador.");
                        await auth.signOut(); 
                    }
                } else {
                    alert("🚫 Acceso denegado. Rol de usuario no reconocido.");
                    await auth.signOut();
                }

            } else {
                alert("🚫 Perfil de usuario no encontrado en la base de datos (Firestore).");
                await auth.signOut();
            }

        } catch (error) {
            let mensaje = "❌ Error al iniciar sesión.";

            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                mensaje = "❌ Credenciales incorrectas o usuario no registrado en Firebase Authentication.";
            } else if (error.code === 'auth/invalid-email') {
                mensaje = "❌ El formato del correo electrónico es inválido.";
            } else if (error.code === 'auth/user-disabled') {
                 mensaje = "❌ Su cuenta ha sido deshabilitada.";
            } else {
                 mensaje += ` Código: ${error.code}`
            }
            alert(mensaje);
            console.error(error);
        }
    });

    // ===============================================
    // 2. INICIO DE SESIÓN CON GOOGLE (Unificado)
    // ===============================================
    btnGoogleLogin.addEventListener("click", async () => {
        const provider = new firebase.auth.GoogleAuthProvider();

        try {
            const result = await auth.signInWithPopup(provider);
            const user = result.user;
            const correo = user.email;
            const userRef = db.collection("usuarios").doc(correo);

            // 1. Verificar si el usuario ya existe en Firestore
            const doc = await userRef.get();

            if (doc.exists) {
                const rol = doc.data().rol;
                const nombre = doc.data().nombre || user.displayName;

                if (rol === "admin" && correo.endsWith(ADMIN_DOMAIN)) {
                    // Es Admin: Inicia sesión Admin
                    alert(`✅ Inicio de sesión exitoso con Google. Bienvenido/a, Administrador ${nombre}.`);
                    window.location.href = "../admin/admin_dashboard.html";

                } else if (rol === "estudiante" && patronCorreoEstudiante.test(correo)) {
                    // Es Estudiante: Inicia sesión Estudiante
                    alert(`✅ Inicio de sesión exitoso con Google. Bienvenido/a ${nombre}.`);
                    window.location.href = "panel_estudiante.html";

                } else {
                    // Rol/Dominio no válido para esta aplicación
                    alert("🚫 Acceso denegado. Su rol o dominio no permite el acceso a esta aplicación.");
                    await auth.signOut();
                }

            } else {
                // Es un usuario NUEVO que intenta registrarse con Google
                if (patronCorreoEstudiante.test(correo)) {
                    // Es un estudiante nuevo: Registrarlo en Firestore
                    await userRef.set({
                        uid: user.uid,
                        nombre: user.displayName || "Usuario Google",
                        correo: user.email,
                        codigo: "N/A", 
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

                } else {
                    // No es un dominio de estudiante (tampoco admin, ya que el admin debería registrarse primero por formulario)
                    alert("🚫 Dominio de correo no autorizado para el registro automático con Google.");
                    await auth.signOut();
                }
            }

        } catch (error) {
            let mensaje = "❌ Error al iniciar sesión con Google.";
            if (error.code === 'auth/popup-closed-by-user') {
                mensaje = "❌ Ventana de inicio de sesión de Google cerrada por el usuario.";
            } else {
                mensaje = `❌ Error desconocido: ${error.message}`
            }
            alert(mensaje);
            console.error("Error de Google Login:", error);
        }
    });

});