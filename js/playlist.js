/* --- sugerencias de música --- */

/* Va detrás de «Confirmar», así que `ajustarAlcance()` se la lleva por delante
   en cuanto alguien dice que no puede venir, como al resto de las de después.
   Las canciones que hubiese mandado antes siguen en la hoja: solo desaparece
   la sección. */
function seccionPlaylist() {
  return '<section class="seccion" id="playlist">' +
           titulo('playlist', 'Pon tú la música') +
           '<p class="ayuda">Busca hasta ' + MAX_CANCIONES + ' canciones y te las apuntamos. ' +
             'Si añades una más, sustituye a la más antigua.</p>' +
           '<h3 class="subtitulo">Tus canciones</h3>' +
           '<ul class="mis-canciones" id="mis-canciones"></ul>' +
           '<fieldset>' +
             '<label class="campo" for="buscar">Busca una canción</label>' +
             '<input type="search" id="buscar" placeholder="Título o artista" autocomplete="off">' +
           '</fieldset>' +
           '<div class="resultados" id="resultados" aria-live="polite"></div>' +
           '<p class="estado" id="estado-musica" role="status" aria-live="polite"></p>' +
         '</section>';
}

function estadoMusica(texto, mal) {
  var e = document.getElementById('estado-musica');
  if (!e) return;
  e.className = mal ? 'estado mal' : 'estado';
  e.textContent = texto;
}

/* Las que ya ha mandado, cada una con su botón de quitar. */
function pintarMisCanciones() {
  var caja = document.getElementById('mis-canciones');
  if (!caja) return;

  if (!canciones.length) {
    caja.innerHTML = '<li class="vacio">Todavía no has propuesto ninguna.</li>';
    return;
  }

  var html = '';
  for (var i = 0; i < canciones.length; i++) {
    var c = canciones[i];
    html += '<li>' +
              '<span class="pista"><b>' + escapar(c.cancion) + '</b>' +
                '<span>' + escapar(c.artista || 'Sin artista') + '</span></span>' +
              '<button type="button" class="quitar" data-id="' + escapar(c.id) + '">Quitar</button>' +
            '</li>';
  }
  caja.innerHTML = html;
}

/* Los objetos de iTunes se guardan en `hallazgos` y las filas los señalan por
   posición: así no hay que meter JSON dentro de un atributo. */
function pintarHallazgos(lista) {
  var caja = document.getElementById('resultados');
  if (!caja) return;

  hallazgos = lista || [];
  var html = '';

  for (var i = 0; i < hallazgos.length; i++) {
    var r = hallazgos[i];
    var album = r.collectionName ? ' · ' + r.collectionName : '';
    html += '<div class="resultado">' +
              (r.artworkUrl100
                ? '<img class="caratula" src="' + escapar(r.artworkUrl100) + '" ' +
                    'width="48" height="48" alt="" loading="lazy" decoding="async">'
                : '<span class="caratula"></span>') +
              '<span class="pista"><b>' + escapar(r.trackName) + '</b>' +
                '<span>' + escapar(r.artistName + album) + '</span></span>' +
              '<button type="button" class="anadir" data-i="' + i + '">Añadir</button>' +
            '</div>';
  }
  caja.innerHTML = html;
}

function limpiarHallazgos() {
  buscadaN++;                                   // lo que venga de camino ya no vale
  hallazgos = [];
  var caja = document.getElementById('resultados');
  if (caja) { caja.innerHTML = ''; }
}

/* Con la canción ya apuntada arriba, la búsqueda que la encontró sobra: se
   vacía para empezar la siguiente en limpio. */
function limpiarBusqueda() {
  if (buscador) { clearTimeout(buscador); buscador = null; }
  var campo = document.getElementById('buscar');
  if (campo) { campo.value = ''; }
  limpiarHallazgos();
}

function buscarEnItunes(texto) {
  var mia = ++buscadaN;
  var url = 'https://itunes.apple.com/search?media=music&entity=song&limit=6' +
            '&country=' + encodeURIComponent(ITUNES_PAIS) +
            '&term=' + encodeURIComponent(texto);

  jsonp(url, function (d) {
    if (mia !== buscadaN) return;               // llegó tarde: ya hay otra búsqueda
    var caja = document.getElementById('resultados');
    if (!caja) return;

    if (!d) {
      hallazgos = [];
      caja.innerHTML = '';
      estadoMusica('No hemos podido buscar. Prueba otra vez en un momento.', true);
      return;
    }

    var lista = d.results || [];
    if (!lista.length) {
      // No está en iTunes (o se escribe de otra manera): que la mande a mano.
      hallazgos = [];
      caja.innerHTML = '<p class="vacio">No encontramos nada con eso. ' +
        '<button type="button" class="anadir" data-manual="1">Añadirla tal cual</button></p>';
      return;
    }

    pintarHallazgos(lista);
  });
}

/* iTunes corta sobre las 20 búsquedas por minuto y por IP, así que se espera a
   que el invitado deje de teclear. */
function programarBusqueda(texto) {
  if (buscador) { clearTimeout(buscador); buscador = null; }
  var limpio = texto.replace(/^\s+|\s+$/g, '');

  if (limpio.length < 2) { limpiarHallazgos(); return; }
  buscador = setTimeout(function () { buscarEnItunes(limpio); }, 400);
}

function buscarYa() {
  if (buscador) { clearTimeout(buscador); buscador = null; }
  var texto = document.getElementById('buscar').value.replace(/^\s+|\s+$/g, '');
  if (texto.length >= 2) { buscarEnItunes(texto); }
}

/* El backend devuelve siempre la lista entera ya resuelta, así que aquí no hay
   que saber nada de límites ni de sustituciones: se repinta lo que llega. */
function anadirCancion(c) {
  estadoMusica('Guardando…');

  pedir('POST', API, JSON.stringify({
    token: token,
    accion: 'cancion',
    cancion: c.cancion,
    artista: c.artista,
    album: c.album,
    itunes_id: c.itunes_id,
    enlace: c.enlace
  }), function (d) {
    if (!d || !d.ok) {
      estadoMusica('No se ha podido guardar. Inténtalo otra vez.', true);
      return;
    }
    canciones = d.canciones || [];
    pintarMisCanciones();

    if (d.repetida) {
      // No se ha apuntado nada: le dejamos los resultados por si quiere otra.
      estadoMusica('Esa ya la tenías apuntada.');
      return;
    }

    limpiarBusqueda();
    estadoMusica(d.quitada
      ? 'Apuntada. Hemos quitado «' + d.quitada.cancion + '» para hacerle sitio.'
      : 'Apuntada.');
  });
}

function quitarCancion(id) {
  estadoMusica('Quitando…');

  pedir('POST', API, JSON.stringify({
    token: token, accion: 'quitar_cancion', id: id
  }), function (d) {
    if (!d || !d.ok) {
      estadoMusica('No se ha podido quitar. Inténtalo otra vez.', true);
      return;
    }
    canciones = d.canciones || [];
    pintarMisCanciones();
    estadoMusica('Quitada.');
  });
}

