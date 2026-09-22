/* --- navegación: el índice lateral y las flechas de saltar sección --- */

/* Una sección está hecha cuando su formulario ya está guardado, o sea cuando
   tiene resumen. Las que no piden nada no cuentan. */
function seccionHecha(id) {
  for (var i = 0; i < BLOQUES.length; i++) {
    if (BLOQUES[i].id === id) return !!BLOQUES[i].resumen();
  }
  return false;
}

/* Se llama al pintar y cada vez que cambia el juego de secciones a la vista,
   así que empieza soltando lo que dejó la vez anterior. */
function montarIndice() {
  var presentes = [];
  var lista = '';

  document.body.style.overflow = '';
  window.onscroll = null;
  window.onresize = null;
  document.onkeydown = null;

  for (var i = 0; i < SECCIONES.length; i++) {
    var seccion = document.getElementById(SECCIONES[i].id);
    if (!seccion || seccion.hidden) continue;
    presentes.push(SECCIONES[i].id);

    var hecho = seccionHecha(SECCIONES[i].id);
    lista += '<li><a class="nav-enlace" href="#' + escapar(SECCIONES[i].id) + '"'
           + (hecho ? ' data-hecho="true"' : '') + '>'
           + '<span class="nav-punto" aria-hidden="true"></span>'
           + '<span>' + escapar(SECCIONES[i].titulo) + '</span>'
           + (hecho ? '<span class="solo-voz"> (hecho)</span>' : '')
           + '</a></li>';
  }

  /* Con una sola sección el índice sobra. Lo vaciamos en vez de dejarlo estar:
     esto también se llama al ocultar secciones, y el de antes se quedaría con
     enlaces a lo que ya no hay. */
  if (presentes.length < 2) {
    document.getElementById('navegacion').innerHTML = '';
    return;
  }

  document.getElementById('navegacion').innerHTML =
    '<button type="button" class="nav-boton" id="nav-boton" aria-expanded="false"' +
      ' aria-controls="nav-indice" aria-label="Índice de la invitación">' +
      '<span></span><span></span><span></span>' +
    '</button>' +
    '<div class="nav-velo" id="nav-velo"></div>' +
    '<nav class="nav" id="nav-indice" aria-label="Secciones de la invitación">' +
      '<ol>' + lista + '</ol>' +
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
     pantalla o tres. */
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

