document.addEventListener('DOMContentLoaded', () => {

    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = './login.html';
            return;
        }
        cargarTorneosYEquipos();
    });

    const selectTorneo = document.getElementById('torneo');
    const selectEquipoA = document.getElementById('equipo-a');
    const selectEquipoB = document.getElementById('equipo-b');

    // 1. Cargar torneos activos
    function cargarTorneosYEquipos() {
        selectTorneo.innerHTML = '<option value="">Cargando torneos...</option>';

        db.collection('torneos').where('estado', 'in', ['activo', 'proximo']).get()
        .then(snapshot => {
            selectTorneo.innerHTML = '<option value="" disabled selected>Seleccione Torneo...</option>';
            if (snapshot.empty) {
                selectTorneo.innerHTML = '<option value="" disabled selected>No hay torneos disponibles</option>';
                return;
            }
            snapshot.forEach(doc => {
                const data = doc.data();
                selectTorneo.innerHTML += `<option value="${doc.id}" data-nombre="${data.nombre}" data-deporte="${data.deporte}">${data.nombre} (${data.deporte})</option>`;
            });
        }).catch(e => console.error("Error cargando torneos:", e));
    }

    // 2. Cargar equipos cuando se selecciona un torneo
    selectTorneo.addEventListener('change', () => {
        const torneoId = selectTorneo.value;
        selectEquipoA.innerHTML = '<option value="" disabled selected>Cargando equipos...</option>';
        selectEquipoB.innerHTML = '<option value="" disabled selected>Cargando equipos...</option>';

        if (!torneoId) return;

        db.collection('inscripciones')
          .where('torneoId', '==', torneoId)
          .where('estado', '==', 'aprobado')
          .get()
          .then(snapshot => {
              let optionsHtml = '<option value="" disabled selected>Seleccione un equipo...</option>';
              snapshot.forEach(doc => {
                  const equipo = doc.data().equipo;
                  optionsHtml += `<option value="${equipo}">${equipo}</option>`;
              });

              selectEquipoA.innerHTML = optionsHtml;
              selectEquipoB.innerHTML = optionsHtml;

              if (snapshot.empty) {
                  selectEquipoA.innerHTML = '<option value="" disabled selected>No hay equipos aprobados</option>';
                  selectEquipoB.innerHTML = '<option value="" disabled selected>No hay equipos aprobados</option>';
              }
          }).catch(e => console.error("Error cargando equipos:", e));
    });

    // 3. Programar partido
    document.getElementById('form-programar-partido').addEventListener('submit', async (e) => {
        e.preventDefault();

        const equipoA = selectEquipoA.value;
        const equipoB = selectEquipoB.value;
        const torneoId = selectTorneo.value;

        if (!torneoId) {
            alert('Debe seleccionar un torneo.');
            return;
        }
        if (equipoA === equipoB) {
            alert('Los equipos A y B deben ser diferentes.');
            return;
        }

        const torneoNombre = selectTorneo.options[selectTorneo.selectedIndex].getAttribute('data-nombre');
        const deporte = selectTorneo.options[selectTorneo.selectedIndex].getAttribute('data-deporte');
        const btnSubmit = e.submitter;
        btnSubmit.disabled = true;

        const nuevoPartido = {
            torneoId: torneoId,
            torneoNombre,
            deporte,
            equipoA,
            equipoB,
            fecha: document.getElementById('fecha-partido').value,
            hora: document.getElementById('hora-partido').value,
            lugar: document.getElementById('lugar-partido').value,
            fase: document.getElementById('fase-partido').value,
            estado: 'programado',
            marcadorA: null,
            marcadorB: null,
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('partidos').add(nuevoPartido);
            alert(`Partido ${equipoA} vs ${equipoB} programado exitosamente.`);
            e.target.reset();
            selectTorneo.dispatchEvent(new Event('change'));
        } catch (error) {
            console.error('Error al programar partido:', error);
            alert('Error al programar el partido. Revisa la consola.');
        } finally {
            btnSubmit.disabled = false;
        }
    });

    // 4. Cerrar sesión
    document.getElementById('cerrar-sesion').addEventListener('click', async () => {
        await auth.signOut();
        window.location.href = './login.html';
    });

});
