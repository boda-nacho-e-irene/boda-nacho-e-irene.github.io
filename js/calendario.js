/* ---------- guardar la fecha ---------- */

/* El «save the date» vive dentro de la sección de la cuenta atrás: las dos
   hablan del mismo día y por separado no daban para una sección cada una. Así
   el invitado ve lo que falta y guarda la fecha en el mismo sitio. */

/* Hasta cuándo llega el evento en el calendario: desde la hora de la ceremonia,
   las horas de BODA.duracion. Nadie sabe cuándo acaba una boda, pero el
   calendario pide un final. */
var finEventoMs = objetivoMs === null
  ? null
  : objetivoMs + Math.max(1, +BODA.duracion || 1) * 3600000;

/* 20270717T103000Z: el sello de tiempo en UTC que piden por igual el .ics y
   Google Calendar. En UTC no hay que arrastrar la zona de la boda a ninguno de
   los dos. */
function selloUtc(ms) {
  var d = new Date(ms);
  return String(d.getUTCFullYear()) + dos(d.getUTCMonth() + 1) + dos(d.getUTCDate()) +
         'T' + dos(d.getUTCHours()) + dos(d.getUTCMinutes()) + dos(d.getUTCSeconds()) + 'Z';
}

/* Lo que el invitado leerá en el evento. Sin el enlace de la invitación a
   propósito: lleva su token, y los eventos se comparten y se sincronizan con
   más servicios de los que uno cree. */
function descripcionEvento() {
  return 'Nos casamos en ' + BODA.lugar + '. La ceremonia es a las ' + BODA.hora + '.';
}

/* Los valores de texto del .ics escapan la barra, la coma y el punto y coma, y
   los saltos de línea viajan como \n literal. */
function textoIcs(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/([,;])/g, '\\$1')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/* Cuántos octetos ocupa este carácter en UTF-8: el formato cuenta bytes, no
   letras, y «Méndez» pesa más de lo que mide. */
function octetos(caracter) {
  var n = caracter.charCodeAt(0);
  if (n < 0x80) return 1;
  if (n < 0x800) return 2;
  if (n >= 0xD800 && n < 0xDC00) return 4;   // par subrogado: cuenta por los dos
  return 3;
}

/* Ninguna línea del .ics pasa de 75 octetos: lo que sobra sigue en la
   siguiente, empezando por un espacio. Sin esto, un nombre o un lugar largos
   rompen el archivo en algunos calendarios. */
function plegar(linea) {
  var partes = [];
  var trozo = '';
  var bytes = 0;
  for (var i = 0; i < linea.length; i++) {
    var caracter = linea.charAt(i);
    var codigo = linea.charCodeAt(i);
    if (codigo >= 0xD800 && codigo < 0xDC00 && i + 1 < linea.length) {
      caracter += linea.charAt(++i);         // los dos medios del par van juntos
    }
    var peso = octetos(caracter);
    if (bytes + peso > 75) {
      partes.push(trozo);
      trozo = '';
      bytes = 1;                             // el espacio de la continuación cuenta
    }
    trozo += caracter;
    bytes += peso;
  }
  partes.push(trozo);
  return partes.join('\r\n ');
}

/* El archivo del evento, entero, hecho aquí mismo sin pedirle nada al servidor.
   Las líneas van separadas por CRLF porque es lo que pide el formato. */
function contenidoIcs() {
  var lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//boda//invitacion//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    /* Siempre el mismo: si el invitado lo añade dos veces, el calendario
       reconoce el evento y lo actualiza en vez de duplicarlo. */
    'UID:boda-' + selloUtc(objetivoMs) + '@invitacion',
    'DTSTAMP:' + selloUtc(Date.now()),
    'DTSTART:' + selloUtc(objetivoMs),
    'DTEND:' + selloUtc(finEventoMs),
    'SUMMARY:' + textoIcs(BODA.evento),
    'LOCATION:' + textoIcs(BODA.direccion || BODA.lugar),
    'DESCRIPTION:' + textoIcs(descripcionEvento()),
    /* Un aviso el día antes: es lo que el invitado viene a buscar aquí. */
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-P1D',
    'DESCRIPTION:' + textoIcs(BODA.evento),
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  for (var i = 0; i < lineas.length; i++) { lineas[i] = plegar(lineas[i]); }
  return lineas.join('\r\n') + '\r\n';
}

/* Para quien vive en Google Calendar: el mismo evento, pero abierto ya en su
   pantalla de guardar. Ahí no hace falta descargar nada. */
function enlaceGoogle() {
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
         '&text='     + encodeURIComponent(BODA.evento) +
         '&dates='    + selloUtc(objetivoMs) + '/' + selloUtc(finEventoMs) +
         '&location=' + encodeURIComponent(BODA.direccion || BODA.lugar) +
         '&details='  + encodeURIComponent(descripcionEvento());
}

/* El .ics se le pasa al calendario que tenga el invitado —Calendario en el
   iPhone, Outlook en el trabajo— y el evento entra con su aviso puesto. Si el
   navegador no sabe fabricar el archivo, le queda el enlace de Google. */
function guardarEnCalendario() {
  var aviso = document.getElementById('calendario-aviso');
  var url;

  try {
    url = URL.createObjectURL(new Blob([contenidoIcs()], { type: 'text/calendar;charset=utf-8' }));
  } catch (e) {
    if (aviso) {
      aviso.className = 'estado mal';
      aviso.textContent = 'Este navegador no nos deja preparar el archivo. Abre el enlace de Google Calendar.';
    }
    return;
  }

  var enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = 'boda.ics';
  enlace.rel = 'noopener';
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  /* El objeto se suelta con un poco de aire: revocarlo en el mismo tic corta la
     descarga en algunos navegadores. */
  setTimeout(function () { URL.revokeObjectURL(url); }, 4000);

  if (aviso) {
    aviso.className = 'estado';
    aviso.textContent = 'Listo: abre el archivo y tu calendario hace el resto.';
  }
}

/* Sin fecha válida no hay nada que guardar y el bloque no se pinta. */
function bloqueCalendario() {
  if (objetivoMs === null) return '';
  return '<div class="calendario">' +
           '<span class="calendario-rotulo">Save the date</span>' +
           '<p class="calendario-texto">Guarda el ' + escapar(BODA.fecha) +
             ' en tu calendario y deja que te avise él.</p>' +
           '<button type="button" class="guardar" id="guardar">Añadir a mi calendario</button>' +
           '<p class="calendario-otro">' +
             '<a href="' + escapar(enlaceGoogle()) + '" target="_blank" rel="noopener">' +
               'Abrir en Google Calendar</a>' +
           '</p>' +
           '<p class="estado" id="calendario-aviso" aria-live="polite"></p>' +
         '</div>';
}

