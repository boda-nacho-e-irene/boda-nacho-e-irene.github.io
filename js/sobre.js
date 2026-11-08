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

/* --- la entrada: primero el álbum, luego el sobre ---

   Al abrir la página aún falta casi todo: Three.js baja del CDN, el lacre
   del sobre en 3D y la invitación del servidor. En vez de enseñar un sobre a
   medio hacer (el de CSS y luego, de golpe, el de 3D), la entrada va por
   turnos y ese rato se va en ella:

     1. las tiras del álbum entran desde los lados en cuanto sus fotos están
        listas (js/galeria.js avisa con introGaleriaLista), o pasado
        INTRO_GALERIA_MAX si tardan;
     2. INTRO_SOBRE_TRAS después sube el sobre desde abajo: el de 3D si
        js/sobre3d.js ya ha avisado de que está listo, el de CSS si ha dicho
        que no puede o si a los INTRO_TOPE de empezar aún no ha dicho nada (y
        entonces el de 3D, si llega tarde, ya no sale: nada de cambiar un
        sobre por otro delante del invitado);
     3. cuando el sobre ha llegado (INTRO_ATERRIZA) se pinta la invitación
        de detrás, que es trabajo pesado y le quitaría fluidez a la subida;
     4. sale la pista en cuanto la invitación está pintada, o pasado
        INTRO_PAGINA_MAX si el servidor tarda: así lo normal es que el
        invitado abra con la página ya puesta detrás.

   Desde el paso 1 las imágenes de la invitación ya van bajando (ver
   «la precarga», más abajo): al abrir están en caché y descodificadas.

   Las clases van en la capa (`intro-galeria`, `intro-sobre`, `intro-listo`,
   `pagina-lista`) y lo que hace cada una está en css/galeria.css y
   css/sobre.css. */

var INTRO_GALERIA_MAX = 1200;   // ms que se espera a las fotos del álbum
var INTRO_SOBRE_TRAS  = 700;    // ms entre que entran las tiras y sube el sobre
var INTRO_TOPE        = 3000;   // ms que se espera al sobre de 3D
var INTRO_ATERRIZA    = 1300;   // ms que tarda el sobre en subir
var INTRO_PAGINA_MAX  = 3000;   // ms que la pista espera a la invitación

var intro = { galeria: false, turno: false, tope: false, sobre: '', elegido: '', listo: false, cola: [] };

/* Las fotos del álbum ya están (o no van a estar): entran las tiras. */
function introGaleriaLista() {
  if (intro.galeria || !capa) return;
  intro.galeria = true;
  capa.classList.add('intro-galeria');
  // las fotos del álbum ya no necesitan la red: le toca a la invitación
  precalentar();
  setTimeout(function () { intro.turno = true; introSiguiente(); },
             sinMovimiento ? 0 : INTRO_SOBRE_TRAS);
}

/* js/sobre3d.js dice qué sobre hay: '3d' si el suyo está montado y con el
   lacre puesto, 'css' si no ha podido. */
function introSobreListo(tipo) {
  if (intro.sobre) return;
  intro.sobre = tipo;
  /* Ya salió el de CSS: el de 3D se queda sin estrenar y, para el resto de
     la página (el gesto, abrirSobre), como si no existiera. */
  if (intro.elegido === 'css' && tipo === '3d') { window.sobre3d = null; return; }
  introSiguiente();
}

function introSiguiente() {
  if (intro.elegido || !intro.turno) return;
  if (intro.sobre === '3d' && window.sobre3d) {
    intro.elegido = '3d';
    window.sobre3d.entrar();
  } else if (intro.sobre === 'css' || intro.tope) {
    intro.elegido = 'css';
    if (window.sobre3d) { window.sobre3d = null; }
    capa.classList.add('intro-sobre');
  } else {
    return;
  }
  setTimeout(introAterriza, sinMovimiento ? 0 : INTRO_ATERRIZA);
}

function introAterriza() {
  intro.listo = true;
  capa.classList.add('intro-listo');
  setTimeout(paginaLista, sinMovimiento ? 0 : INTRO_PAGINA_MAX);
  var cola = intro.cola;
  intro.cola = [];
  for (var i = 0; i < cola.length; i++) { cola[i](); }
}

/* Lo que es mejor no hacer mientras el sobre sube (pintar la invitación):
   se guarda y se hace al llegar. Si ya llegó, se hace ahora. */
function trasIntro(hacer) {
  if (intro.listo || !capa) { hacer(); return; }
  intro.cola.push(hacer);
}

/* La invitación ya está detrás (o el servidor ha contestado con un aviso):
   puede salir la pista. La llama js/pintar.js; si el servidor tarda, la
   llama el reloj de introAterriza y la pista sale igual. */
function paginaLista() {
  if (capa) { capa.classList.add('pagina-lista'); }
}

/* --- la precarga ---

   Lo que la invitación va a enseñar al abrirse se pide mientras el invitado
   mira el sobre, para que al apartarse esté ya todo puesto:

     - en cuanto entran las tiras del álbum, las imágenes de fondo de las
       hojas de estilo (las acuarelas de las secciones, los dibujos de la
       portada). No dependen de lo que conteste el servidor, así que no hay
       que esperarle;
     - en cuanto la invitación está pintada, las fotos que llevan
       `loading="lazy"` (el carrusel del lugar, los dibujos de las
       secciones): sin esto bajarían al hacer scroll, delante del invitado.

   Todo con prioridad baja y descodificado de antemano (`decode()`), que es
   lo que evita el parpadeo del primer fotograma. Con «ahorro de datos» no se
   adelanta nada: cada cosa baja cuando haga falta, como siempre. */
