document.addEventListener("DOMContentLoaded", () => {
    // Verificar que Firebase esté cargado
    if (typeof firebase === 'undefined' || typeof auth === 'undefined' || typeof db === 'undefined') {
        alert("🚨 Error: Firebase no está cargado.");
        return;
    }

    // =======================================================
    // 1. CONSTANTES Y REFERENCIAS DEL DOM
    // =======================================================
    // Selector de Roles (Alternancia)
    const studentFormContainer = document.getElementById('student-form-container');
    const adminFormContainer = document.getElementById('admin-form-container');
    const showStudentBtn = document.getElementById('show-student-form-btn');
    const showAdminBtn = document.getElementById('show-admin-form-btn');

    // Formularios
    const formRegistroEstudiante = document.getElementById("form-registro-estudiante");
    const formRegistroAdmin = document.getElementById("form-registro-admin");

    // Patrones de Validación
    const PATRON_CORREO_ESTUDIANTE = /^[a-zA-Z0-9._%+-]+@(gmail\.com|estudiantesunibague\.edu\.co)$/i;
    // ⚠️ ATENCIÓN: CLAVE SECRETA DEBE SER LA MISMA QUE EN TU LOGIN DE ADMIN ⚠️
    const ADMIN_CLAVE_SECRETA = "admin2025"; 


    // =======================================================
    // 2. LÓGICA DE ALTERNANCIA DE FORMULARIOS
    // =======================================================
    function showStudentForm() {
        studentFormContainer.classList.remove('hidden');
        adminFormContainer.classList.add('hidden');
        showStudentBtn.classList.add('active');
        showAdminBtn.classList.remove('active');
    }

    function showAdminForm() {
        adminFormContainer.classList.remove('hidden');
        studentFormContainer.classList.add('hidden');
        showAdminBtn.classList.add('active');
        showStudentBtn.classList.remove('active');
    }

    showStudentBtn.addEventListener('click', showStudentForm);
    showAdminBtn.addEventListener('click', showAdminForm);
    
    // Mostrar Estudiante por defecto al cargar
    showStudentForm(); 


    // =======================================================
    // 3. LÓGICA DE REGISTRO DE ESTUDIANTE (rol: 'estudiante')
    // =======================================================
    formRegistroEstudiante.addEventListener("submit", async (event) => {
        event.preventDefault();

        // 1. Capturar valores
        const nombre = document.getElementById("nombre-estudiante").value.trim();
        const correo = document.getElementById("correo-estudiante").value.trim();
        const password = document.getElementById("password-estudiante").value.trim();
        const codigo = document.getElementById("codigo-estudiante").value.trim();
        const edad = document.getElementById("edad-estudiante").value.trim();
        const tipo_sangre = document.getElementById("tipo_sangre-estudiante").value;
        const telefono = document.getElementById("telefono-estudiante").value.trim();
        const emergencia = document.getElementById("emergencia-estudiante").value.trim();
        const activo = "Sí"; 

        // 2. Validaciones
        if (!nombre || !correo || !password || !codigo || !edad || !telefono || !emergencia || !tipo_sangre) {
            alert("Por favor, complete todos los campos requeridos.");
            return;
        }

        if (!PATRON_CORREO_ESTUDIANTE.test(correo)) {
            alert("Solo se permiten correos Gmail o institucionales (@estudiantesunibague.edu.co).");
            return;
        }

        if (password.length < 6) {
            alert("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        try {
            // 3. Crear usuario en Firebase Authentication
            const userCredential = await auth.createUserWithEmailAndPassword(correo, password);
            const user = userCredential.user;
            
            // 4. Actualizar el perfil y guardar en Firestore
            await user.updateProfile({ displayName: nombre });
            
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
                rol: "estudiante", 
                fecha_registro: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert("✅ Registro de Estudiante exitoso. Ahora puedes iniciar sesión.");
            // ⭐ REDIRECCIÓN CORREGIDA a la carpeta 'estudiantes' ⭐
            window.location.href = "estudiantes/login_estudiante.html"; 

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
            console.error("Error de registro de estudiante:", error);
        }
    });


    // =======================================================
    // 4. LÓGICA DE REGISTRO DE ADMINISTRADOR (rol: 'admin')
    // =======================================================
    formRegistroAdmin.addEventListener("submit", async (event) => {
        event.preventDefault();

        // 1. Capturar valores
        const nombre = document.getElementById("nombre-admin").value.trim();
        const correo = document.getElementById("correo-admin").value.trim();
        const password = document.getElementById("password-admin").value.trim();
        const claveSecreta = document.getElementById("clave-admin").value.trim();

        // 2. Validaciones de Seguridad y Campos
        if (!nombre || !correo || !password || !claveSecreta) {
            alert("Por favor, complete todos los campos requeridos.");
            return;
        }

        if (password.length < 6) {
            alert("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        // 3. Validación de CLAVE SECRETA (Seguridad crítica)
        if (claveSecreta !== ADMIN_CLAVE_SECRETA) {
            alert("🚫 Clave de seguridad de administrador incorrecta.");
            return;
        }
        
        try {
            // 4. Crear usuario en Firebase Authentication
            const userCredential = await auth.createUserWithEmailAndPassword(correo, password);
            const user = userCredential.user;
            
            // 5. Actualizar el perfil y guardar en Firestore
            await user.updateProfile({ displayName: nombre });
            
            await db.collection("usuarios").doc(user.email).set({
                uid: user.uid,
                nombre,
                correo,
                rol: "admin", 
                fecha_registro: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert("✅ Cuenta de Administrador creada exitosamente. Ahora inicie sesión.");
            // ⭐ REDIRECCIÓN CORREGIDA a la carpeta 'administrador' ⭐
            window.location.href = "administrador/login_administrador.html"; 

        } catch (error) {
            let mensaje = "❌ Error al registrar administrador.";
            if (error.code === 'auth/email-already-in-use') {
                mensaje = "❌ Este correo ya está registrado.";
            } else if (error.code === 'auth/weak-password') {
                mensaje = "❌ La contraseña es demasiado débil (mínimo 6 caracteres).";
            } else {
                 mensaje += ` Código de error: ${error.code}`;
            }
            alert(mensaje);
            console.error("Error de registro de administrador:", error);
        }
    });

});