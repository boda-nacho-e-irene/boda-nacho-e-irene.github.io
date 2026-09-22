/* Sube desde donde se hizo clic hasta el botón: el clic puede caer en la
   carátula o en el texto de dentro. */
function botonDe(destino, tope) {
  var b = destino;
  while (b && b !== tope && b.tagName !== 'BUTTON') { b = b.parentNode; }
  return b && b !== tope ? b : null;
}

/* Los `id` de SECCIONES que van detrás de «Confirmar»: son los que se caen de
   la página cuando alguien nos dice que no puede venir. Salen de la lista y no
   a mano, así que reordenar SECCIONES los recoloca solos. */
function seccionesTrasConfirmar() {
  var fuera = [];
  var visto = false;
  for (var i = 0; i < SECCIONES.length; i++) {
    if (visto) { fuera.push(SECCIONES[i].id); }
    if (SECCIONES[i].id === 'confirmar') { visto = true; }
  }
  return fuera;
}

/* A quien no puede venir le sobra todo lo que viene después de confirmar
   (empezando por una cuenta atrás que no va con él): se lo quitamos de la
   página y del índice. Le queda el mensaje para nosotros, que es lo que sí
   tiene sentido que nos deje. Si cambia de idea, vuelve todo. */
function ajustarAlcance(asiste) {
  var fuera = seccionesTrasConfirmar();
  for (var i = 0; i < fuera.length; i++) {
    var sec = document.getElementById(fuera[i]);
    if (sec) { sec.hidden = !asiste; }
  }
  // El reloj de la cuenta atrás no tiene por qué seguir latiendo si no se ve.
  if (asiste) { arrancarCuenta(); } else { pararCuenta(); }
  montarIndice();
}

/* Lo que se guarda cuando el invitado no tiene ninguna alergia: así la celda
   de la hoja distingue «no necesita nada» de «todavía no lo ha dicho», y el
   formulario se puede dejar completo sin marcar alérgenos falsos. */
var SIN_ALERGIAS = 'Ninguna';

/* Los alérgenos, y al final la salida para quien no tiene ninguno. */
function chipsAlergenos() {
  var botones = '';
  for (var i = 0; i < ALERGENOS.length; i++) {
    botones += '<button type="button" class="chip" data-a="' + escapar(ALERGENOS[i]) + '" aria-pressed="false">'
             + escapar(ALERGENOS[i]) + '</button>';
  }
  botones += '<button type="button" class="chip" data-a="' + escapar(SIN_ALERGIAS) + '" aria-pressed="false">'
           + 'Ninguna</button>';
  return botones;
}

/* «Ninguna» no convive con nada: marcarla limpia el resto, y marcar cualquier
   alérgeno la apaga. Así nunca sale a la cocina una lista que se contradice. */
function alternarAlergeno(boton) {
  var caja = document.getElementById('chips');
  var nombre = boton.getAttribute('data-a');
  var activo = boton.getAttribute('aria-pressed') === 'true';

  if (activo) {
    boton.setAttribute('aria-pressed', 'false');
    delete marcados[nombre];
    repasarEnvioAlergias();
    return;
  }

  var b = caja.getElementsByTagName('button');
  for (var i = 0; i < b.length; i++) {
    var otro = b[i].getAttribute('data-a');
    var choca = (nombre === SIN_ALERGIAS) ? otro !== SIN_ALERGIAS : otro === SIN_ALERGIAS;
    if (choca) {
      b[i].setAttribute('aria-pressed', 'false');
      delete marcados[otro];
    }
  }

  boton.setAttribute('aria-pressed', 'true');
  marcados[nombre] = true;
  repasarEnvioAlergias();
}

/* La lista tal como va a la hoja: los chips marcados y, al final, lo que haya
   escrito en «otra cosa». La usan el envío y el resumen, que tienen que decir
   lo mismo. */
function alergenosTexto() {
  var campo = document.getElementById('otros');
  var otros = campo ? campo.value.replace(/^\s+|\s+$/g, '') : '';
  var lista = [];

  for (var k in marcados) {
    if (!marcados.hasOwnProperty(k)) continue;
    /* Si nos cuenta algo por escrito, «Ninguna» ya no vale como respuesta:
       la quitamos para que la hoja no diga las dos cosas a la vez. */
    if (k === SIN_ALERGIAS && otros) continue;
    lista.push(k);
  }
  if (otros) lista.push(otros);
  return lista.join(', ');
}

/* Su propia sección, con su formulario y su botón: los alérgenos se guardan sin
   esperar a nada más. Antes vivían plegados dentro de *Confirmar* porque
   compartían con ella el botón de enviar. El grupo de chips lleva su etiqueta a
   mano: el <legend> que la daba es ahora el título de la sección. */
function seccionAlergias() {
  return '<section class="seccion" id="alergias">' +
           titulo('alergias', 'Alergias e intolerancias') +
           bloque('alergias',
             '<fieldset>' +
               '<p class="ayuda">Marca lo que necesites. Se lo pasamos tal cual a la cocina.</p>' +
               '<div class="chips" id="chips" role="group" aria-label="Alergias e intolerancias">' +
                 chipsAlergenos() +
               '</div>' +
             '</fieldset>' +
             '<fieldset>' +
               '<label class="campo" for="otros">Otra cosa que debamos saber</label>' +
               '<input type="text" id="otros" placeholder="Otra alergia, medicación, lo que sea">' +
             '</fieldset>' +
             '<button type="button" class="enviar" id="enviar-alergias" disabled>Guardar alergias</button>'
           ) +
         '</section>';
}

function elegir(asiste) {
  elegido = asiste;
  document.getElementById('si').setAttribute('aria-pressed', asiste ? 'true' : 'false');
  document.getElementById('no').setAttribute('aria-pressed', asiste ? 'false' : 'true');

  var respuesta = document.getElementById('respuesta');
  respuesta.textContent = asiste ? RESPUESTAS.si : RESPUESTAS.no;
  respuesta.className = 'respuesta visible';

  ajustarAlcance(asiste);

  document.getElementById('enviar-confirmar').disabled = false;
}
