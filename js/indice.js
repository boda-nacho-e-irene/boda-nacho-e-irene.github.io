/* --- navegación: el índice lateral y las flechas de saltar sección --- */

/* Una sección está hecha cuando su formulario ya está guardado, o sea cuando
   tiene resumen. Las que no piden nada no cuentan. */
function seccionHecha(id) {
  for (var i = 0; i < BLOQUES.length; i++) {
    if (BLOQUES[i].id === id) return !!BLOQUES[i].resumen();
  }
  return false;
}

/* El nombre con el que la sección sale en el índice. */
function tituloDe(id) {
  for (var i = 0; i < SECCIONES.length; i++) {
    if (SECCIONES[i].id === id) return SECCIONES[i].titulo;
  }
  return id;
}

/* --- el orden de la página --- */

/* Los `id` de las secciones que están puestas, en el orden en que están **hoy**
   en la página. El índice y las flechas van por aquí y no por `SECCIONES`: lo
   hecho se baja al final, así que esa constante es el orden de partida y el DOM
   el de ahora. */
function seccionesPuestas() {
  var contenido = document.getElementById('contenido');
  var ids = [];
  if (!contenido) return ids;

  var secciones = contenido.getElementsByTagName('section');
  for (var i = 0; i < secciones.length; i++) {
    if (!secciones[i].hidden && secciones[i].id) { ids.push(secciones[i].id); }
  }
  return ids;
}

/* La sección que ocupa el borde de arriba de la pantalla: la primera cuyo
   final todavía no ha pasado. */
function seccionAlFrente() {
  var contenido = document.getElementById('contenido');
  if (!contenido) return null;

  var secciones = contenido.getElementsByTagName('section');
  for (var i = 0; i < secciones.length; i++) {
    if (secciones[i].hidden) continue;
    if (secciones[i].getBoundingClientRect().bottom > 1) return secciones[i];
  }
  return null;
}

/* Mover la página sin deslizar. El `scroll-behavior: smooth` de la hoja está
   para los saltos que pide el invitado; esto es un reajuste, y deslizarlo se
   vería como un viaje que él no ha pedido. */
function desplazar(px) {
  if (!px) return;
  var raiz = document.documentElement;
  var comoEstaba = raiz.style.scrollBehavior;

  raiz.style.scrollBehavior = 'auto';
  window.scrollTo(0, (window.pageYOffset || raiz.scrollTop || 0) + px);
  raiz.style.scrollBehavior = comoEstaba;
}

/* ¿Están ya las secciones en este orden? Mover nodo por nodo para dejarlo todo
   como estaba le cuesta al navegador la maqueta entera. */
function mismoOrden(contenido, orden) {
  var secciones = contenido.getElementsByTagName('section');
  if (secciones.length !== orden.length) return false;
  for (var i = 0; i < orden.length; i++) {
    if (secciones[i] !== orden[i]) return false;
  }
  return true;
}

/* Lo hecho, al final de la página. Así la invitación se lee como una lista de
   recados: arriba lo que todavía nos tiene que decir, abajo lo que ya está
   guardado. Dentro de cada montón manda el orden de `SECCIONES`, así que nada
   se cruza con nada.

   Lo llama montarIndice(), que es lo que corre cada vez que algo se guarda o se
   esconde: la página y el índice se reordenan a la vez y nunca dicen cosas
   distintas. */
function ordenarSecciones() {
  var contenido = document.getElementById('contenido');
  if (!contenido) return;

  var pendientes = [];
  var hechas = [];
  for (var i = 0; i < SECCIONES.length; i++) {
    var sec = document.getElementById(SECCIONES[i].id);
    if (!sec || sec.parentNode !== contenido) continue;
    if (seccionHecha(SECCIONES[i].id)) { hechas.push(sec); } else { pendientes.push(sec); }
  }

  var orden = pendientes.concat(hechas);
  if (mismoOrden(contenido, orden)) return;

  /* Antes de tocar nada: qué sección tiene delante el invitado y a qué altura,
     y dónde tiene el foco. Reinsertar un nodo se lleva por delante el foco que
     hubiera dentro —y el que acaba de guardar lo tiene en su botón de enviar—,
     así que se lo devolvemos en cuanto está en su sitio. */
  var suya = seccionAlFrente();
  var altura = suya ? suya.getBoundingClientRect().top : 0;
  var foco = document.activeElement;

  for (var j = 0; j < orden.length; j++) { contenido.appendChild(orden[j]); }

  if (foco && foco.focus && contenido.contains(foco)) {
    // El objeto no lo entiende el navegador viejo, que se limita a ignorarlo;
    // el reajuste de debajo le corrige el salto de todos modos.
    foco.focus({ preventScroll: true });
  }

  /* Y la sección que tenía delante, delante: la seguimos hasta su nuevo sitio
     en vez de dejar que se le cuele otra por debajo. Lo que acaba de bajar al
     final es casi siempre la suya —se reordena justo al guardar su formulario,
     o al apuntar una canción con la playlist abierta—, y sacarle la pantalla
     de debajo en ese momento es quitarle de delante lo que estaba mirando. El
     cambio de orden lo cuenta el índice; la página no da ningún salto. */
  if (suya) { desplazar(suya.getBoundingClientRect().top - altura); }
}

