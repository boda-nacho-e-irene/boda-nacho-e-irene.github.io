/* --- carga --- */
function cargar() {
  if (!token) {
    aviso('Este enlace está incompleto. Escríbenos y te mandamos el tuyo.');
    return;
  }
  pedir('GET', API + '?token=' + encodeURIComponent(token), null, function (d) {
    if (!d) { aviso('No hemos podido conectar. Prueba otra vez en un momento.'); return; }
    if (!d.ok) { aviso('No encontramos este enlace. Escríbenos y lo revisamos.'); return; }
    nombreEnSobre(d.nombre);
    pintar(d);
  });
}

/* --- secciones en obras --- */

/* Devuelve la sección de EN_OBRAS con ese id, o cadena vacía si ya no está
   (que es como se apaga: se borra su entrada y se escribe la de verdad). */
function seccionEnObras(id) {
  for (var i = 0; i < EN_OBRAS.length; i++) {
    if (EN_OBRAS[i].id !== id) continue;
    return '<section class="seccion" id="' + escapar(id) + '">' +
             titulo(id, EN_OBRAS[i].titulo) +
             '<p class="wip-linea"><span class="wip">En preparación</span></p>' +
             '<p class="promesa">' + escapar(EN_OBRAS[i].texto) + '</p>' +
           '</section>';
  }
  return '';
}

