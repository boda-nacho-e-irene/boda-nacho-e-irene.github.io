/* --- el álbum de detrás del sobre --- */

/* Mientras el invitado tiene el sobre delante y la invitación se pide al
   servidor, detrás se mueven unas tiras de fotos de alturas distintas, cada
   una a su paso y en su sentido. Es decoración: va bajo un velo de papel,
   no lo lee el lector de pantalla y, si algo falla, no se pinta y punto.

   Hecho para que no pese:
   - fotos pequeñas (GALERIA_FOTOS en js/datos.js), pedidas con prioridad
     baja para que el sobre y la invitación bajen antes;
   - en el móvil, tres tiras en vez de cinco;
   - solo se mueve `transform` (css/galeria.css), que lo hace la tarjeta
     gráfica sin volver a pintar;
   - con «ahorro de datos» no se pinta nada;
   - al quitarse el sobre se vacía entera y deja de existir (galeriaFuera,
     que llama quitarCapa() en js/sobre.js).

   Cada tira lleva la misma tanda dos veces y avanza media pista, igual que
   el carrusel del lugar (js/util.js): así el bucle cierra sin saltos. La
   tanda tiene que ser más ancha que la pantalla o se vería el corte, así
   que en las tiras bajas las fotos se repiten las vueltas que hagan falta. */

/* Un poco más que la pantalla, para que al girar el móvil o estirar la
   ventana no asome el final de la tanda. */
var GALERIA_HOLGURA = 1.3;

function galeriaFondo() {
  var caja = document.getElementById('galeria-fondo');
  if (!caja || !GALERIA_FOTOS || !GALERIA_FOTOS.length) return;

  var red = navigator.connection;
  if (red && red.saveData) return;

  var ancha = !!(window.matchMedia && window.matchMedia('(min-width: 34rem)').matches);
  var filas = GALERIA_FILAS.slice(0, ancha ? GALERIA_FILAS.length : 3);
  var n = GALERIA_FOTOS.length;
  var pesoTotal = 0;
  var proporcion = 0;   // lo que mide de ancho una vuelta de fotos por cada píxel de alto
  var i, j, k;

  for (i = 0; i < filas.length; i++) { pesoTotal += filas[i].peso; }
  for (i = 0; i < n; i++) { proporcion += GALERIA_FOTOS[i].ancho / GALERIA_FOTOS[i].alto; }

  var altoPantalla = window.innerHeight || 800;
  var anchoPantalla = (window.innerWidth || 400) * GALERIA_HOLGURA;
  var html = '';

  for (k = 0; k < filas.length; k++) {
    var fila = filas[k];
    var altoFila = altoPantalla * fila.peso / pesoTotal;
    var vuelta = Math.max(1, proporcion * altoFila);
    var vueltas = Math.max(1, Math.ceil(anchoPantalla / vuelta));
    var tanda = '';

    for (i = 0; i < vueltas; i++) {
      for (j = 0; j < n; j++) {
        /* Cada tira empieza por una foto distinta, para que la misma no
           quede apilada en columna. */
        var f = GALERIA_FOTOS[(j + k * 2) % n];
        tanda += '<img src="' + escapar(f.src) + '" width="' + escapar(f.ancho) +
                 '" height="' + escapar(f.alto) + '" alt="" decoding="async" fetchpriority="low">';
      }
    }

    /* La duración sale del ancho de la tanda y de la velocidad, así que dos
       tiras con la misma `vel` van al mismo paso aunque midan distinto. El
       retraso negativo las arranca a medio camino, cada una en otro punto. */
    var dura = Math.round(vuelta * vueltas / fila.vel);
    html += '<div class="galeria-fila' + (fila.dir < 0 ? ' a-derecha' : '') + '"' +
              ' style="--peso:' + fila.peso + ';--dura:' + dura + 's;--desfase:-' + Math.round(dura * k / filas.length) + 's">' +
              '<div class="galeria-pista">' +
                '<div class="galeria-tanda">' + tanda + '</div>' +
                '<div class="galeria-tanda">' + tanda + '</div>' +
              '</div>' +
            '</div>';
  }

  /* Cada foto aparece sola en cuanto llega, en vez de a trozos mientras
     baja. `load` no sube por el árbol, pero se le puede escuchar bajando. */
  caja.addEventListener('load', function (ev) {
    if (ev.target && ev.target.tagName === 'IMG') { ev.target.className = 'lista'; }
  }, true);
  caja.innerHTML = html;
}

/* El sobre se ha ido: fuera el álbum, sus imágenes y sus animaciones. */
function galeriaFuera() {
  var caja = document.getElementById('galeria-fondo');
  if (caja) { caja.innerHTML = ''; }
}

galeriaFondo();
