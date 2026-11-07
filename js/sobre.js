/* --- el sobre: tapa la página hasta que el invitado la toca --- */

var capa = document.getElementById('sobre');
var sobreAbierto = false;
var sobreAbriendo = false;
var sinMovimiento = !!(window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* Al recargar, el navegador devuelve la página a donde estaba. Aquí eso no
   vale: la invitación se pinta tarde —cuando contesta el backend—, así que ese
   regreso llega con el sobre ya delante y tapándolo, y al apartarse el sobre
   la invitación aparecía empezada por la mitad en vez de por la presentación.
   Le quitamos el encargo; quien quiera volver a su sitio tiene el índice. */
if (window.history && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

/* El sobre va dirigido a alguien: en cuanto llega el nombre, lo escribimos. */
function nombreEnSobre(nombre) {
  var e = document.getElementById('sobre-nombre');
  if (!e || !nombre || e.textContent === nombre) return;
  e.textContent = nombre;
  e.className = 'sobre-nombre puesto';
  if (window.sobre3d) { window.sobre3d.ponerNombre(nombre); }
}

/* La invitación se pinta detrás del sobre, así que su animación de
   entrada espera a que el sobre se aparte. */
function animarEntrada() {
  var c = document.getElementById('contenido');
  if (!c) return;
  c.className = 'entra';
  revelarSecciones(c);
}

/* Cada sección entra sola al asomar por la pantalla. La clase `con-revelado`
   se pone aquí y no en el HTML a propósito: es la que esconde las secciones en
   la hoja de estilos, así que si el navegador no trae IntersectionObserver —o
   si esto se cae antes de llegar— la invitación se ve entera en vez de
   quedarse en blanco. */
function revelarSecciones(c) {
  var secciones = c.getElementsByTagName('section');
  var i;

  if (sinMovimiento || !window.IntersectionObserver || !secciones.length) return;

  c.className = 'entra con-revelado';
  /* La portada ya está en pantalla: se la damos por vista antes de observar
     nada, para que no parpadee esperando al primer aviso del observador. */
  secciones[0].className += ' dentro';

  var ojo = new IntersectionObserver(function (entradas) {
    for (var j = 0; j < entradas.length; j++) {
      if (!entradas[j].isIntersecting) continue;
      entradas[j].target.className += ' dentro';
      ojo.unobserve(entradas[j].target);   // una vez dentro ya no vuelve a salir
    }
  }, { rootMargin: '0px 0px -12% 0px' });

  for (i = 1; i < secciones.length; i++) { ojo.observe(secciones[i]); }
}

function quitarCapa() {
  if (capa) { capa.style.display = 'none'; }
  document.body.className = '';
  sobreAbierto = true;
  animarEntrada();
}

function abrirSobre() {
  if (sobreAbriendo || sobreAbierto) return;
  sobreAbriendo = true;

  /* Y por si acaso: la invitación empieza por arriba, por la presentación.
     Va aquí y no al quitar la capa porque ahora mismo el sobre tapa la
     pantalla entera, así que el salto —o el deslizamiento, que el `html` va
     con `scroll-behavior: smooth`— no se ve. */
  window.scrollTo(0, 0);

  if (sinMovimiento || !capa) { quitarCapa(); return; }

  /* El sobre de Three.js (js/sobre3d.js), si ha podido montarse: él lleva
     el reloj y avisa cuando toca fundir la capa y cuando ha terminado. */
  if (window.sobre3d) {
    document.getElementById('sobre-pista').className = 'sobre-pista ida';
    window.sobre3d.abrir(
      function () { capa.className = 'sobre-capa en-3d fuera'; },
      function () { setTimeout(quitarCapa, 650); });
    return;
  }

  var boton = document.getElementById('sobre-btn');
  var pista = document.getElementById('sobre-pista');
  boton.className = 'sobre abriendo';   // el lacre da un respingo
  pista.className = 'sobre-pista ida';

  /* Los pasos, en el orden y con el ritmo del vídeo: la solapa se levanta
     con el lacre, la carta sube, el sobre se deshace y la carta crece hasta
     tapar la pantalla mientras la capa se funde con la presentación. Lo que
     hace cada clase está en css/sobre.css. */
  setTimeout(function () { boton.className = 'sobre abriendo abierto'; }, 250);
  setTimeout(function () { boton.className = 'sobre abriendo abierto sacando'; }, 800);
  setTimeout(function () {
    medirCrecida(boton);
    boton.className = 'sobre abriendo abierto sacando soltando';
  }, 1750);
  setTimeout(function () { capa.className = 'sobre-capa fuera'; }, 2250);
  setTimeout(quitarCapa, 2900);
}

/* Cuánto tiene que crecer la carta para tapar la pantalla, y cuánto moverse
   para quedar en medio. Se mide con la carta ya fuera del sobre, que es desde
   donde arranca; el CSS lo lee en --dx, --dy y --crece. */
function medirCrecida(boton) {
  var carta = boton.querySelector('.sobre-carta');
  if (!carta || !carta.getBoundingClientRect) return;
  var r = carta.getBoundingClientRect();
  if (!r.width || !r.height) return;
  var ancho = window.innerWidth;
  var alto = window.innerHeight;
  var crece = Math.max(ancho / r.width, alto / r.height) * 1.15;
  boton.style.setProperty('--dx', (ancho / 2 - (r.left + r.width / 2)) + 'px');
  boton.style.setProperty('--dy', (alto / 2 - (r.top + r.height / 2)) + 'px');
  boton.style.setProperty('--crece', crece.toFixed(3));
}

/* Vale tocar en cualquier parte; el botón está dentro y el clic burbujea. */
if (capa) { capa.onclick = abrirSobre; }

