/* --- índice lateral --- */
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
    lista += '<li><a class="nav-enlace" href="#' + escapar(SECCIONES[i].id) + '">'
           + '<span class="nav-punto" aria-hidden="true"></span>'
           + '<span>' + escapar(SECCIONES[i].titulo) + '</span></a></li>';
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
    '</nav>';

  var boton = document.getElementById('nav-boton');
  var panel = document.getElementById('nav-indice');
  var velo  = document.getElementById('nav-velo');
  var enlaces = panel.getElementsByTagName('a');

  function abrir(si) {
    boton.setAttribute('aria-expanded', si ? 'true' : 'false');
    panel.className = si ? 'nav abierto' : 'nav';
    velo.className  = si ? 'nav-velo visible' : 'nav-velo';
    document.body.style.overflow = si ? 'hidden' : '';
  }

  boton.onclick = function () { abrir(boton.getAttribute('aria-expanded') !== 'true'); };
  velo.onclick  = function () { abrir(false); };
  for (var j = 0; j < enlaces.length; j++) {
    enlaces[j].onclick = function () { abrir(false); };
  }
  document.onkeydown = function (e) {
    var esc = e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27;
    if (esc && boton.getAttribute('aria-expanded') === 'true') { abrir(false); }
  };
  // Si el móvil abierto pasa a ancho de escritorio (giro de pantalla), el panel
  // se convierte en raíl y hay que soltar el bloqueo del scroll.
  window.onresize = function () {
    if (window.innerWidth >= 992) { abrir(false); }
    repasar();
  };

  function marcar(id) {
    for (var k = 0; k < enlaces.length; k++) {
      if (enlaces[k].getAttribute('href') === '#' + id) {
        enlaces[k].setAttribute('aria-current', 'true');
      } else {
        enlaces[k].removeAttribute('aria-current');
      }
    }
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

