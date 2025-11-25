// Import Firebase 12 Modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";

// Configuración Firebase
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
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

let usuarioActual = null;
let equipoExistente = null;

// ===========================
// Protege la ruta y carga datos del estudiante
// ===========================
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = '../login.html';
  usuarioActual = user;

  const docRef = doc(db, 'usuarios', user.uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists() || docSnap.data().rol !== 'estudiante') {
    await signOut(auth);
    return window.location.href = '../login.html';
  }

  const data = docSnap.data();
  document.getElementById('nombre-estudiante').textContent = data.nombre || user.email;
  document.getElementById('correo').textContent = data.correo || user.email;
  document.getElementById('codigo').textContent = data.codigo || 'N/A';
  document.getElementById('edad').textContent = data.edad || 'N/A';
  document.getElementById('telefono').textContent = data.telefono || 'N/A';
  document.getElementById('rol').textContent = data.rol || 'N/A';

  await cargarEquipo();
  await cargarTorneos();
  await cargarPartidos();
});

// ===========================
// Cerrar sesión
// ===========================
document.getElementById('cerrar-sesion').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = '../login.html';
});

// ===========================
// Crear equipo
// ===========================
document.getElementById('crear-equipo').addEventListener('click', async () => {
  const nombreEquipo = document.getElementById('nombre-equipo').value.trim();
  const msg = document.getElementById('msg-equipo');

  if (!nombreEquipo) {
    msg.textContent = 'Debes ingresar el nombre del equipo';
    return;
  }

  try {
    await addDoc(collection(db, 'equipos'), {
      nombre: nombreEquipo,
      creador: usuarioActual.uid,
      jugadores: [{ uid: usuarioActual.uid, correo: usuarioActual.email }],
      fechaCreacion: new Date()
    });

    msg.textContent = 'Equipo creado con éxito';
    document.getElementById('nombre-equipo').value = '';
    await cargarEquipo();
  } catch(e) {
    console.error(e);
    msg.textContent = 'Error creando el equipo';
  }
});

// ===========================
// Cargar equipo
// ===========================
async function cargarEquipo() {
  const contenedor = document.getElementById('info-equipo');
  const btnInscripcionContainer = document.getElementById('btn-inscripcion-container');
  contenedor.innerHTML = 'Cargando equipo...';
  btnInscripcionContainer.innerHTML = '';

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
    btnInscripcionContainer.innerHTML = `<a href="inscripcion.html" class="btn-primary-outline">Inscribirse a Torneo</a>`;
  } catch(e) {
    console.error(e);
    contenedor.textContent = 'Error cargando equipo';
  }
}

// ===========================
// Cargar torneos
// ===========================
async function cargarTorneos() {
  const tbody = document.getElementById('lista-torneos');
  tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

  try {
    const snapshot = await getDocs(collection(db, 'torneos'));
    tbody.innerHTML = '';
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="5">No hay torneos abiertos</td></tr>';
      return;
    }

    snapshot.forEach(docu => {
      const t = docu.data();
      const fecha = t.fechaInicio?.toDate ? t.fechaInicio.toDate().toLocaleDateString('es-CO') : t.fechaInicio || 'Pendiente';
      const botonInscribirse = equipoExistente
        ? `<a href="inscripcion.html?torneoId=${docu.id}" class="btn-primary-outline">Inscribirse</a>`
        : '';

      tbody.innerHTML += `<tr>
        <td>${t.nombre}</td>
        <td>${t.deporte}</td>
        <td>${fecha}</td>
        <td>${t.estado}</td>
        <td>${botonInscribirse}</td>
      </tr>`;
    });
  } catch(e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="5">Error cargando torneos</td></tr>';
  }
}

// ===========================
// Cargar partidos
// ===========================
async function cargarPartidos() {
  const tbody = document.getElementById('lista-partidos');
  tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

  try {
    const snapshot = await getDocs(collection(db, 'partidos'));
    tbody.innerHTML = '';
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="5">No hay partidos programados</td></tr>';
      return;
    }

    snapshot.forEach(docu => {
      const p = docu.data();
      tbody.innerHTML += `<tr>
        <td>${p.equipoA}</td><td>vs</td><td>${p.equipoB}</td><td>${p.fecha}</td><td>${p.hora}</td>
      </tr>`;
    });
  } catch(e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="5">Error cargando partidos</td></tr>';
  }
}
