import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

let usuarioActual = null;
let equipoExistente = null;
let torneoIdSeleccionado = null;

// ===========================
// Detectar el estudiante y cargar su equipo
// ===========================
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = '/login.html';
  usuarioActual = user;

  // Verificar rol
  const docRef = doc(db, 'usuarios', user.uid);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists() || docSnap.data().rol !== 'estudiante') {
    await signOut(auth);
    return window.location.href = '/login.html';
  }

  // Cargar equipo del estudiante
  await cargarEquipo();

  // Obtener torneoId de la URL
  const urlParams = new URLSearchParams(window.location.search);
  torneoIdSeleccionado = urlParams.get('torneoId');

  if (torneoIdSeleccionado) {
    document.getElementById('torneo-id').textContent = `Inscribiéndote en el torneo: ${torneoIdSeleccionado}`;
  }
});

// ===========================
// Cerrar sesión
// ===========================
document.getElementById('cerrar-sesion').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = '/login.html';
});

// ===========================
// Cargar equipo del estudiante
// ===========================
async function cargarEquipo() {
  const contenedor = document.getElementById('info-equipo');
  contenedor.innerHTML = 'Cargando equipo...';

  try {
    const q = query(collection(db, 'equipos'), where('creador', '==', usuarioActual.uid));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      contenedor.textContent = 'No tienes equipos creados';
      return;
    }

    equipoExistente = snapshot.docs[0].data();
    equipoExistente.id = snapshot.docs[0].id;

    contenedor.textContent = `Equipo: ${equipoExistente.nombre}`;
  } catch(e) {
    console.error(e);
    contenedor.textContent = 'Error cargando equipo';
  }
}

// ===========================
// Inscribirse al torneo
// ===========================
document.getElementById('btn-inscribirse').addEventListener('click', async () => {
  const msg = document.getElementById('msg-inscripcion');

  if (!equipoExistente) {
    msg.textContent = 'Debes tener un equipo para inscribirte.';
    return;
  }

  if (!torneoIdSeleccionado) {
    msg.textContent = 'No se ha seleccionado ningún torneo.';
    return;
  }

  try {
    await addDoc(collection(db, 'inscripciones'), {
      estudianteUid: usuarioActual.uid,
      equipoId: equipoExistente.id,
      torneoId: torneoIdSeleccionado,
      fechaInscripcion: new Date()
    });

    msg.textContent = 'Inscripción realizada con éxito';
    document.getElementById('btn-inscribirse').disabled = true;
  } catch(e) {
    console.error(e);
    msg.textContent = 'Error al inscribirse';
  }
});
