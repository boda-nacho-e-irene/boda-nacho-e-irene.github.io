/* --- carga --- */
function cargar() {
  var lab = /[?&]lab(?=[&=]|$)/.test(location.search);
  if (lab) { abrirLaboratorio(); }

  if (!token) {
    /* Con ?lab y sin token no hay nada que pedirle al servidor: el laboratorio
       se pinta a sí mismo con datos de mentira. */
    if (!lab) { aviso('Este enlace está incompleto. Escríbenos y te mandamos el tuyo.'); }
    return;
  }
  pedir('GET', API + '?token=' + encodeURIComponent(token), null, function (d) {
    if (!d) { aviso('No hemos podido conectar. Prueba otra vez en un momento.'); return; }
    if (!d.ok) { aviso('No encontramos este enlace. Escríbenos y lo revisamos.'); return; }
    nombreEnSobre(d.nombre);
    pintar(d);
  });
}

/* El laboratorio de estilos —el panel para probar colores y letras— vive en
   lab/ y solo baja con ?lab en la dirección. Para un invitado esto es un
   regex y nada más: ni una petición de más ni un byte de panel. */
function abrirLaboratorio() {
  var s = document.createElement('script');
  s.src = 'lab/lab.js';
  s.onerror = function () { aviso('No hemos podido abrir el laboratorio.'); };
  document.head.appendChild(s);
}

/* --- presentación --- */

/* Los nombres de pila de la primera pantalla, uno debajo de otro con el «&»
   en medio. Sin BODA.nombres se cae al nombre completo de los novios: una
   línea sola, sin ampersand, y la sección sigue en pie. */
function nombresDePila() {
  var lista = (BODA.nombres && BODA.nombres.length) ? BODA.nombres : [BODA.novios];
  var html = '';
  for (var i = 0; i < lista.length; i++) {
    if (i) { html += '<span class="presenta-y">&amp;</span>'; }
    html += '<span class="presenta-nombre">' + escapar(lista[i]) + '</span>';
  }
  return html;
}