function pintar(d) {
  var chips = chipsAlergenos();

  pantalla(
    '<div id="contenido">' +

      '<section class="seccion" id="inicio">' +
        '<p class="emblema emblema-grande" id="emblema-inicio" aria-hidden="true">' +
          '<svg class="arco" viewBox="0 0 120 132">' +
            '<path d="M4 130 L4 64 A56 56 0 0 1 116 64 L116 130"/>' +
          '</svg>' +
        '</p>' +
        '<p class="novios">' + escapar(BODA.novios) + '</p>' +
        '<h1 class="nombre"> ¡Hola, ' + escapar(d.nombre) + '!</h1>' +
        '<p class="cita">Como ya sabes <strong> ¡Nos casamos! </strong> y nos encantaría que nos acompañases en este día tan especial. <br> Aquí te dejamos algunos detalles y toda la información que necesitas.</p>' +
      '</section>' +

      seccionFotos() +

      '<section class="seccion" id="el-dia">' +
        titulo('el-dia', 'El gran día') +
        '<dl class="datos">' +
          '<div><dt>Fecha</dt><dd>' + escapar(BODA.fecha) + '</dd></div>' +
          '<div><dt>Hora</dt><dd>' + escapar(BODA.hora) + '</dd></div>' +
          '<div><dt>Lugar</dt><dd>' + escapar(BODA.lugar) + '</dd></div>' +
        '</dl>' +
        (BODA.mapa
          ? '<p style="margin:0"><a class="mapa" href="' + escapar(BODA.mapa) + '" target="_blank" rel="noopener">Ver cómo llegar</a></p>'
          : '') +
      '</section>' +

      '<section class="seccion" id="confirmar">' +
        titulo('confirmar', '¿Nos acompañas?') +
        '<div class="eleccion">' +
          '<button type="button" class="opcion" id="si" aria-pressed="false">Sí, allí estaré</button>' +
          '<button type="button" class="opcion" id="no" aria-pressed="false">No podré ir</button>' +
        '</div>' +

        '<p class="respuesta" id="respuesta" aria-live="polite"></p>' +

        '<div class="detalle" id="detalle">' +
          '<fieldset>' +
            '<legend>Alergias e intolerancias</legend>' +
            '<p class="ayuda">Marca lo que necesites. Se lo pasamos tal cual a la cocina.</p>' +
            '<div class="chips" id="chips">' + chips + '</div>' +
          '</fieldset>' +
          '<fieldset>' +
            '<label class="campo" for="otros">Otra cosa que debamos saber</label>' +
            '<input type="text" id="otros" placeholder="Otra alergia, medicación, lo que sea">' +
          '</fieldset>' +
          camposVuelta() +
        '</div>' +

        '<fieldset>' +
          '<label class="campo" for="nota">Un mensaje para nosotros</label>' +
          '<textarea id="nota" placeholder="Opcional"></textarea>' +
        '</fieldset>' +

        '<button type="button" class="enviar" id="enviar" disabled>Enviar confirmación</button>' +
        '<p class="estado" id="estado"></p>' +
      '</section>' +

      seccionCuenta() +
      seccionEnObras('dedicatoria') +
      seccionPlaylist() +
      seccionTransporte() +
      seccionEnObras('alojamiento') +
      seccionEnObras('sitio-web') +

    '</div>'
  );

  document.getElementById('si').onclick = function () { elegir(true); };
  document.getElementById('no').onclick = function () { elegir(false); };
  document.getElementById('enviar').onclick = enviar;

  /* La cuenta atrás —y con ella el botón de guardar la fecha— no se pinta
     pasado el día de la boda. */
  var botonGuardar = document.getElementById('guardar');
  if (botonGuardar) { botonGuardar.onclick = guardarEnCalendario; }

  var botonesChip = document.getElementById('chips').getElementsByTagName('button');
  for (var j = 0; j < botonesChip.length; j++) {
    botonesChip[j].onclick = function () { alternarAlergeno(this); };
  }

  var buscar = document.getElementById('buscar');
  buscar.oninput = function () { programarBusqueda(this.value); };
  // Sin formulario que enviar, el Enter no hace nada por sí solo: que busque.
  buscar.onkeydown = function (e) {
    if (e.key === 'Enter' || e.keyCode === 13) { buscarYa(); }
  };

  /* Delegación en los dos contenedores: sus filas se repintan enteras cada vez
     y así no hay que volver a colgar un onclick por botón, como sí pasa con
     los chips, que se pintan una sola vez. */
  document.getElementById('resultados').onclick = function (e) {
    var b = botonDe(e.target, this);
    if (!b) return;

    if (b.getAttribute('data-manual')) {
      var texto = document.getElementById('buscar').value.replace(/^\s+|\s+$/g, '');
      if (texto) {
        anadirCancion({ cancion: texto, artista: '', album: '', itunes_id: '', enlace: '' });
      }
      return;
    }

    var r = hallazgos[Number(b.getAttribute('data-i'))];
    if (!r) return;
    anadirCancion({
      cancion:   r.trackName || '',
      artista:   r.artistName || '',
      album:     r.collectionName || '',
      itunes_id: r.trackId ? String(r.trackId) : '',
      enlace:    r.trackViewUrl || ''
    });
  };

  document.getElementById('mis-canciones').onclick = function (e) {
    var b = botonDe(e.target, this);
    var id = b && b.getAttribute('data-id');
    if (id) { quitarCancion(id); }
  };

  var cajaVuelta = document.getElementById('vuelta');
  if (cajaVuelta) {
    var botonesVuelta = cajaVuelta.getElementsByTagName('button');
    for (var v = 0; v < botonesVuelta.length; v++) {
      botonesVuelta[v].onclick = function () { elegirVuelta(this.getAttribute('data-v')); };
    }
  }

  ponerIconos();
  arrancarCuenta();
  montarIndice();
  restaurar(d);
}

/* Si ya había respondido antes, dejamos su respuesta puesta. Las canciones
   vienen en el mismo GET, así que se reponen aquí igual que los alérgenos. */
function restaurar(d) {
  canciones = d.canciones || [];
  pintarMisCanciones();

  if (d.alergenos) {
    var previos = String(d.alergenos).split(',');
    var botones = document.getElementById('chips').getElementsByTagName('button');
    for (var i = 0; i < previos.length; i++) {
      var v = previos[i].replace(/^\s+|\s+$/g, '');
      for (var j = 0; j < botones.length; j++) {
        if (botones[j].getAttribute('data-a') === v) {
          botones[j].setAttribute('aria-pressed', 'true');
          marcados[v] = true;
        }
      }
    }
  }
  if (d.vuelta) { elegirVuelta(String(d.vuelta)); }
  if (d.nota) { document.getElementById('nota').value = d.nota; }
  if (d.asiste === 'SI') { elegir(true); }
  else if (d.asiste === 'NO') { elegir(false); }
  if (d.asiste) {
    document.getElementById('estado').textContent =
      'Ya tenemos tu respuesta. Puedes cambiarla cuando quieras.';
  }
}


cargar();