var precargadas = [];
var precalentada = false;

function ahorroDeDatos() {
  return !!(navigator.connection && navigator.connection.saveData);
}

function precalentar() {
  if (precalentada || ahorroDeDatos()) return;
  precalentada = true;
  var urls = imagenesDeLasHojas();
  for (var i = 0; i < urls.length; i++) {
    var img = new Image();
    img.fetchPriority = 'low';
    img.decoding = 'async';
    img.src = urls[i];
    if (img.decode) { img.decode()['catch'](function () {}); }
    // se guardan para que no se las lleve el recolector antes de abrir
    precargadas.push(img);
  }
}

/* Las imágenes (`url()`) de todas las reglas de las hojas propias, sin
   repetir. Se lee el texto de la regla y no `backgroundImage`: un `background`
   que lleva un `var()` dentro (las acuarelas de las secciones, con su velo)
   deja las propiedades sueltas vacías hasta pintarse. Las variables
   (`--fondo-escritorio: url(…)`) se quitan antes: solo se pide lo que una
   regla usa tal cual. Las hojas de otro sitio (Google Fonts) o abiertas desde
   el disco no dejan leer sus reglas: se saltan. */
function imagenesDeLasHojas() {
  var vistas = {};
  var urls = [];
  var hojas = document.styleSheets;

  function recorrer(reglas, base) {
    for (var j = 0; j < reglas.length; j++) {
      var r = reglas[j];
      if (r.cssRules) { recorrer(r.cssRules, base); }   // @media y compañía
      var texto = r.style ? r.style.cssText : '';
      if (texto.indexOf('url(') === -1) continue;
      texto = texto.replace(/(^|;)\s*--[^;]*/g, '$1');
      var trozos = texto.match(/url\(\s*["']?[^"')]+/g) || [];
      for (var k = 0; k < trozos.length; k++) {
        var ruta = trozos[k].replace(/^url\(\s*["']?/, '');
        if (/^(data:|#)/.test(ruta)) continue;
        try { ruta = new URL(ruta, base).href; } catch (e) { continue; }
        if (vistas[ruta]) continue;
        vistas[ruta] = true;
        urls.push(ruta);
      }
    }
  }

  for (var i = 0; i < hojas.length; i++) {
    var reglas;
    try { reglas = hojas[i].cssRules; } catch (e) { continue; }
    if (reglas) { recorrer(reglas, hojas[i].href || location.href); }
  }
  return urls;
}

/* Con la invitación pintada: lo perezoso, ya; y lo que hay, descodificado. */
function adelantarImagenes(raiz) {
  if (!raiz || ahorroDeDatos()) return;
  var imgs = raiz.getElementsByTagName('img');
  for (var i = 0; i < imgs.length; i++) {
    if (imgs[i].loading === 'lazy') {
      imgs[i].fetchPriority = 'low';
      imgs[i].loading = 'eager';
    }
    if (imgs[i].decode) { imgs[i].decode()['catch'](function () {}); }
  }
}

if (capa) {
  setTimeout(introGaleriaLista, INTRO_GALERIA_MAX);
  setTimeout(function () { intro.tope = true; introSiguiente(); }, INTRO_TOPE);
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
  // el sobre de 3D deja de escuchar la ventana y suelta la tarjeta gráfica
  if (window.sobre3d) { window.sobre3d.retirar(); }
  // el álbum de detrás ya no se ve: fuera sus fotos y sus animaciones
  if (typeof galeriaFuera === 'function') { galeriaFuera(); }
  // la página ya está a la vista y usa sus propias copias
  precargadas = [];
  document.body.className = '';
  sobreAbierto = true;
  animarEntrada();
}

function abrirSobre() {
  // hasta que no sale un sobre no hay nada que abrir
  if (sobreAbriendo || sobreAbierto || (capa && !intro.elegido)) return;
  // Si lo abren aún subiendo, lo que esperaba a que llegase (pintar la
  // invitación) se hace ya: la carta mide la página al desplegarse.
  if (capa && !intro.listo) { introAterriza(); }
  sobreAbriendo = true;
  // el álbum se apaga: mientras la carta se despliega, que la tarjeta
  // gráfica se dedique solo a ella
  if (capa) { capa.classList.add('abre'); }

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
      function () { capa.classList.add('desplegando', 'fuera'); },
      function () { setTimeout(quitarCapa, 650); },
      // mientras la carta se abre, el fondo de la capa pasa a ser el de la página
      function () { capa.classList.add('desplegando'); });
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
  setTimeout(function () { capa.classList.add('fuera'); }, 2250);
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

/* Con el sobre de CSS vale tocar en cualquier parte: el botón está dentro y
   el clic burbujea. Con el de 3D se abre arrastrando el lacre hacia arriba
   (js/sobre3d.js), así que un clic o un toque no hace nada; solo cuenta el
   «clic» que manda el teclado al pulsar Intro o Espacio sobre el botón, que
   llega con `detail` a 0. */
if (capa) {
  capa.onclick = function (ev) {
    if (window.sobre3d && ev && ev.detail !== 0) return;
    abrirSobre();
  };
}