function pintar(d) {

  pantalla(
    '<div id="contenido">' +

      /* La primera pantalla, la que se ve al apartarse el sobre: la acuarela
         del convento con los nombres, la fecha y el sitio encima, y el enlace
         a lo único que les pedimos. Aquí va el <h1> de la página; lo personal
         viene detrás. Sin emblema: la acuarela ya es el adorno, y el arco
         grande se queda para la portada, que es la sección siguiente. */
      '<section class="seccion" id="presentacion">' +
        '<p class="presenta-rotulo">Nos casamos</p>' +
        '<h1 class="presenta-nombres">' + nombresDePila() + '</h1>' +
        '<p class="presenta-fecha">' + escapar(BODA.fecha) + '</p>' +
        '<p class="presenta-lugar">' + escapar(BODA.lugar) + '</p>' +
        '<p class="presenta-pie">' +
          '<a class="presenta-enlace" href="#confirmar">Confirma tu asistencia</a>' +
          '<span class="presenta-flecha" aria-hidden="true"></span>' +
        '</p>' +
      '</section>' +

      '<section class="seccion" id="inicio">' +
        '<p class="emblema emblema-grande" id="emblema-inicio" aria-hidden="true">' +
          '<svg class="arco" viewBox="0 0 120 132">' +
            '<path d="M4 130 L4 64 A56 56 0 0 1 116 64 L116 130"/>' +
          '</svg>' +
        '</p>' +
        '<p class="novios">' + escapar(BODA.novios) + '</p>' +
        '<h2 class="nombre"> Hola, ' + escapar(d.nombre) + '</h2>' +
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
        bloque('confirmar',
          '<div class="eleccion">' +
            '<button type="button" class="opcion" id="si" aria-pressed="false">Sí, allí estaré</button>' +
            '<button type="button" class="opcion" id="no" aria-pressed="false">No podré ir</button>' +
          '</div>' +

          '<p class="respuesta" id="respuesta" aria-live="polite"></p>' +

          /* El mensaje se queda aquí y no en una sección propia: a quien no
             puede venir se le esconde todo lo que va detrás de esta sección, y
             es justo lo que sí tiene sentido que nos deje escrito. */
          '<fieldset>' +
            '<label class="campo" for="nota">Un mensaje para nosotros</label>' +
            '<textarea id="nota" placeholder="Opcional"></textarea>' +
          '</fieldset>' +

          '<button type="button" class="enviar" id="enviar-confirmar" disabled>Enviar confirmación</button>'
        ) +
      '</section>' +

      seccionAlergias() +
      seccionCuenta() +
      seccionPlaylist() +
      seccionTransporte() +

      /* Las de EN_OBRAS no se pintan: hasta que tengan contenido viven solo en
         el índice, como botones apagados. */

    '</div>'
  );

  document.getElementById('si').onclick = function () { elegir(true); };
  document.getElementById('no').onclick = function () { elegir(false); };
  document.getElementById('enviar-confirmar').onclick = enviarConfirmacion;
  document.getElementById('enviar-alergias').onclick = enviarAlergias;

  /* Los botones de las líneas de resumen, uno por bloque. */
  for (var p = 0; p < BLOQUES.length; p++) { cablearCambiar(BLOQUES[p].id); }

  /* La cuenta atrás —y con ella el botón de guardar la fecha— no se pinta
     pasado el día de la boda. */
  var botonGuardar = document.getElementById('guardar');
  if (botonGuardar) { botonGuardar.onclick = guardarEnCalendario; }

  var botonesChip = document.getElementById('chips').getElementsByTagName('button');
  for (var j = 0; j < botonesChip.length; j++) {
    botonesChip[j].onclick = function () { alternarAlergeno(this); };
  }

  document.getElementById('otros').oninput = repasarEnvioAlergias;

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

  /* Sin trayecto elegible no hay botones que elegir ni nada que enviar desde
     *Transporte*: la sección se queda en los recorridos y ya está. */
  var cajaVuelta = document.getElementById('vuelta');
  if (cajaVuelta) {
    var botonesVuelta = cajaVuelta.getElementsByTagName('button');
    for (var v = 0; v < botonesVuelta.length; v++) {
      botonesVuelta[v].onclick = function () { elegirVuelta(this.getAttribute('data-v')); };
    }
    document.getElementById('enviar-transporte').onclick = enviarVuelta;
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

  /* Los alérgenos vuelven en una sola línea de texto: lo que coincide con un
     chip lo marca, y lo que no —lo que escribió en «otra cosa»— vuelve a su
     campo. Sin esa segunda mitad, abrir el bloque y reenviarlo lo borraría de
     la hoja, y el resumen diría menos de lo que hay guardado. */
  if (d.alergenos) {
    var previos = String(d.alergenos).split(',');
    var botones = document.getElementById('chips').getElementsByTagName('button');
    var sueltos = [];

    for (var i = 0; i < previos.length; i++) {
      var v = previos[i].replace(/^\s+|\s+$/g, '');
      if (!v) continue;

      var suyo = false;
      for (var j = 0; j < botones.length; j++) {
        if (botones[j].getAttribute('data-a') === v) {
          botones[j].setAttribute('aria-pressed', 'true');
          marcados[v] = true;
          suyo = true;
        }
      }
      if (!suyo) { sueltos.push(v); }
    }
    if (sueltos.length) { document.getElementById('otros').value = sueltos.join(', '); }
  }
  if (d.vuelta) { elegirVuelta(String(d.vuelta)); }
  if (d.nota) { document.getElementById('nota').value = d.nota; }
  if (d.asiste === 'SI') { elegir(true); }
  else if (d.asiste === 'NO') { elegir(false); }

  /* Lo que ya está en la hoja es lo que da cada formulario por hecho, y es lo
     que decide qué llega plegado y qué llega abierto. */
  guardado.asiste = !!d.asiste;
  guardado.alergenos = !!d.alergenos;
  guardado.vuelta = !!d.vuelta;

  repasarEnvioAlergias();
  repasarBloques();
  montarIndice();
}


cargar();
