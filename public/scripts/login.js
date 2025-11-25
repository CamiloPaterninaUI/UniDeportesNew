// La CLAVE MAESTRA DE SEGURIDAD de administrador (Debe coincidir con la de registro.js)
const CLAVE_SECRETA_ADMIN = "admin2025"; 

// Se asume que 'auth' y 'db' son variables globales definidas en login.html
// Redefinimos las referencias para asegurar que estén disponibles en el scope del script
const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');
    const adminClaveInput = document.getElementById('admin-clave');
    
    // Función para mostrar mensajes de forma segura (modal)
    function mostrarMensaje(mensaje) {
        // Creamos o encontramos el modal de mensajes
        let modalFondo = document.getElementById('modal-mensaje-fondo');
        if (!modalFondo) {
            modalFondo = document.createElement('div');
            modalFondo.id = 'modal-mensaje-fondo';
            modalFondo.className = 'modal-fondo';
            modalFondo.innerHTML = `
                <div class="modal-contenido">
                    <p id="modal-mensaje-texto"></p>
                    <button id="btn-cerrar-modal" class="btn-cerrar">Aceptar</button>
                </div>
            `;
            document.body.appendChild(modalFondo);
        }
        const modalTexto = document.getElementById('modal-mensaje-texto');
        const btnCerrar = document.getElementById('btn-cerrar-modal');

        modalTexto.textContent = mensaje;
        modalFondo.classList.add('visible');
        btnCerrar.onclick = () => {
            modalFondo.classList.remove('visible');
        };
    }

    // Función principal de inicio de sesión
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const correo = document.getElementById('correo').value.trim();
            const password = document.getElementById('password').value;
            // Obtenemos la clave de seguridad del campo, incluso si está vacío
            const claveAdmin = adminClaveInput ? adminClaveInput.value.trim() : ''; 

            try {
                // 1. Autenticar usuario con Firebase Auth
                const userCredential = await auth.signInWithEmailAndPassword(correo, password);
                const user = userCredential.user;

                // 2. Obtener datos del usuario de Firestore para determinar el rol
                const userDoc = await db.collection('usuarios').doc(user.uid).get();

                if (!userDoc.exists) {
                    await auth.signOut(); // Si no hay rol, cerrar sesión por seguridad
                    return mostrarMensaje("Error: No se encontró la información del rol de usuario. Contacte a soporte.");
                }

                const userData = userDoc.data();
                const rol = userData.rol;

                // 3. Lógica de validación por rol y clave de seguridad
                if (rol === 'administrador') {
                    // Si es administrador, la clave de seguridad es OBLIGATORIA
                    if (claveAdmin !== CLAVE_SECRETA_ADMIN) {
                        await auth.signOut();
                        return mostrarMensaje("Acceso Denegado: Contraseña correcta, pero clave de seguridad de administrador incorrecta.");
                    }
                    mostrarMensaje("¡Inicio de sesión como Administrador exitoso!");
                    setTimeout(() => {
                        window.location.href = 'administrador/admin_dashboard.html';
                    }, 1000);
                } 
                
                else if (rol === 'estudiante') {
                    // Si es estudiante, si ingresó una clave, advertirle.
                    if (claveAdmin) {
                        mostrarMensaje("Advertencia: No es necesario ingresar clave de seguridad para cuentas de estudiante. Iniciando sesión...");
                        // No cerramos sesión, solo ignoramos la clave y procedemos
                    }
                    mostrarMensaje("¡Inicio de sesión como Estudiante exitoso!");
                    setTimeout(() => {
                        window.location.href = 'estudiante/estudiante_dashboard.html';
                    }, 1000);
                } 
                
                else {
                    // Rol desconocido
                    await auth.signOut();
                    mostrarMensaje(`Error: Rol de usuario desconocido (${rol}). Acceso restringido.`);
                }

            } catch (error) {
                console.error("Error al iniciar sesión:", error);
                let mensajeError = "Error desconocido al iniciar sesión.";

                // Manejo de errores comunes de Firebase Auth
                switch (error.code) {
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        mensajeError = "Credenciales inválidas (Correo o Contraseña incorrectos).";
                        break;
                    case 'auth/invalid-email':
                        mensajeError = "Formato de correo electrónico inválido.";
                        break;
                    case 'auth/user-disabled':
                        mensajeError = "Tu cuenta ha sido deshabilitada.";
                        break;
                    default:
                        mensajeError = `Error: ${error.message}`;
                        break;
                }
                mostrarMensaje(mensajeError);
            }
        });
    }

    // Redirección si ya está autenticado
    auth.onAuthStateChanged(user => {
        if (user) {
            // Intentamos obtener el rol y redirigir
            db.collection('usuarios').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    const rol = doc.data().rol;
                    if (rol === 'administrador') {
                        window.location.href = 'administrador/admin_dashboard.html';
                    } else if (rol === 'estudiante') {
                        window.location.href = 'estudiante/estudiante_dashboard.html';
                    }
                } else {
                    // Si no tiene documento de rol, cerrar sesión por seguridad
                    auth.signOut();
                }
            }).catch(error => {
                console.error("Error de redirección en onAuthStateChanged:", error);
            });
        }
    });
});