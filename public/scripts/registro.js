// --- CONFIGURACIÓN DE SEGURIDAD ---
// Clave Maestra: Se utiliza para autorizar el registro de la primera cuenta de administrador.
// ¡CAMBIA ESTA CLAVE POR UNA ÚNICA Y SECRETA INMEDIATAMENTE DESPUÉS DE LA CONFIGURACIÓN INICIAL!
const CLAVE_SECRETA_ADMIN = "admin2025"; 

// Se asume que 'auth', 'db' y 'firebase' son variables globales definidas en registro.html
// Re-definimos referencias para asegurar que no fallen en el scope del script.
const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los formularios y contenedores
    const formRegistroEstudiante = document.getElementById('form-registro-estudiante');
    const formRegistroAdmin = document.getElementById('form-registro-admin');
    const btnToggleAdmin = document.getElementById('btn-toggle-admin');
    const estudianteFormContainer = document.getElementById('estudiante-form-container');
    const adminFormContainer = document.getElementById('admin-form-container');

    // Inicializar el contenedor de mensajes (asumiendo que existe un modal similar en el HTML)
    const modalFondo = document.createElement('div');
    modalFondo.id = 'modal-mensaje-fondo';
    modalFondo.className = 'modal-fondo';
    modalFondo.innerHTML = `
        <div class="modal-contenido">
            <p id="modal-mensaje-texto"></p>
            <button id="btn-cerrar-modal" class="btn-cerrar">Aceptar</button>
        </div>
    `;
    document.body.appendChild(modalFondo);
    const modalTexto = document.getElementById('modal-mensaje-texto');
    const btnCerrar = document.getElementById('btn-cerrar-modal');

    function mostrarMensaje(mensaje) {
        modalTexto.textContent = mensaje;
        modalFondo.classList.add('visible');
        btnCerrar.onclick = () => {
            modalFondo.classList.remove('visible');
        };
    }

    // Lógica para mostrar/ocultar formularios (Asumimos un botón de toggle)
    if (btnToggleAdmin) {
        btnToggleAdmin.addEventListener('click', () => {
            estudianteFormContainer.classList.toggle('hidden');
            adminFormContainer.classList.toggle('hidden');
            // Cambiar texto del botón
            if (adminFormContainer.classList.contains('hidden')) {
                btnToggleAdmin.textContent = '¿Eres Administrador? Regístrate aquí.';
            } else {
                btnToggleAdmin.textContent = 'Volver a Registro de Estudiante';
            }
        });
    }

    // ----------------------------------------------------
    // LÓGICA DE REGISTRO DE ESTUDIANTE
    // ----------------------------------------------------
    if (formRegistroEstudiante) {
        formRegistroEstudiante.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nombre = document.getElementById('nombre').value.trim();
            const codigo = document.getElementById('codigo').value.trim();
            const correo = document.getElementById('correo').value.trim();
            const password = document.getElementById('password').value;
            const edad = document.getElementById('edad').value;
            const tipo_sangre = document.getElementById('tipo_sangre').value;
            const telefono = document.getElementById('telefono').value.trim();
            const emergencia = document.getElementById('emergencia').value.trim();

            if (password.length < 6) {
                return mostrarMensaje("Error: La contraseña debe tener al menos 6 caracteres.");
            }

            try {
                // 1. Crear usuario en Firebase Authentication
                const userCredential = await auth.createUserWithEmailAndPassword(correo, password);
                const user = userCredential.user;

                // 2. Crear documento de usuario en Firestore
                await db.collection('usuarios').doc(user.uid).set({
                    uid: user.uid,
                    nombre: nombre,
                    correo: correo,
                    codigo: codigo,
                    edad: parseInt(edad),
                    tipo_sangre: tipo_sangre,
                    telefono: telefono,
                    emergencia: emergencia,
                    activo: true, // Asumimos que los nuevos estudiantes están activos
                    rol: 'estudiante', 
                    fecha_registro: firebase.firestore.FieldValue.serverTimestamp()
                });

                mostrarMensaje(`¡Registro de estudiante exitoso! Serás redirigido al panel.`);
                
                setTimeout(() => {
                    window.location.href = 'estudiante/estudiante_dashboard.html';
                }, 2000);

            } catch (error) {
                console.error("Error al registrar estudiante:", error);
                mostrarMensaje(`Error al registrar: ${error.message}`);
            }
        });
    }

    // ----------------------------------------------------
    // LÓGICA DE REGISTRO DE ADMINISTRADOR
    // ----------------------------------------------------
    if (formRegistroAdmin) {
        formRegistroAdmin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nombre = document.getElementById('nombre-admin').value.trim();
            const correo = document.getElementById('correo-admin').value.trim();
            const password = document.getElementById('password-admin').value;
            const claveSeguridad = document.getElementById('clave-admin').value; 

            // ** 1. Validación de la Clave Secreta **
            if (claveSeguridad !== CLAVE_SECRETA_ADMIN) {
                return mostrarMensaje("Error: La clave de seguridad de administrador no es correcta.");
            }
            
            if (password.length < 6) {
                return mostrarMensaje("Error: La contraseña debe tener al menos 6 caracteres.");
            }

            try {
                // 2. Crear usuario en Firebase Authentication
                const userCredential = await auth.createUserWithEmailAndPassword(correo, password);
                const user = userCredential.user;

                // 3. Crear documento de usuario en Firestore con rol 'administrador'
                await db.collection('usuarios').doc(user.uid).set({
                    uid: user.uid,
                    nombre: nombre,
                    correo: correo,
                    codigo: 'ADMIN_UNIBAGUE', 
                    edad: 0,
                    tipo_sangre: 'N/A',
                    telefono: 'N/A',
                    emergencia: 'N/A',
                    activo: true,
                    rol: 'administrador', // Rol clave para el login
                    fecha_registro: firebase.firestore.FieldValue.serverTimestamp()
                });

                mostrarMensaje(`¡Cuenta de administrador creada con éxito! Serás redirigido al panel.`);
                
                setTimeout(() => {
                    window.location.href = 'administrador/admin_dashboard.html';
                }, 2000);

            } catch (error) {
                console.error("Error al registrar administrador:", error);
                mostrarMensaje(`Error al registrar: ${error.message}`);
            }
        });
    }

    // Redirección si ya está autenticado
    auth.onAuthStateChanged(user => {
        if (user) {
            // Si ya está logueado, redirigir según su rol (esto se hace en login.js normalmente, pero es buena práctica)
            db.collection('usuarios').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    const rol = doc.data().rol;
                    if (rol === 'administrador') {
                        window.location.href = 'administrador/admin_dashboard.html';
                    } else if (rol === 'estudiante') {
                        window.location.href = 'estudiante/estudiante_dashboard.html';
                    }
                }
            }).catch(error => {
                console.error("Error al verificar rol:", error);
            });
        }
    });
});