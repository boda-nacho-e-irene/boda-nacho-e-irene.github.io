/* --- formularios plegables --- */

/* Cada sección que nos pide algo lleva su formulario dentro y su propio botón
   de enviar: se guardan por separado y ninguna espera a las demás. Guardado lo
   suyo, el cuerpo se pliega y queda la línea de resumen con su botón, que lo
   vuelve a abrir para cambiarlo y reenviarlo.

   `alto` es el tope de `max-height` del cuerpo (ver la hoja de estilos). Va
   holgado a propósito: quedarse corto recorta el contenido, y pasarse solo
   cuesta que el primer tramo de la animación no se vea, que es lo que tapa el
   desvanecido. En móvil estrecho estos bloques crecen bastante —los dos
   trayectos se apilan, y la playlist suma tres canciones y seis resultados—,
   así que conviene medirlos antes de bajar ninguno.
   `resumen` devuelve lo que se lee plegado, o cadena vacía si todavía no hay
   nada guardado, y es también lo que decide si el bloque se pliega. */
var BLOQUES = [
  { id: 'confirmar',  alto: '44rem', resumen: resumenConfirmar },
  { id: 'alergias',   alto: '44rem', resumen: resumenAlergias },
  { id: 'transporte', alto: '90rem', resumen: resumenTransporte },
  { id: 'playlist',   alto: '90rem', resumen: resumenPlaylist }
];

function altoDe(id) {
  for (var i = 0; i < BLOQUES.length; i++) {
    if (BLOQUES[i].id === id) return BLOQUES[i].alto;
  }
  return '90rem';
}

/* El `.estado` va fuera del cuerpo a propósito: dentro, el «Guardado» se
   plegaría con el formulario justo al aparecer y nadie llegaría a leerlo. */
function bloque(id, cuerpo) {
  return '<div class="bloque" id="bloque-' + id + '">' +
           '<p class="resumen" id="resumen-' + id + '" hidden>' +
             '<span class="resumen-texto" id="resumen-texto-' + id + '"></span>' +
             '<button type="button" class="cambiar" id="cambiar-' + id + '"' +
               ' aria-expanded="false" aria-controls="cuerpo-' + id + '">Cambiar</button>' +
           '</p>' +
           '<div class="cuerpo" id="cuerpo-' + id + '" style="--alto:' + altoDe(id) + '">' +
             cuerpo +
           '</div>' +
           '<p class="estado" id="estado-' + id + '" aria-live="polite"></p>' +
         '</div>';
}

/* El botón dice lo que va a hacer, no en qué estado está. */
function plegarBloque(id, si) {
  var caja = document.getElementById('bloque-' + id);
  var boton = document.getElementById('cambiar-' + id);
  if (!caja || !boton) return;

  caja.className = si ? 'bloque plegado' : 'bloque';
  boton.setAttribute('aria-expanded', si ? 'false' : 'true');
  boton.textContent = si ? 'Cambiar' : 'Cerrar';
}

/* El único sitio que decide qué se pliega: si un bloque tiene resumen es que
   sus datos están en la hoja, así que se pliega. `abrir` es el id del bloque
   que hay que dejar abierto aunque tenga resumen, porque el invitado está en
   ello (las canciones se guardan una a una y no hay que cerrarle la sección en
   mitad de la faena). */
function repasarBloques(abrir) {
  for (var i = 0; i < BLOQUES.length; i++) {
    var b = BLOQUES[i];
    var linea = document.getElementById('resumen-' + b.id);
    if (!linea) continue;

    var texto = b.resumen();
    linea.hidden = !texto;

    if (texto) {
      document.getElementById('resumen-texto-' + b.id).innerHTML =
        '<span class="solo-voz">Hecho: </span>' +
        '<span class="resumen-marca" aria-hidden="true">✓ </span>' + escapar(texto);
    }
    plegarBloque(b.id, !!texto && b.id !== abrir);
  }
}

/* Los botones de las líneas de resumen. Abren el bloque para reenviar, y lo
   vuelven a plegar sin tocar nada si se abrió por error. */
function cablearCambiar(id) {
  var boton = document.getElementById('cambiar-' + id);
  if (!boton) return;

  boton.onclick = function () {
    plegarBloque(id, boton.getAttribute('aria-expanded') === 'true');
    // El «Guardado» de antes no dice nada del formulario que se acaba de abrir.
    estadoBloque(id, '');
  };
}

/* --- resúmenes --- */

function resumenConfirmar() {
  if (!guardado.asiste) return '';
  var nota = document.getElementById('nota');
  return (elegido ? 'Sí, allí estarás' : 'No podrás venir') +
         (nota && nota.value.replace(/^\s+|\s+$/g, '') ? ' · con mensaje' : '');
}

function resumenAlergias() {
  return guardado.alergenos ? (alergenosTexto() || SIN_ALERGIAS) : '';
}

function resumenTransporte() {
  if (!guardado.vuelta) return '';
  return vuelta === SIN_VUELTA ? 'Sin autobús de vuelta' : 'Vuelta a las ' + vuelta;
}

/* Este no mira `guardado`: cada canción se guarda al añadirla, así que tenerlas
   ya es tenerlas mandadas. */
function resumenPlaylist() {
  if (!canciones.length) return '';
  return canciones.length === 1
    ? '1 canción propuesta'
    : canciones.length + ' canciones propuestas';
}

/* --- envíos --- */

function estadoBloque(id, texto, mal) {
  var e = document.getElementById('estado-' + id);
  if (!e) return;
  e.className = mal ? 'estado mal' : 'estado';
  e.textContent = texto;
}

/* Lo que es igual en los tres envíos: bloquear el botón, contar lo que pasa y,
   si sale bien, dar el campo por guardado, plegar el bloque y repasar el índice
   —que es donde se ve la lista de recados—. */
function enviarBloque(id, cuerpo, campo, bien) {
  var boton = document.getElementById('enviar-' + id);
  boton.disabled = true;
  estadoBloque(id, 'Guardando…');

  pedir('POST', API, JSON.stringify(cuerpo), function (d) {
    boton.disabled = false;
    if (!d || !d.ok) {
      estadoBloque(id, 'No se ha podido guardar. Inténtalo otra vez.', true);
      return;
    }
    guardado[campo] = true;
    estadoBloque(id, bien);
    repasarBloques();
    montarIndice();
  });
}

function enviarConfirmacion() {
  if (elegido === null) return;
  enviarBloque('confirmar', {
    token: token,
    asiste: elegido,
    nota: document.getElementById('nota').value
  }, 'asiste', elegido ? 'Guardado. Nos vemos allí.' : 'Guardado. Te echaremos de menos.');
}

function enviarAlergias() {
  var texto = alergenosTexto();
  if (!texto) return;
  enviarBloque('alergias', { token: token, alergenos: texto },
               'alergenos', 'Guardado. Se lo pasamos a la cocina.');
}

function enviarVuelta() {
  if (!vuelta) return;
  enviarBloque('transporte', { token: token, vuelta: vuelta },
               'vuelta', 'Guardado. Te guardamos sitio.');
}

/* El botón de alergias no se enciende hasta que haya algo que mandar: la celda
   vacía de la hoja significa «todavía no ha contestado», y mandarla vacía
   dejaría el formulario como sin hacer. */
function repasarEnvioAlergias() {
  var boton = document.getElementById('enviar-alergias');
  if (boton) { boton.disabled = !alergenosTexto(); }
}

