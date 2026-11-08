/* --- carga --- */
function cargar() {
  var lab = /[?&]lab(?=[&=]|$)/.test(location.search);
  if (lab) { abrirLaboratorio(); }

  if (!token) {
    /* Con ?lab y sin token no hay nada que pedirle al servidor: el laboratorio
       se pinta a sí mismo con datos de mentira. */
    if (!lab) { aviso(t('aviso_incompleto')); }
    paginaLista();
    return;
  }
  /* El nombre del sobre, de la visita anterior: así sale en cuanto se abre la
     página en vez de esperar a que conteste el servidor, que tarda. Si luego
     el servidor dice otro, manda el del servidor. */
  nombreEnSobre(nombreGuardado());
  pedir('GET', API + '?token=' + encodeURIComponent(token), null, function (d) {
    if (!d) { aviso(t('aviso_sin_conexion')); paginaLista(); return; }
    if (!d.ok) { aviso(t('aviso_no_encontrado')); paginaLista(); return; }
    /* Antes de pintar nada: lo que dice la hoja pisa a lo de datos.js. Un
       backend viejo no trae `config` y entonces se queda todo como estaba. */
    aplicarConfiguracion(d.config);
    guardarNombre(d.nombre);
    nombreEnSobre(d.nombre);
    /* Pintar la invitación entera es trabajo gordo: se espera a que el sobre
       haya acabado de subir (js/sobre.js) para no darle tirones. Ya pintada,
       sale la pista y lo que iba a bajar al hacer scroll baja ahora, detrás
       del sobre. */
    trasIntro(function () {
      pintar(d);
      paginaLista();
      adelantarImagenes(app);
    });
  });
}

/* El nombre se guarda por enlace, en este navegador y nada más. Todo dentro
   de un try: en una ventana privada o con los datos bloqueados el almacén
   lanza, y entonces simplemente no hay nombre guardado. */
