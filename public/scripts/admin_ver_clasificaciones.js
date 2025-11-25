auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = './login.html';
        return;
    }
    cargarFiltroTorneos();
});

// 1. Cargar torneos al filtro
function cargarFiltroTorneos() {
    const filtro = document.getElementById('filtro-torneo');
    filtro.innerHTML = '<option value="" disabled selected>Cargando torneos...</option>';

    db.collection('torneos').where('estado', 'in', ['activo', 'finalizado']).orderBy('fechaInicio', 'desc').get().then(snapshot => {
        filtro.innerHTML = '<option value="" disabled selected>Seleccione un torneo...</option>';
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                filtro.innerHTML += `<option value="${doc.id}" data-nombre="${doc.data().nombre}">${doc.data().nombre}</option>`;
            });
             // Seleccionar y cargar la primera clasificación por defecto
             filtro.value = snapshot.docs[0].id;
             document.getElementById('titulo-tabla').textContent = `Clasificación - ${snapshot.docs[0].data().nombre}`;
             cargarClasificacion(snapshot.docs[0].id);
        } else {
            document.getElementById('mensaje-carga').textContent = 'No hay torneos con datos de clasificación.';
        }
    }).catch(e => console.error("Error cargando torneos para filtro:", e));
}

// 2. Manejar el cambio de torneo
document.getElementById('filtro-torneo').addEventListener('change', (e) => {
    const torneoId = e.target.value;
    const torneoNombre = e.target.options[e.target.selectedIndex].getAttribute('data-nombre');
    document.getElementById('titulo-tabla').textContent = `Clasificación - ${torneoNombre}`;
    cargarClasificacion(torneoId);
});

// 3. Función para cargar la clasificación
async function cargarClasificacion(torneoId) {
    const listaCuerpo = document.getElementById('lista-clasificaciones-cuerpo');
    const mensajeCarga = document.getElementById('mensaje-carga');
    mensajeCarga.style.display = 'block';
    mensajeCarga.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando datos...';
    listaCuerpo.innerHTML = '';

    try {
        // NOTA: Asumimos que existe una colección 'clasificaciones' que se actualiza
        // automáticamente (ej. por una Cloud Function) al registrar un resultado.
        const clasificacionSnapshot = await db.collection('clasificaciones')
            .where('torneoId', '==', torneoId)
            .orderBy('puntos', 'desc')
            .orderBy('dg', 'desc') // Desempate por Diferencia de Goles
            .get();

        if (clasificacionSnapshot.empty) {
            mensajeCarga.textContent = 'No hay datos de clasificación disponibles para este torneo.';
            return;
        }

        let posicion = 1;
        clasificacionSnapshot.forEach(doc => {
            const stats = doc.data();
            const fila = listaCuerpo.insertRow();
            fila.innerHTML = `
                <td class="pos">${posicion++}</td>
                <td>${stats.equipo}</td>
                <td>${stats.pj || 0}</td>
                <td>${stats.pg || 0}</td>
                <td>${stats.pe || 0}</td>
                <td>${stats.pp || 0}</td>
                <td>${stats.gf || 0}</td>
                <td>${stats.gc || 0}</td>
                <td>${stats.dg || 0}</td>
                <td class="puntos">${stats.puntos || 0}</td>
            `;
        });
        
        mensajeCarga.style.display = 'none';

    } catch (error) {
        console.error('Error al cargar clasificaciones:', error);
        mensajeCarga.textContent = 'Error al cargar los datos de clasificación.';
    }
}