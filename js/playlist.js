/* --- sugerencias de música --- */

/* Va detrás de «Confirmar», así que `ajustarAlcance()` se la lleva por delante
   en cuanto alguien dice que no puede venir, como al resto de las de después.
   Las canciones que hubiese mandado antes siguen en la hoja: solo desaparece
   la sección. */
/* El único formulario sin botón de enviar: cada canción se guarda al añadirla,
   así que no hay nada que reenviar. Se pliega igual al volver a entrar, y su
   botón de resumen solo abre y cierra. */
function seccionPlaylist() {
  return '<div class="tras" id="playlist">' +
           subtituloConIcono(t('titulo_playlist'), '<circle cx="7" cy="17" r="3"/><circle cx="17" cy="15" r="3"/><path d="M10 17V5l10-2v12"/>') +
           bloque('playlist',
             '<p class="ayuda">' + escapar(t('playlist_ayuda', { max: MAX_CANCIONES })) + '</p>' +
             '<h3 class="subtitulo">' + escapar(t('playlist_tus_canciones')) + '</h3>' +
             '<ul class="mis-canciones" id="mis-canciones"></ul>' +
             '<fieldset>' +
               '<label class="campo" for="buscar">' + escapar(t('playlist_buscar')) + '</label>' +
               '<input type="search" id="buscar" placeholder="' + escapar(t('playlist_buscar_pista')) + '" autocomplete="off">' +
             '</fieldset>' +
             '<div class="resultados" id="resultados" aria-live="polite"></div>'
           ) +
         '</div>';
}

/* Escribe en el `.estado` del bloque, que está fuera del pliegue: lo que se
   cuenta de una canción se sigue leyendo aunque la sección se plegase. */
function estadoMusica(texto, mal) {
  estadoBloque('playlist', texto, mal);
}

/* La lista ha cambiado: repintarla, poner al día el resumen de la sección —sin
   plegarla, que el invitado está en ello— y el índice, que lleva la cuenta. */
function repasarCanciones() {
  pintarMisCanciones();
  repasarBloques('playlist');
  montarIndice();
}

/* Las que ya ha mandado, cada una con su botón de quitar. */
function pintarMisCanciones() {
  var caja = document.getElementById('mis-canciones');
  if (!caja) return;

  if (!canciones.length) {
    caja.innerHTML = '<li class="vacio">' + escapar(t('playlist_vacia')) + '</li>';
    return;
  }

  var html = '';
  for (var i = 0; i < canciones.length; i++) {
    var c = canciones[i];
    html += '<li>' +
              '<span class="pista"><b>' + escapar(c.cancion) + '</b>' +
                '<span>' + escapar(c.artista || t('playlist_sin_artista')) + '</span></span>' +
              '<button type="button" class="quitar" data-id="' + escapar(c.id) + '">' +
                escapar(t('playlist_quitar')) + '</button>' +
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
              '<button type="button" class="anadir" data-i="' + i + '">' +
                escapar(t('playlist_anadir')) + '</button>' +
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
      estadoMusica(t('playlist_error_buscar'), true);
      return;
    }

    var lista = d.results || [];
    if (!lista.length) {
      // No está en iTunes (o se escribe de otra manera): que la mande a mano.
      hallazgos = [];
      caja.innerHTML = '<p class="vacio">' + escapar(t('playlist_sin_resultados')) + ' ' +
        '<button type="button" class="anadir" data-manual="1">' +
          escapar(t('playlist_manual')) + '</button></p>';
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
  estadoMusica(t('guardando'));

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
      estadoMusica(t('error_guardar'), true);
      return;
    }
    canciones = d.canciones || [];
    repasarCanciones();

    if (d.repetida) {
      // No se ha apuntado nada: le dejamos los resultados por si quiere otra.
      estadoMusica(t('playlist_repetida'));
      return;
    }

    limpiarBusqueda();
    estadoMusica(d.quitada
      ? t('playlist_apuntada_quitada', { cancion: d.quitada.cancion })
      : t('playlist_apuntada'));
  });
}

function quitarCancion(id) {
  estadoMusica(t('playlist_quitando'));

  pedir('POST', API, JSON.stringify({
    token: token, accion: 'quitar_cancion', id: id
  }), function (d) {
    if (!d || !d.ok) {
      estadoMusica(t('playlist_error_quitar'), true);
      return;
    }
    canciones = d.canciones || [];
    repasarCanciones();
    estadoMusica(t('playlist_quitada'));
  });
}
