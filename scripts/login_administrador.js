document.addEventListener("DOMContentLoaded", () => {
    // Las referencias 'auth' y 'db' se obtienen del bloque de configuración en el HTML
    if (typeof firebase === 'undefined' || typeof auth === 'undefined') {
        alert("🚨 Error: Firebase no está cargado.");
        return;
    }

    const formLoginAdmin = document.getElementById("form-login");
    const btnGoogleAdmin = document.getElementById("btn-google-admin");

    // ===============================================
    // 1. INICIO DE SESIÓN CON CORREO Y CONTRASEÑA
    // ===============================================
    formLoginAdmin.addEventListener("submit", async (event) => {
        event.preventDefault();

        const correo = document.getElementById("correo").value.trim();
        const password = document.getElementById("password").value.trim();

        try {
            const userCredential = await auth.signInWithEmailAndPassword(correo, password);
            const user = userCredential.user;

            // Verificar rol en Firestore: DEBE ser 'admin'
            const doc = await db.collection("usuarios").doc(user.email).get();

            if (doc.exists && doc.data().rol === "admin") {
                alert(`✅ Acceso de Administrador exitoso. Bienvenido/a ${doc.data().nombre || user.email}.`);
                window.location.href = "panel_admin.html";
            } else {
                // Si el rol es incorrecto o el perfil no existe en Firestore
                alert("🚫 Acceso denegado. Credenciales de Administrador inválidas o rol incorrecto.");
                await auth.signOut(); 
            }

        } catch (error) {
            let mensaje = "❌ Error al iniciar sesión.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                mensaje = "❌ Credenciales incorrectas.";
            } else {
                 mensaje += ` Código: ${error.code}`;
            }
            alert(mensaje);
        }
    });

    // ===============================================
    // 2. INICIO DE SESIÓN CON GOOGLE (Solo para Administradores ya existentes)
    // ===============================================
    btnGoogleAdmin.addEventListener("click", async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            // 1. Verificar si el usuario ya existe y tiene el rol de "admin"
            const userRef = db.collection("usuarios").doc(user.email);
            const doc = await userRef.get();

            if (doc.exists && doc.data().rol === "admin") {
                // Acceso concedido
                alert(`✅ Acceso de Administrador exitoso con Google. Bienvenido/a ${doc.data().nombre || user.displayName}.`);
                window.location.href = "panel_admin.html";
            } else {
                // Acceso denegado (si no existe, o si existe pero es 'estudiante')
                alert("🚫 Acceso denegado. Este login es solo para cuentas de Administrador preexistentes.");
                await auth.signOut(); // Cierra la sesión inmediatamente
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