/* --- el índice --- */

function entradaIndice(id) {
  var hecho = seccionHecha(id);
  return '<li><a class="nav-enlace" href="#' + escapar(id) + '"'
       + (hecho ? ' data-hecho="true"' : '') + '>'
       + '<span class="nav-punto" aria-hidden="true"></span>'
       + '<span>' + escapar(tituloDe(id)) + '</span>'
       + (hecho ? '<span class="solo-voz"> (hecho)</span>' : '')
       + '</a></li>';
}

/* Las secciones en obras no se pintan en la página: se quedan aquí abajo, como
   botones apagados debajo de la línea que dice que están por venir. Así se ve
   que hay más invitación en camino sin que el invitado se tropiece con una
   pantalla vacía cada vez que baja. El botón no lleva enlace porque no hay
   adónde ir. */
function listaEnObras() {
  if (!EN_OBRAS || !EN_OBRAS.length) return '';

  var lista = '';
  for (var i = 0; i < EN_OBRAS.length; i++) {
    lista += '<li><button type="button" class="nav-enlace nav-obra" disabled>' +
               '<span class="nav-punto" aria-hidden="true"></span>' +
               '<span>' + escapar(EN_OBRAS[i].titulo) + '</span>' +
             '</button></li>';
  }

  return '<p class="nav-rotulo" id="nav-obras-rotulo">Próximamente</p>' +
         '<p class="nav-nota" id="nav-obras-nota">Estas secciones se habilitarán pronto.</p>' +
         '<ul class="nav-lista" aria-labelledby="nav-obras-rotulo nav-obras-nota">' +
           lista +
         '</ul>';
}

/* Se llama al pintar y cada vez que cambia el juego de secciones a la vista,
   así que empieza soltando lo que dejó la vez anterior. */
