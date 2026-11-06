/* --- transporte --- */

/* Lo que se guarda cuando el invitado no coge ese autobús: así la celda de la
   hoja distingue «no lo coge» de «todavía no ha contestado». */
var SIN_TRAMO = 'No';

/* Las horas de salida del recorrido, cada una como botón, y al final la X para
   no coger ese autobús. Los botones de la tabla son la elección: no hay
   formulario aparte ni botón de enviar. */
function horasSalida(salidas, tramo) {
  var html = '';
  for (var i = 0; i < salidas.length; i++) {
    html += '<button type="button" class="hora" data-tramo="' + tramo + '" data-v="' + escapar(salidas[i]) + '" aria-pressed="false">' +
            escapar(salidas[i]) + '</button>';
  }
  html += '<button type="button" class="hora no" data-tramo="' + tramo + '" data-v="' + SIN_TRAMO + '" aria-pressed="false"' +
          ' aria-label="' + escapar(t('transporte_no_viaje')) + '" title="' + escapar(t('transporte_no_viaje')) + '">×</button>';

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

/* Marca la elección de un tramo en la tabla. No envía nada: lo usa también al
   volver a entrar, con lo que ya está guardado. */
function marcarTramo(tramo, valor) {
  var caja = document.getElementById('transporte');
  if (!caja) return;
  var b = caja.getElementsByTagName('button');
  for (var i = 0; i < b.length; i++) {
    if (b[i].getAttribute('data-tramo') === tramo) {
      b[i].setAttribute('aria-pressed', b[i].getAttribute('data-v') === valor ? 'true' : 'false');
    }
  }
  if (tramo === 'ida') { ida = valor; } else { vuelta = valor; }
}

/* Un clic en una hora (o en la X) es la elección de ese tramo: se marca y se
   guarda en el momento, sin pasar por ningún botón de enviar. */
function elegirTramo(tramo, valor) {
  marcarTramo(tramo, valor);

  var cuerpo = { token: token };
  cuerpo[tramo] = valor;
  estadoBloque('transporte', t('guardando'));

  pedir('POST', API, JSON.stringify(cuerpo), function (d) {
    if (!d || !d.ok || !campoEscrito(d, tramo)) {
      estadoBloque('transporte', t('error_guardar'), true);
      return;
    }
    guardado[tramo] = true;
    estadoBloque('transporte', t('transporte_guardado'));
    montarIndice();
  });
}

function seccionTransporte() {
  var trayectos = TRANSPORTE.trayectos;
  if (!trayectos || !trayectos.length) return '';

  var html = '';
  for (var i = 0; i < trayectos.length; i++) {
    var tr = trayectos[i];
    var tramo = tr.id.replace(/^transporte-/, '');
    html += '<div class="trayecto" id="' + escapar(tr.id) + '">' +
              '<h3 class="sub-titulo">' + escapar(tr.titulo) + '</h3>' +
              horasSalida(tr.salidas, tramo) +
              ruta(tr.paradas) +
            '</div>';
  }

  var nota = t('transporte_nota');
  return '<div class="tras" id="transporte">' +
           subtituloConIcono(t('titulo_transporte'), '<rect x="5" y="3" width="14" height="14" rx="2"/><path d="M5 11h14M9 17l-2 4M15 17l2 4"/><circle cx="9" cy="13.5" r=".6"/><circle cx="15" cy="13.5" r=".6"/>') +
           bloque('transporte',
             '<div class="trayectos">' + html + '</div>' +
             (nota
               ? '<p class="promesa" style="margin-top:2rem">' + escapar(nota) + '</p>'
               : '')
           ) +
         '</div>';
}
