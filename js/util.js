/* --- red, con XMLHttpRequest para no depender de fetch ni de promesas --- */
function pedir(metodo, url, cuerpo, alTerminar) {
  var x = new XMLHttpRequest();
  x.open(metodo, url, true);
  x.timeout = 20000;
  if (metodo === 'POST') {
    // text/plain a propósito: application/json dispara el preflight CORS,
    // que Apps Script no responde.
    x.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
  }
  x.onreadystatechange = function () {
    if (x.readyState !== 4) return;
    var d = null;
    try { d = JSON.parse(x.responseText); } catch (e) {}
    alTerminar(d);
  };
  x.onerror = function () { alTerminar(null); };
  x.ontimeout = function () { alTerminar(null); };
  x.send(cuerpo || null);
}

/* iTunes no promete cabeceras CORS, así que se le pide por JSONP: un <script>
   con el nombre de una función global nuestra en el parámetro 'callback', que
   es la vía que documenta Apple. `url` tiene que traer ya su '?'. */
var jsonpN = 0;
function jsonp(url, alTerminar) {
  var nombre = '__itunes' + (++jsonpN);
  var etiqueta = document.createElement('script');
  var reloj = null;

  /* Quitar la etiqueta no siempre cancela un script que ya venía de camino: si
     luego no encontrase su función, el fallo subiría a window.onerror, que
     borra la invitación entera. Por eso queda un cascarón vacío salvo cuando
     sabemos que ese script ya no va a ejecutarse. */
  function recoger(borrar) {
    if (reloj) { clearTimeout(reloj); reloj = null; }
    window[nombre] = function () {};
    if (borrar) { try { delete window[nombre]; } catch (e) {} }
    if (etiqueta.parentNode) { etiqueta.parentNode.removeChild(etiqueta); }
  }

  window[nombre] = function (d) { recoger(true); alTerminar(d); };
  etiqueta.onerror = function () { recoger(true); alTerminar(null); };
  reloj = setTimeout(function () { recoger(false); alTerminar(null); }, 10000);

  etiqueta.src = url + '&callback=' + nombre;
  document.head.appendChild(etiqueta);
}

function escapar(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Cada sección se presenta con su emblema encima del título. Por defecto es el
   arco románico, dibujado con CSS: no cuesta ni un archivo ni una petición.
   Si en el repositorio hay un `img/iconos/<id>.svg` con el id de la sección, ese
   icono lo sustituye. La comprobación la hace `probarIcono()` después de pintar:
   el arco ya está puesto y solo se cambia si el icono llega, así que ni parpadea
   ni da un salto, y una sección sin icono se queda con su arco sin enterarse. */
function titulo(id, texto) {
  return '<p class="emblema" id="emblema-' + escapar(id) + '" aria-hidden="true">' +
           '<span class="arco-chico"></span>' +
         '</p>' +
         '<h2 class="titulo">' + escapar(texto) + '</h2>';
}

function ponerIconos() {
  for (var i = 0; i < SECCIONES.length; i++) { probarIcono(SECCIONES[i].id); }
}

function probarIcono(id) {
  var hueco = document.getElementById('emblema-' + id);
  if (!hueco) return;

  var ruta = 'img/iconos/' + id + '.svg';
  var prueba = new Image();

  /* Sin `onerror`: si el archivo no está, no hay nada que hacer. El arco lleva
     pintado desde el principio y se queda como estaba. */
  prueba.onload = function () {
    hueco.innerHTML = '<img class="icono" src="' + escapar(ruta) + '" alt="">';
  };
  prueba.src = ruta;
}

function pantalla(html) {
  app.innerHTML = html;
  if (sobreAbierto) { animarEntrada(); }
}

function aviso(texto) {
  pantalla('<div id="contenido"><p class="centrado">' + escapar(texto) + '</p></div>');
}

