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

var objetivoMs = momento(BODA.iso);

/* Final del día de la boda, en la zona de la boda: hasta ahí decimos "hoy". */
var finBodaMs = objetivoMs === null
  ? null
  : momento(BODA.iso.slice(0, 10) + 'T00:00:00' + BODA.iso.slice(19)) + 86400000;

var reloj = null;

function dos(n) { return (n < 10 ? '0' : '') + n; }

function celda(valor, rotulo) {
  return '<div><span class="valor">' + valor + '</span>' +
         '<span class="rotulo">' + rotulo + '</span></div>';
}

/* Pasado el día de la boda no hay nada que contar. Como la sección entonces no
   se pinta, el índice lateral descarta su entrada él solo. */
function hayCuenta() {
  return objetivoMs !== null && Date.now() < finBodaMs;
}

function seccionCuenta() {
  if (!hayCuenta()) return '';
  return '<section class="seccion" id="cuenta-atras">' +
           titulo('cuenta-atras', 'Cuenta atrás') +
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
    caja.innerHTML = '<p class="hoy">Hoy nos casamos</p>';
    return;
  }

  var seg   = Math.floor(restante / 1000);
  var dias  = Math.floor(seg / 86400);
  var horas = Math.floor((seg % 86400) / 3600);
  var mins  = Math.floor((seg % 3600) / 60);
  var segs  = seg % 60;

  caja.innerHTML =
    '<div class="digitos" aria-hidden="true">' +
      celda(dias,       dias  === 1 ? 'día'  : 'días') +
      celda(dos(horas), horas === 1 ? 'hora' : 'horas') +
      celda(dos(mins),  'min') +
      celda(dos(segs),  'seg') +
    '</div>' +
    /* Las cifras van ocultas al lector de pantalla: cambian cada segundo y no
       aportarían nada leídas. Esta frase, que solo cambia de día en día, sí. */
    '<p class="solo-voz">' + (dias === 0
      ? 'Falta menos de un día para la boda.'
      : 'Faltan ' + dias + (dias === 1 ? ' día' : ' días') + ' para la boda.') + '</p>';
}

function arrancarCuenta() {
  pararCuenta();
  if (!document.getElementById('cuenta')) return;
  pintarCuenta();
  if (Date.now() < objetivoMs) { reloj = setInterval(pintarCuenta, 1000); }
}

