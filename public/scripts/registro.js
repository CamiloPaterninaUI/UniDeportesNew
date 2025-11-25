import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Configura tu proyecto Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyCGYWe2CcXLo0LJUVZNDK5ZEeBtU2aVjxw",
    authDomain: "proyecto-unibague.firebaseapp.com",
    projectId: "proyecto-unibague",
    storageBucket: "proyecto-unibague.firebasestorage.app",
    messagingSenderId: "68419956684",
    appId: "1:68419956684:web:cc4f156083423c489af769",
    measurementId: "G-7CRB91JWB9"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Modal
const modalFondo = document.getElementById('modalMensaje');
const modalTexto = document.getElementById('modalTexto');
const cerrarModal = document.getElementById('cerrarModal');
cerrarModal.addEventListener('click', () => modalFondo.classList.remove('visible'));

// Formulario
const form = document.getElementById('registroForm');
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const correo = document.getElementById('correo').value;
    const edad = document.getElementById('edad').value;
    const carrera = document.getElementById('carrera').value;
    const rh = document.getElementById('rh').value;
    const rol = document.getElementById('rol').value;
    const adminSecret = document.getElementById('adminSecret').value;
    const password = document.getElementById('password').value;
    const codigo = document.getElementById('codigo').value;
    const telefono = document.getElementById('telefono').value;
    const telefonoEmergencia = document.getElementById('telefonoEmergencia').value;
    const activo = document.getElementById('activo').value;

    // Verificar contraseña secreta si es admin
    if (rol === 'administrador' && adminSecret !== 'admin2025') {
        modalTexto.textContent = "Contraseña secreta de administrador incorrecta";
        modalFondo.classList.add('visible');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, correo, password);
        const uid = userCredential.user.uid;

        await setDoc(doc(db, 'usuarios', uid), {
            nombre, correo, edad, carrera, rh, rol, codigo,
            telefono, telEmergencia: telefonoEmergencia,
            activo: activo === 'Sí'
        });

        modalTexto.textContent = "Registro exitoso";
        modalFondo.classList.add('visible');
        form.reset();
    } catch (error) {
        console.error("Error al registrarse:", error);
        modalTexto.textContent = error.message;
        modalFondo.classList.add('visible');
    }
});