function nombreGuardado() {
  try { return window.localStorage.getItem('sobre-nombre:' + token) || ''; }
  catch (e) { return ''; }
}
function guardarNombre(nombre) {
  try { if (nombre) window.localStorage.setItem('sobre-nombre:' + token, nombre); }
  catch (e) { /* sin almacén, sin caché */ }
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
  /* Las fechas de la cuenta y del calendario salen de BODA: se recalculan aquí
     para que pinten lo que haya en ese momento, también en ?lab, que no pasa
     por cargar(). */
  recalcularFechas();

  pantalla(
    '<div id="contenido">' +

      /* La primera pantalla, la que se ve al apartarse el sobre: la acuarela
         del convento con los nombres, la fecha y el sitio encima, y el enlace
         a lo único que les pedimos. Aquí va el <h1> de la página; lo personal
         viene detrás. Sin emblema: la acuarela ya es el adorno, y el arco
         grande se queda para la portada, que es la sección siguiente. */
      '<section class="seccion" id="presentacion">' +
        '<p class="presenta-rotulo">' + escapar(t('presenta_rotulo')) + '</p>' +
        '<h1 class="presenta-nombres">' + nombresDePila() + '</h1>' +
        '<p class="presenta-fecha">' + escapar(BODA.fecha) + '</p>' +
        '<p class="presenta-lugar">' + escapar(BODA.lugar) + '</p>' +
        '<p class="presenta-pie">' +
          '<a class="presenta-enlace" href="#confirmar">' + escapar(t('presenta_enlace')) + '</a>' +
          '<span class="presenta-flecha" aria-hidden="true"></span>' +
        '</p>' +
      '</section>' +

      '<section class="seccion" id="inicio">' +
        '<p class="emblema emblema-grande" id="emblema-inicio" aria-hidden="true">' +
          '<svg class="arco" viewBox="0 0 120 132">' +
            '<path d="M4 130 L4 64 A56 56 0 0 1 116 64 L116 130"/>' +
          '</svg>' +
        '</p>' +
        '<h2 class="nombre"> ' + escapar(t('inicio_saludo')) + ', ' + escapar(d.nombre) + '</h2>' +
        /* Texto de la invitación: cuatro párrafos, con los destacados en negrita.
           Los dibujos de fondo van dentro de este bloque: así nunca quedan por
           encima del título ni por debajo de los nombres. */
        '<div class="cita">' +
          /* Dibujos de fondo, casi transparentes y detrás del texto. Cada uno es
             un marco; si existe su archivo en img/dibujos, el dibujo se pinta. */
          '<div class="inicio-fondos" aria-hidden="true">' +
            '<span class="fondo-marco fondo-1"></span>' +
            '<span class="fondo-marco fondo-2"></span>' +
            '<span class="fondo-marco fondo-3"></span>' +
            '<span class="fondo-marco fondo-4"></span>' +
            '<span class="fondo-marco fondo-5"></span>' +
          '</div>' +
          '<p>Como ya sabes <strong>¡Nos casamos!</strong> y nos encantaría que nos acompañáseis en este día tan especial.</p>' +
          '<p>No todos los días se puede celebrar uno de los días más felices de nuestra vida rodeados de toda la gente que queremos.</br>Estamos muy felices de compartir el día con todos vosotros y ansiosos por disfrutarlo a tope. Hemos hecho esta invitación para que tengáis toda la información que necesitéis.</p>' +
          '<p>Abajo podéis encontrar <strong>un formulario muy cortito</strong> para los pequeños detalles de organización, agradeceríamos que respondiéseis y nos comentáseis cualquier cosa que se os ocurra (un whatsapp también vale pero esto mola más).</p>' +
          '<p>Tenemos muchas ganas de veros!</p>' +
        '</div>' +
        '<p class="novios">' + escapar(BODA.novios) + '</p>' +
      '</section>' +

      seccionCuenta() +

      '<section class="seccion" id="el-dia">' +
        /* La junta con la cuenta atrás: una franja de papel con la floritura
           ocre. Va dentro de esta sección y no suelta entre las dos porque el
           índice reordena las secciones y la dejaría colgando. Sin cuenta
           atrás no hay junta que marcar. */
        (hayCuenta() ? '<div class="junta-floritura" aria-hidden="true">' +
          '<img src="img/separadores/floritura-horizontal-ocre.webp" width="1200" height="298" alt="">' +
        '</div>' : '') +
        tituloSinIcono('y... ¿Dónde?') +
        '<div class="lugar-intro-fila">' + marcadorImagen('img/dibujos/mapa.webp') +
          '<div class="lugar-intro-texto">' +
            '<p class="lugar-intro">' + escapar(t('lugar_intro')) + '</p>' +
            '<p class="lugar-intro">Juntar a todo el mundo a veces es complicado, nos encantaría que estuviéseis lo máximo posible con nosotros, por eso todo el evento se va a realizar en la misma zona.</p>' +
          '</div>' +
        '</div>' +
        /* Como en la cuenta atrás, el botón va lo último: después de la tira. */
        '<div class="franja">' + carruselLugar() + lugaresDelDia() + '</div>' +
        botonMapa() +
        /* Y la junta de abajo, con lo azul que venga detrás: la otra floritura. */
        '<div class="junta-floritura abajo" aria-hidden="true">' +
          '<img src="img/separadores/floritura-horizontal-ocre-2.webp" width="1200" height="298" alt="">' +
        '</div>' +
      '</section>' +

      '<section class="seccion" id="confirmar">' +
        /* Sin el arco encima: la floritura de la junta hace ese papel. */
        tituloSinIcono(t('titulo_confirmar')) +
        bloque('confirmar',
          '<div class="eleccion">' +
            '<button type="button" class="opcion" id="si" aria-pressed="false">' + escapar(t('confirmar_si')) + '</button>' +
            '<button type="button" class="opcion" id="no" aria-pressed="false">' + escapar(t('confirmar_no')) + '</button>' +
          '</div>' +

          '<p class="respuesta" id="respuesta" aria-live="polite"></p>' +

          /* El mensaje se queda aquí y no en una sección propia: a quien no
             puede venir se le esconde todo lo que va detrás de esta sección, y
             es justo lo que sí tiene sentido que nos deje escrito. */
          '<fieldset>' +
            '<label class="campo" for="nota">' + escapar(t('confirmar_mensaje')) + '</label>' +
            '<textarea id="nota" placeholder="' + escapar(t('confirmar_mensaje_pista')) + '"></textarea>' +
          '</fieldset>' +

          '<button type="button" class="enviar" id="enviar-confirmar" disabled>' +
            escapar(t('confirmar_enviar')) + '</button>'
        ) +
      '</section>' +

      seccionMasDetalles() +

      /* Pie vacío al final: su alto es el de los botones de saltar, así lo último
         de la página no queda debajo de ellos. */
      '<footer class="pie-pagina" aria-hidden="true"></footer>' +

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

  /* Las horas de cada recorrido y la X son la elección: un clic guarda ese
     tramo. Un solo manejador en la sección, que las horas se repintan enteras. */
  var cajaTransporte = document.getElementById('transporte');
  if (cajaTransporte) {
    cajaTransporte.onclick = function (e) {
      var b = botonDe(e.target, this);
      if (!b || !b.getAttribute('data-tramo')) return;
      elegirTramo(b.getAttribute('data-tramo'), b.getAttribute('data-v'));
    };
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
  if (d.ida) { marcarTramo('ida', String(d.ida)); }
  if (d.vuelta) { marcarTramo('vuelta', String(d.vuelta)); }
  if (d.nota) { document.getElementById('nota').value = d.nota; }
  if (d.asiste === 'SI') { elegir(true); }
  else if (d.asiste === 'NO') { elegir(false); }

  /* Lo que ya está en la hoja es lo que da cada formulario por hecho, y es lo
     que decide qué llega plegado y qué llega abierto. */
  guardado.asiste = !!d.asiste;
  guardado.alergenos = !!d.alergenos;
  guardado.ida = !!d.ida;
  guardado.vuelta = !!d.vuelta;

  repasarEnvioAlergias();
  repasarBloques();
  montarIndice();
}


cargar();
