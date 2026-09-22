/* --- transporte --- */

/* La hora, o las horas, a las que sale ese autobús. */
function horasSalida(salidas) {
  if (!salidas || !salidas.length) return '';
  var html = '';
  for (var i = 0; i < salidas.length; i++) {
    html += '<span class="hora">' + escapar(salidas[i]) + '</span>';
  }
  return '<p class="salidas">' +
           '<span class="salidas-rotulo">' +
             (salidas.length === 1 ? 'Salida' : 'Salidas') +
           '</span>' +
           '<span class="horas">' + html + '</span>' +
         '</p>';
}

/* Las paradas van en una lista ordenada: el orden es el del recorrido, y así
   también se lee en voz alta como «uno de tres». */
function ruta(paradas) {
  var html = '';
  for (var i = 0; i < paradas.length; i++) {
    html += '<li><span class="ruta-lugar">' + escapar(paradas[i].lugar) + '</span>' +
            (paradas[i].detalle
              ? '<span class="ruta-detalle">' + escapar(paradas[i].detalle) + '</span>'
              : '') +
            '</li>';
  }
  return '<ol class="ruta">' + html + '</ol>';
}

/* Lo que se guarda cuando el invitado no coge el autobús de vuelta: así la
   celda de la hoja distingue «no lo necesita» de «todavía no ha contestado». */
var SIN_VUELTA = 'No';

/* Las horas entre las que elige el invitado: las del trayecto marcado como
   `elegible`. Vacío si no hay ninguno, o si solo tiene una hora (entonces no
   hay nada que elegir y no pintamos los botones). */
function salidasElegibles() {
  var ts = TRANSPORTE.trayectos || [];
  for (var i = 0; i < ts.length; i++) {
    if (ts[i].elegible && ts[i].salidas && ts[i].salidas.length > 1) return ts[i].salidas;
  }
  return [];
}

/* Van dentro de *Confirmar*, no en *Transporte*: la sección de transporte
   queda por debajo del botón de enviar, y de allí no se envía nada. */
function camposVuelta() {
  var horas = salidasElegibles();
  if (!horas.length) return '';

  var botones = '';
  for (var i = 0; i < horas.length; i++) {
    botones += '<button type="button" class="chip" data-v="' + escapar(horas[i]) + '" aria-pressed="false">'
             + escapar(horas[i]) + '</button>';
  }
  botones += '<button type="button" class="chip" data-v="' + SIN_VUELTA + '" aria-pressed="false">'
           + 'No lo necesito</button>';

  return '<fieldset>' +
           '<legend>Autobús de vuelta</legend>' +
           '<p class="ayuda">Sale del convento hacia Palencia y Venta de Baños. Dinos con cuál contamos.</p>' +
           '<div class="chips" id="vuelta">' + botones + '</div>' +
         '</fieldset>';
}

/* Exclusiva: solo se vuelve en un autobús. */
function elegirVuelta(hora) {
  var caja = document.getElementById('vuelta');
  if (!caja) return;
  vuelta = hora;
  var b = caja.getElementsByTagName('button');
  for (var i = 0; i < b.length; i++) {
    b[i].setAttribute('aria-pressed', b[i].getAttribute('data-v') === hora ? 'true' : 'false');
  }
}

function seccionTransporte() {
  var trayectos = TRANSPORTE.trayectos;
  if (!trayectos || !trayectos.length) return '';

  var html = '';
  for (var i = 0; i < trayectos.length; i++) {
    var t = trayectos[i];
    html += '<div class="trayecto" id="' + escapar(t.id) + '">' +
              '<h3 class="sub-titulo">' + escapar(t.titulo) + '</h3>' +
              horasSalida(t.salidas) +
              ruta(t.paradas) +
            '</div>';
  }

  return '<section class="seccion" id="transporte">' +
           titulo('transporte', 'Transporte') +
           '<div class="trayectos">' + html + '</div>' +
           (TRANSPORTE.nota
             ? '<p class="promesa" style="margin-top:2rem">' + escapar(TRANSPORTE.nota) + '</p>'
             : '') +
         '</section>';
}

