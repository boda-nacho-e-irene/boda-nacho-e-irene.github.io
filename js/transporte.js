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
             escapar(salidas.length === 1 ? t('transporte_salida') : t('transporte_salidas')) +
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

/* Van con los recorridos, en *Transporte*, y llevan su propio botón: la
   elección se guarda sola, sin pasar por la confirmación. */
function camposVuelta() {
  var horas = salidasElegibles();
  if (!horas.length) return '';

  var botones = '';
  for (var i = 0; i < horas.length; i++) {
    botones += '<button type="button" class="chip" data-v="' + escapar(horas[i]) + '" aria-pressed="false">'
             + escapar(horas[i]) + '</button>';
  }
  botones += '<button type="button" class="chip" data-v="' + SIN_VUELTA + '" aria-pressed="false">'
           + escapar(t('transporte_sin_vuelta')) + '</button>';

  return '<fieldset class="campos-vuelta">' +
           '<legend>' + escapar(t('transporte_vuelta')) + '</legend>' +
           '<p class="ayuda">' + escapar(t('transporte_vuelta_ayuda')) + '</p>' +
           '<div class="chips" id="vuelta">' + botones + '</div>' +
         '</fieldset>' +
         '<button type="button" class="enviar" id="enviar-transporte" disabled>' +
           escapar(t('transporte_guardar')) + '</button>';
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
  document.getElementById('enviar-transporte').disabled = false;
}

function seccionTransporte() {
  var trayectos = TRANSPORTE.trayectos;
  if (!trayectos || !trayectos.length) return '';

  var html = '';
  for (var i = 0; i < trayectos.length; i++) {
    var tr = trayectos[i];
    html += '<div class="trayecto" id="' + escapar(tr.id) + '">' +
              '<h3 class="sub-titulo">' + escapar(tr.titulo) + '</h3>' +
              horasSalida(tr.salidas) +
              ruta(tr.paradas) +
            '</div>';
  }

  var nota = t('transporte_nota');
  return '<section class="seccion" id="transporte">' +
           titulo('transporte', t('titulo_transporte')) +
           bloque('transporte',
             '<div class="trayectos">' + html + '</div>' +
             (nota
               ? '<p class="promesa" style="margin-top:2rem">' + escapar(nota) + '</p>'
               : '') +
             camposVuelta()
           ) +
         '</section>';
}
