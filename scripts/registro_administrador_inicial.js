// Contenido para el archivo ../scripts/registro_administrador_inicial.js
document.addEventListener("DOMContentLoaded", () => {
    // Las variables 'auth' y 'db' vienen del script en el HTML
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
        alert("🚨 Error: Firebase no está cargado.");
        return;
    }

    const form = document.getElementById("form-registro");
    
    // Solo permitir un correo institucional/profesional para el administrador
    const patronCorreoAdmin = /^[a-zA-Z0-9._%+-]+@unideportes\.com$/i; // Ajusta el dominio si es necesario

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nombre = document.getElementById("nombre").value.trim();
        const correo = document.getElementById("correo").value.trim();
        const password = document.getElementById("password").value.trim();
        
        // 1. Validaciones
        if (!nombre || !correo || !password) {
            alert("Por favor, complete todos los campos.");
            return;
        }

        if (!patronCorreoAdmin.test(correo)) {
            alert("❌ Por seguridad, el correo debe ser un correo de dominio administrativo.");
            return;
        }

        if (password.length < 6) {
            alert("❌ La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        
        try {
            // 2. CREAR USUARIO EN FIREBASE AUTH
            const userCredential = await auth.createUserWithEmailAndPassword(correo, password);
            const user = userCredential.user;

            // 3. ASIGNAR ROL DE ADMINISTRADOR EN FIRESTORE
            await db.collection("usuarios").doc(user.email).set({
                uid: user.uid,
                nombre,
                correo: user.email,
                rol: "admin", // 👈 ¡CLAVE! Asignar el rol de administrador
                fecha_registro: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert("✅ Cuenta de administrador creada con éxito. Redirigiendo al login.");
            window.location.href = "login_administrador.html"; // Redirigir al nuevo login admin

        } catch (error) {
            let mensaje = "❌ Error en el registro de administrador.";
            if (error.code === 'auth/email-already-in-use') {
                mensaje = "❌ Este correo ya está registrado. Intente iniciar sesión.";
            } else {
                 mensaje += ` Código: ${error.code}`;
            }
            alert(mensaje);
            console.error(error);
        }
    });
});