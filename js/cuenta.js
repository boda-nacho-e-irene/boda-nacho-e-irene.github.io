/* ---------- cuenta atrás ---------- */

/* Pasamos la fecha a milisegundos a mano, con su desfase, en vez de fiarnos de
   cómo interpreta cada navegador una cadena de fecha. null si no encaja. */
function momento(iso) {
  var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-])(\d{2}):(\d{2})$/);
  if (!m) return null;
  var utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  var desfase = (+m[8] * 60 + +m[9]) * 60000 * (m[7] === '-' ? -1 : 1);
  return utc - desfase;
}

/* Las tres las fija recalcularFechas() (js/configuracion.js), al pintar: así la
   hoja puede cambiar la fecha y la cuenta la sigue. */
var objetivoMs = null;
var finBodaMs = null;        // final del día de la boda, en la zona de la boda

var reloj = null;

function dos(n) { return (n < 10 ? '0' : '') + n; }

function celda(valor, rotulo) {
  return '<div><span class="valor">' + valor + '</span>' +
         '<span class="rotulo">' + escapar(rotulo) + '</span></div>';
}

/* Pasado el día de la boda no hay nada que contar. Como la sección entonces no
   se pinta, el índice lateral descarta su entrada él solo. */
function hayCuenta() {
  return objetivoMs !== null && Date.now() < finBodaMs;
}

function seccionCuenta() {
  if (!hayCuenta()) return '';
  return '<section class="seccion" id="cuenta-atras">' +
           tituloSinIcono(t('titulo_cuenta')) +
           '<div class="cuenta-intro-fila">' +
             marcadorImagen('img/dibujos/calendario.png') +
             '<div class="cuenta-intro-texto">' +
               '<p class="cuenta-intro">' + escapar(t('cuenta_intro_1')) + '</p>' +
               '<p class="cuenta-intro cuenta-fecha"><strong>' + escapar(BODA.fecha) + '</strong></p>' +
               '<p class="cuenta-intro">' + escapar(t('cuenta_intro_2')) + '</p>' +
             '</div>' +
           '</div>' +
           /* Primero las cifras y debajo los botones de guardar la fecha. */
           '<div id="cuenta"></div>' +
           bloqueCalendario() +
         '</section>';
}

function pararCuenta() {
  if (reloj) { clearInterval(reloj); reloj = null; }
}

function pintarCuenta() {
  var caja = document.getElementById('cuenta');
  if (!caja) { pararCuenta(); return; }          // la pantalla ya no es esta

  /* Se recalcula contra el reloj real en cada tic: si el navegador frena el
     intervalo en una pestaña de fondo, no acumulamos retraso. */
  var restante = objetivoMs - Date.now();

  if (restante <= 0) {
    pararCuenta();
    caja.innerHTML = '<p class="hoy">' + escapar(t('cuenta_hoy')) + '</p>';
    return;
  }

  var seg   = Math.floor(restante / 1000);
  var dias  = Math.floor(seg / 86400);
  var horas = Math.floor((seg % 86400) / 3600);
  var mins  = Math.floor((seg % 3600) / 60);
  var segs  = seg % 60;

  caja.innerHTML =
    '<div class="digitos" aria-hidden="true">' +
      celda(dias,       dias  === 1 ? t('cuenta_dia')  : t('cuenta_dias')) +
      celda(dos(horas), horas === 1 ? t('cuenta_hora') : t('cuenta_horas')) +
      celda(dos(mins),  t('cuenta_min')) +
      celda(dos(segs),  t('cuenta_seg')) +
    '</div>' +
    /* Las cifras van ocultas al lector de pantalla: cambian cada segundo y no
       aportarían nada leídas. Esta frase, que solo cambia de día en día, sí. */
    '<p class="solo-voz">' + escapar(dias === 0
      ? t('cuenta_menos_de_un_dia')
      : t('cuenta_faltan', { n: dias, dias: dias === 1 ? t('cuenta_dia') : t('cuenta_dias') })) +
    '</p>';
}

function arrancarCuenta() {
  pararCuenta();
  if (!document.getElementById('cuenta')) return;
  pintarCuenta();
  if (Date.now() < objetivoMs) { reloj = setInterval(pintarCuenta, 1000); }
}
