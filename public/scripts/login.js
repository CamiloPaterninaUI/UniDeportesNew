// login.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Configuración de Firebase
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

// Modal de mensajes
const modalFondo = document.getElementById('modalMensaje');
const modalTexto = document.getElementById('modalTexto');
const cerrarModal = document.getElementById('cerrarModal');
cerrarModal.addEventListener('click', () => modalFondo.classList.remove('visible'));

// Formulario de login
const form = document.getElementById('loginForm');
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const correo = document.getElementById('correo').value;
    const password = document.getElementById('password').value;

    try {
        // Login con Firebase
        const cred = await signInWithEmailAndPassword(auth, correo, password);
        const user = cred.user;

        // Obtener rol desde Firestore
        const docRef = doc(db, 'usuarios', user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error("Usuario no registrado en la base de datos.");
        }

        const rol = docSnap.data().rol || 'estudiante';

        // Redirección según rol
        if (rol === 'administrador') {
            window.location.href = './administrador/admin_dashboard.html';
        } else {
            window.location.href = './estudiante/estudiante_dashboard.html';
        }

    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        modalTexto.textContent = error.message;
        modalFondo.classList.add('visible');
    }
});