function montarIndice() {
  ordenarSecciones();

  var presentes = seccionesPuestas();
  var pendientes = '';
  var hechas = '';

  document.body.style.overflow = '';
  window.onscroll = null;
  window.onresize = null;
  document.onkeydown = null;

  for (var i = 0; i < presentes.length; i++) {
    if (seccionHecha(presentes[i])) { hechas += entradaIndice(presentes[i]); }
    else { pendientes += entradaIndice(presentes[i]); }
  }

  /* Con una sola sección el índice sobra. Lo vaciamos en vez de dejarlo estar:
     esto también se llama al ocultar secciones, y el de antes se quedaría con
     enlaces a lo que ya no hay. */
  if (presentes.length < 2) {
    document.getElementById('navegacion').innerHTML = '';
    return;
  }

  /* El índice va en tres apartados, en el mismo orden que la página: lo que
     queda por hacer, lo ya hecho y lo que está por venir. */
  var listas = pendientes ? '<ol class="nav-lista">' + pendientes + '</ol>' : '';
  if (hechas) {
    listas += '<p class="nav-rotulo" id="nav-hechas-rotulo">Hecho</p>' +
              '<ol class="nav-lista" aria-labelledby="nav-hechas-rotulo">' + hechas + '</ol>';
  }
  listas += listaEnObras();

  document.getElementById('navegacion').innerHTML =
    '<button type="button" class="nav-boton" id="nav-boton" aria-expanded="false"' +
      ' aria-controls="nav-indice" aria-label="Índice de la invitación">' +
      '<span></span><span></span><span></span>' +
    '</button>' +
    '<div class="nav-velo" id="nav-velo"></div>' +
    '<nav class="nav" id="nav-indice" aria-label="Secciones de la invitación">' +
      listas +
    '</nav>' +
    '<nav class="pasos" aria-label="Saltar de sección">' +
      '<button type="button" class="paso" id="paso-atras" aria-label="Sección anterior">' +
        '<svg viewBox="0 0 16 12" aria-hidden="true">' +
          '<path d="M2 8.5 L8 3.5 L14 8.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
      '</button>' +
      '<button type="button" class="paso" id="paso-siguiente" aria-label="Sección siguiente">' +
        '<svg viewBox="0 0 16 12" aria-hidden="true">' +
          '<path d="M2 3.5 L8 8.5 L14 3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
      '</button>' +
    '</nav>';

  var boton = document.getElementById('nav-boton');
  var panel = document.getElementById('nav-indice');
  var velo  = document.getElementById('nav-velo');
  var enlaces = panel.getElementsByTagName('a');
  var atras = document.getElementById('paso-atras');
  var siguiente = document.getElementById('paso-siguiente');
  var enCurso = 0;   // la sección que manda, por su sitio en `presentes`

  function abrir(si) {
    boton.setAttribute('aria-expanded', si ? 'true' : 'false');
    panel.className = si ? 'nav abierto' : 'nav';
    velo.className  = si ? 'nav-velo visible' : 'nav-velo';
    document.body.style.overflow = si ? 'hidden' : '';
  }

  /* El salto deja el borde de arriba de la sección clavado en el de la
     pantalla, y de eso se encarga el navegador solo: la sección mide una
     pantalla y no lleva `scroll-margin-top`, así que cae centrada. Deslizar es
     cosa de `scroll-behavior: smooth` (y no desliza para quien haya pedido
     menos movimiento). Saltar es de sección a sección, tenga la de abajo una
     pantalla o tres, y en el orden en que están puestas hoy: lo hecho se va al
     final, y las flechas van detrás. */
  function saltar(paso) {
    var destino = document.getElementById(presentes[enCurso + paso]);
    if (destino) { destino.scrollIntoView(); }
  }
  atras.onclick = function () { saltar(-1); };
  siguiente.onclick = function () { saltar(1); };

  boton.onclick = function () { abrir(boton.getAttribute('aria-expanded') !== 'true'); };
  velo.onclick  = function () { abrir(false); };
  for (var j = 0; j < enlaces.length; j++) {
    enlaces[j].onclick = function () { abrir(false); };
  }
  document.onkeydown = function (e) {
    var esc = e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27;
    if (esc && boton.getAttribute('aria-expanded') === 'true') { abrir(false); }
  };
  // El panel es el mismo a todos los anchos, así que al girar la pantalla no
  // hay que cerrarlo; lo que sí cambia es el alto de las secciones, y con él
  // cuál de ellas manda.
  window.onresize = function () { repasar(); };

  /* La sección que manda es la misma para el índice y para las flechas, así
     que se marcan juntas: lo que el índice señala es de donde saltan. */
  function marcar(id) {
    for (var k = 0; k < enlaces.length; k++) {
      if (enlaces[k].getAttribute('href') === '#' + id) {
        enlaces[k].setAttribute('aria-current', 'true');
      } else {
        enlaces[k].removeAttribute('aria-current');
      }
    }

    for (var m = 0; m < presentes.length; m++) {
      if (presentes[m] === id) { enCurso = m; }
    }
    atras.disabled = enCurso === 0;
    siguiente.disabled = enCurso === presentes.length - 1;
  }

  /* Manda la última sección cuyo borde superior haya pasado la franja de
     referencia. Con tres secciones sale más barato medirlas en cada scroll
     que sostener un IntersectionObserver y su estado. */
  function repasar() {
    // La portada es corta: arriba del todo la franja ya cae en la sección
    // siguiente, así que ahí mandamos la primera sin mirar nada más.
    if ((window.pageYOffset || document.documentElement.scrollTop) < 8) {
      marcar(presentes[0]);
      return;
    }
    var franja = window.innerHeight * 0.42;
    var mejor = presentes[0];
    for (var n = 0; n < presentes.length; n++) {
      if (document.getElementById(presentes[n]).getBoundingClientRect().top <= franja) {
        mejor = presentes[n];
      }
    }
    marcar(mejor);
  }

  /* Medir todas las secciones en cada evento de scroll sale caro: el navegador
     dispara muchos más scrolls que fotogramas pinta. Con el pestillo medimos
     una sola vez por fotograma. */
  var pendiente = false;
  var porFotograma = window.requestAnimationFrame
    ? function (f) { return window.requestAnimationFrame(f); }
    : function (f) { return setTimeout(f, 16); };

  window.onscroll = function () {
    if (pendiente) return;
    pendiente = true;
    porFotograma(function () { pendiente = false; repasar(); });
  };
  repasar();
}
