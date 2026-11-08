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
   - las tiras no entran hasta tener las fotos descodificadas, para que no
     den tirones a medio vuelo (galeriaDescodificar);
   - al abrir el sobre se funde, y al quitarse se vacía entera y deja de
     existir (galeriaFuera, que llama quitarCapa() en js/sobre.js).

   Este archivo va detrás de js/sobre.js en el <head>: avisa a la entrada
   de la página (introGaleriaLista) cuando el álbum está listo.

   Las fotos se barajan en cada visita (galeriaBarajar) y se reparten
   entre las tiras (galeriaDeLaFila): cada una sale en una sola, así hay muchas fotos distintas a la vista y pocas <img>.
   Cada tira lleva su tanda dos veces y avanza media pista, igual que el
   carrusel del lugar (js/util.js): así el bucle cierra sin saltos. La tanda
   tiene que ser más ancha que la pantalla o se vería el corte, así que si
   a una tira le tocan pocas fotos, se repiten las vueltas que hagan falta. */

/* Un poco más que la pantalla, para que al girar el móvil o estirar la
   ventana no asome el final de la tanda. */
var GALERIA_HOLGURA = 1.3;

/* La entrada de la página (js/sobre.js) espera a que el álbum esté listo
   para hacerlo entrar; si no va a haber álbum, se le dice ya. */
function galeriaAvisar() {
  if (typeof introGaleriaLista === 'function') { introGaleriaLista(); }
}

function galeriaFondo() {
  var caja = document.getElementById('galeria-fondo');
  if (!caja || !GALERIA_FOTOS || !GALERIA_FOTOS.length) { galeriaAvisar(); return; }

  var red = navigator.connection;
  if (red && red.saveData) { galeriaAvisar(); return; }

  var ancha = !!(window.matchMedia && window.matchMedia('(min-width: 34rem)').matches);
  var filas = GALERIA_FILAS.slice(0, ancha ? GALERIA_FILAS.length : 3);
  var fotos = galeriaBarajar(GALERIA_FOTOS);
  var pesoTotal = 0;
  var i, j, k;

  for (i = 0; i < filas.length; i++) { pesoTotal += filas[i].peso; }

  var altoPantalla = window.innerHeight || 800;
  var anchoPantalla = (window.innerWidth || 400) * GALERIA_HOLGURA;
  var html = '';

  for (k = 0; k < filas.length; k++) {
    var fila = filas[k];
    var suyas = galeriaDeLaFila(fotos, k, filas.length);
    var proporcion = 0;   // lo que mide de ancho una vuelta de fotos por cada píxel de alto
    for (j = 0; j < suyas.length; j++) { proporcion += suyas[j].ancho / suyas[j].alto; }

    var altoFila = altoPantalla * fila.peso / pesoTotal;
    var vuelta = Math.max(1, proporcion * altoFila);
    var vueltas = Math.max(1, Math.ceil(anchoPantalla / vuelta));
    var tanda = '';

    for (i = 0; i < vueltas; i++) {
      for (j = 0; j < suyas.length; j++) {
        var f = suyas[j];
        tanda += '<img src="' + escapar(f.src) + '" width="' + escapar(f.ancho) +
                 '" height="' + escapar(f.alto) + '" alt="" decoding="async" fetchpriority="low">';
      }
    }

    /* La duración sale del ancho de la tanda y de la velocidad, así que dos
       tiras con la misma `vel` van al mismo paso aunque midan distinto. El
       retraso negativo las arranca a medio camino, cada una en otro punto. */
    var dura = Math.round(vuelta * vueltas / fila.vel);
    /* `--orden` escalona la entrada: cada tira llega un poco después que la
       de encima (css/galeria.css). */
    html += '<div class="galeria-fila' + (fila.dir < 0 ? ' a-derecha' : '') + '"' +
              ' style="--peso:' + fila.peso + ';--dura:' + dura + 's;--desfase:-' + Math.round(dura * k / filas.length) + 's;--orden:' + k + '">' +
              '<div class="galeria-pista">' +
                '<div class="galeria-tanda">' + tanda + '</div>' +
                '<div class="galeria-tanda">' + tanda + '</div>' +
              '</div>' +
            '</div>';
  }

  caja.innerHTML = html;
  galeriaDescodificar(caja);
}

/* Una copia de la lista en orden al azar (Fisher-Yates), distinta en cada
   visita. Las formas no estorban: cada foto lleva su ancho y su alto, el
   alto lo pone la tira y el ancho sale solo, y lo que mide cada tira se
   cuenta después de repartir. */
function galeriaBarajar(lista) {
  var copia = lista.slice();
  for (var i = copia.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = copia[i]; copia[i] = copia[j]; copia[j] = t;
  }
  return copia;
}

/* Las fotos de una tira: una de cada tantas como tiras haya, así cada foto
   sale en una sola tira y todas salen, también en el móvil con menos tiras.
   Con menos fotos que tiras no da para repartir: entonces van todas en
   todas, cada tira empezando por una distinta para que la misma no quede
   apilada en columna. */
function galeriaDeLaFila(fotos, k, cuantas) {
  var n = fotos.length;
  var suyas = [];
  var j;
  if (n >= cuantas) {
    for (j = k; j < n; j += cuantas) { suyas.push(fotos[j]); }
  } else {
    for (j = 0; j < n; j++) { suyas.push(fotos[(j + k * 2) % n]); }
  }
  return suyas;
}

/* Las tiras entran de golpe y deslizándose: si una foto se descodificase a
   medio vuelo, ese fotograma daría un tirón. Así que se espera a tener
   descodificadas las fotos distintas (la primera <img> de cada una; las
   repetidas comparten la descodificación) y entonces se avisa. Si tardan,
   js/sobre.js no espera más de INTRO_GALERIA_MAX y las que falten aparecen
   al llegar. */
function galeriaDescodificar(caja) {
  var todas = caja.getElementsByTagName('img');
  var vistas = {};
  var fotos = [];
  var i;
  for (i = 0; i < todas.length; i++) {
    var src = todas[i].getAttribute('src');
    if (vistas[src]) continue;
    vistas[src] = true;
    fotos.push(todas[i]);
  }
  var faltan = fotos.length;
  if (!faltan) { galeriaAvisar(); return; }

  function una() {
    faltan--;
    if (faltan === 0) { galeriaAvisar(); }
  }
  for (i = 0; i < fotos.length; i++) {
    var f = fotos[i];
    if (f.decode) {
      f.decode().then(una, una);
    } else if (f.complete) {
      una();
    } else {
      f.onload = f.onerror = una;
    }
  }
}

/* El sobre se ha ido: fuera el álbum, sus imágenes y sus animaciones. */
function galeriaFuera() {
  var caja = document.getElementById('galeria-fondo');
  if (caja) { caja.innerHTML = ''; }
}

galeriaFondo();
