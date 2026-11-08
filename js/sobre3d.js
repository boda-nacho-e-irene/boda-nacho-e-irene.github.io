/* --- el sobre en 3D: Three.js pinta el sobre que tapa la página ---

   Es el mismo sobre del vídeo: papel de acuarela, lacre de cera dorada, la
   solapa que se levanta llevándose el lacre, la carta con su marco de
   acuarela que sube, el sobre que se deshace y la cámara que se acerca a la
   carta hasta que la carta es la pantalla. Ahí la capa se funde con la
   presentación, que es la misma acuarela.

   Si no hay Three.js (no bajó del CDN) o no hay WebGL, `window.sobre3d` no se
   llega a poner y js/sobre.js sigue con el sobre de CSS de siempre.

   Three.js lo pide este archivo, sin bloquear nada, y no un <script defer> en
   el <head>: los `defer` se ejecutan en orden, así que uno del CDN delante de
   pintar.js hacía esperar a la invitación entera —y a la petición al
   servidor— a que bajasen 600 KB de otro sitio, o a que fallasen. La
   descarga empieza igual de pronto (un `preload` en el <head>), pero la
   invitación no la espera.

   Mientras se decide, la capa lleva `esperando` (index.html): se ve el papel
   del fondo pero no el sobre de CSS, para que no asome y luego cambie por el
   de 3D. Se quita al montar el 3D o, si no puede ser —no baja, no hay WebGL,
   falla, o tarda más de ESPERA ms—, para dejar el de CSS. Pasado ese tope el
   3D ya no se monta aunque llegue: el cambio delante del invitado es lo que
   se quiere evitar.

   Los colores salen todos de los tokens de css/base.css: se leen al montar la
   escena, así que el laboratorio de ?lab también manda aquí (al recargar).

   Todo lo que corre aquí —el montaje y también lo que llega luego: imágenes,
   fotogramas, el dedo, el tamaño de la ventana— va por `seguro()`: el
   window.onerror del <head> tapa la invitación con el error, y un fallo del
   sobre bonito no puede costar la invitación. Si algo falla, el sobre de 3D
   se aparta: cerrado, deja el de CSS; abriéndose, termina de abrir. */

(function () {
  var URL_THREE = 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js';
  var enLaboratorio = /[?&]lab(?=[&=]|$)/.test(location.search);
  var ESPERA = 4000;
  var T = null;
  var alApagar = null;     // lo pone montar(): cómo retirarse si algo falla
  var decidido = false;    // ya se sabe qué sobre se queda
  // js/sobre.js no abre con un clic mientras tanto: aún no se ve ningún sobre
  window.sobre3dEsperando = true;

  // deja de esperar: se ve el sobre que haya (el de CSS si no hay en-3d)
  function decidir() {
    decidido = true;
    window.sobre3dEsperando = false;
    var capa = document.getElementById('sobre');
    if (capa) capa.className = capa.className.replace(/\s*\besperando\b/g, '');
  }

  function apagar(e) {
    if (window.console) console.warn('Sobre 3D apagado:', e);
    window.sobre3d = null;
    var f = alApagar;
    alApagar = null;
    if (f) { try { f(); } catch (e2) { /* ya no queda nada que salvar */ } }
    decidir();
  }
  function seguro(fn) {
    return function () {
      try { return fn.apply(this, arguments); } catch (e) { apagar(e); }
    };
  }

  var guion = document.createElement('script');
  guion.src = URL_THREE;
  guion.async = true;
  guion.onload = function () {
    // tarde: o ya se dejó el de CSS, o el invitado ya abrió con el teclado
    if (decidido || !window.THREE || window.sobreAbriendo || window.sobreAbierto) { decidir(); return; }
    T = window.THREE;
    try { montar(); } catch (e) { apagar(e); }
    decidir();
  };
  guion.onerror = decidir;
  document.head.appendChild(guion);
  setTimeout(function () { if (!decidido) decidir(); }, ESPERA);

  function montar() {
    var capa = document.getElementById('sobre');
    var lienzo = document.getElementById('sobre-lienzo');
    if (!capa || !lienzo) return;

    var sinMovimiento = !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* ---------- colores de los tokens ---------- */

    var muestra = document.createElement('span');
    muestra.style.display = 'none';
    document.body.appendChild(muestra);

    // [r, g, b] de 0 a 255, venga el color como venga escrito en la hoja
    function rgb(token) {
      muestra.style.color = '';
      muestra.style.color = 'var(' + token + ')';
      var c = getComputedStyle(muestra).color || '';
      var n = c.match(/[\d.]+/g) || [0, 0, 0];
      var f = c.indexOf('color(') === 0 ? 255 : 1;   // color(srgb 0.9 0.8 …)
      return [Math.round(n[0] * f), Math.round(n[1] * f), Math.round(n[2] * f)];
    }
    function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
    function color3(c) { return new T.Color('rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'); }

    var C = {
      tinta:   rgb('--tinta'),
      hueco:   rgb('--hueco'),
      papel:   rgb('--papel'),
      carta:   rgb('--sobre-carta'),
      frente:  rgb('--sobre-frente'),
      lado:    rgb('--sobre-lado'),
      solAlta: rgb('--solapa-alta'),
      solBaja: rgb('--solapa-baja'),
      salvia:  rgb('--salvia'),
      azul:    rgb('--azul'),
      terra:   rgb('--terracota'),
      verde:   rgb('--verde-oscuro'),
      ocre:    rgb('--ocre')
    };
    var letraNombre = getComputedStyle(document.documentElement)
      .getPropertyValue('--letra-nombre').trim() || 'serif';
    document.body.removeChild(muestra);

    /* ---------- el motor ---------- */

    var render = new T.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
    render.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    render.outputColorSpace = T.SRGBColorSpace;
    render.shadowMap.enabled = true;
    render.shadowMap.type = T.PCFShadowMap;
    render.setClearColor(0x000000, 0);
    var aniso = Math.min(8, render.capabilities.getMaxAnisotropy());

    var escena = new T.Scene();
    var camara = new T.PerspectiveCamera(28, 1, 0.05, 60);
    var TAN = Math.tan(T.MathUtils.degToRad(28 / 2));

    /* Luz de taller: un cielo blanco que lo baña todo y un foco de arriba a la
       izquierda que deja las sombras de una solapa sobre la otra. Con las
       luces físicas de Three, la intensidad va multiplicada por π para que el
       papel salga del color del token y no más claro ni más oscuro. */
    var cielo = new T.HemisphereLight(new T.Color(1, 1, 1), new T.Color(0.86, 0.85, 0.82), 0.62 * Math.PI);
    escena.add(cielo);
    // alto y por delante: así cada solapa deja caer una sombra blanda sobre la de debajo
    var foco = new T.DirectionalLight(new T.Color(1, 0.98, 0.95), 0.8 * Math.PI);
    foco.position.set(-1.2, 4.5, 2.2);
    foco.castShadow = true;
    foco.shadow.mapSize.set(2048, 2048);
    foco.shadow.radius = 6;
    foco.shadow.bias = -0.0004;
    foco.shadow.normalBias = 0.015;
    var sc = foco.shadow.camera;
    sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sc.near = 0.5; sc.far = 15;
    escena.add(foco);
    escena.add(foco.target);

    /* Un reflejo de estudio para el brillo de la cera del lacre: sin nada que
       reflejar, se ve mate. Cajas blancas que hacen de ventanas, pasadas por PMREM. */
    var pmrem = new T.PMREMGenerator(render);
    var estudio = new T.Scene();
    var gris = new T.MeshBasicMaterial({ color: new T.Color(0.62, 0.6, 0.56), side: T.BackSide });
    estudio.add(new T.Mesh(new T.BoxGeometry(10, 10, 10), gris));
    function ventana(x, y, z, w, h, luz) {
      var m = new T.Mesh(new T.PlaneGeometry(w, h),
        new T.MeshBasicMaterial({ color: new T.Color(luz, luz, luz), side: T.DoubleSide }));
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      estudio.add(m);
    }
    ventana(-3, 3, 4, 4, 2, 6);
    ventana(3.5, 1, 3, 1.5, 4, 3);
    ventana(0, -4, 2, 6, 1, 1.5);
    ventana(0, 4.5, -1, 5, 2, 2.5);
    var reflejo = pmrem.fromScene(estudio, 0.035).texture;

    /* ---------- texturas pintadas a mano (en canvas) ---------- */

    function azar(semilla) {   // mulberry32: el mismo papel en cada visita
      var a = semilla >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    // El grano del papel, una vez, para todas las piezas
    var grano = document.createElement('canvas');
    grano.width = grano.height = 256;
    (function () {
      var g = grano.getContext('2d');
      var img = g.createImageData(256, 256);
      var r = azar(11);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = r() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    })();

    function lienzo2d(w, h) {
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      return c;
    }

    // Una mancha de acuarela: borde irregular, centro aguado y el filo un
    // punto más oscuro, que es donde el agua deja el pigmento al secar.
    function mancha(g, r, x, y, radio, col, alfa) {
      var n = 28, fase = r() * 6.28, fase2 = r() * 6.28, i;
      g.beginPath();
      for (i = 0; i <= n; i++) {
        var a = i / n * Math.PI * 2;
        var rr = radio * (1 + 0.16 * Math.sin(a * 3 + fase) + 0.08 * Math.sin(a * 7 + fase2) + (r() - 0.5) * 0.08);
        var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.85;
        if (i) g.lineTo(px, py); else g.moveTo(px, py);
      }
      g.closePath();
      var grad = g.createRadialGradient(x, y, 0, x, y, radio * 1.1);
      grad.addColorStop(0, rgba(col, alfa * 0.55));
      grad.addColorStop(0.75, rgba(col, alfa * 0.8));
      grad.addColorStop(1, rgba(col, alfa));
      g.fillStyle = grad;
      g.fill();
      g.lineWidth = Math.max(1, radio * 0.025);
      g.strokeStyle = rgba(col, Math.min(1, alfa * 1.3));
      g.stroke();
    }

    function ponerGrano(g, w, h, alfa) {
      g.save();
      g.globalAlpha = alfa;
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = g.createPattern(grano, 'repeat');
      g.fillRect(0, 0, w, h);
      g.restore();
    }

    /* Papel del sobre: el color del token, un lavado de verde gris como el
       del vídeo, más hondo hacia donde se indique, y una veta de luz. */
    function pintarPapel(c, base, semilla, hondo) {
      var g = c.getContext('2d'), w = c.width, h = c.height, r = azar(semilla), i;
      g.fillStyle = rgba(base, 1);
      g.fillRect(0, 0, w, h);
      for (i = 0; i < 16; i++) {
        mancha(g, r, r() * w, r() * h, w * (0.08 + r() * 0.22),
          r() < 0.7 ? C.salvia : C.hueco, 0.05 + r() * 0.07);
      }
      if (hondo) {
        var gr = g.createLinearGradient(hondo[0] * w, hondo[1] * h, hondo[2] * w, hondo[3] * h);
        gr.addColorStop(0, rgba(C.tinta, 0));
        gr.addColorStop(1, rgba(C.tinta, 0.07));
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
      }
      var veta = g.createLinearGradient(0, 0, w, h);
      veta.addColorStop(0.30, 'rgba(255,255,255,0)');
      veta.addColorStop(0.42, 'rgba(255,255,255,.22)');
      veta.addColorStop(0.50, 'rgba(255,255,255,0)');
      g.fillStyle = veta;
      g.fillRect(0, 0, w, h);
      ponerGrano(g, w, h, 0.06);
    }

    function textura(c) {
      var t = new T.CanvasTexture(c);
      t.colorSpace = T.SRGBColorSpace;
      t.anisotropy = aniso;
      return t;
    }

    /* ---------- las piezas ---------- */

    var W = 2, H = 1.36;          // el sobre, en unidades de la escena
    var TW = 1024, TH = Math.round(TW * H / W);

    /* Un polígono con las esquinas redondeadas y los cantos un poco abombados,
       que el papel doblado no hace aristas de regla. Los puntos van en sentido
       antihorario; `bulto` empuja cada canto hacia fuera. */
    function forma(puntos, radios, bultos) {
      var n = puntos.length, s = new T.Shape(), i;
      function hacia(a, b, d) {
        var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
        return [a[0] + dx / l * d, a[1] + dy / l * d];
      }
      var entra = [], sale = [];
      for (i = 0; i < n; i++) {
        var p = puntos[i], ant = puntos[(i + n - 1) % n], sig = puntos[(i + 1) % n];
        entra.push(hacia(p, ant, radios[i]));
        sale.push(hacia(p, sig, radios[i]));
      }
      s.moveTo(sale[0][0], sale[0][1]);
      for (i = 0; i < n; i++) {
        var j = (i + 1) % n, a = sale[i], b = entra[j];
        var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
        var k = bultos[i] * l;
        s.quadraticCurveTo((a[0] + b[0]) / 2 + dy / l * k, (a[1] + b[1]) / 2 - dx / l * k, b[0], b[1]);
        s.quadraticCurveTo(puntos[j][0], puntos[j][1], sale[j][0], sale[j][1]);
      }
      return s;
    }

    // Las uv salen de la posición en el sobre: todas las piezas comparten encuadre
    function geometria(shape, desplazY) {
      var geo = new T.ShapeGeometry(shape, 24);
      var pos = geo.attributes.position, uv = geo.attributes.uv;
      for (var i = 0; i < pos.count; i++) {
        uv.setXY(i, (pos.getX(i) + W / 2) / W, (pos.getY(i) + desplazY + H / 2) / H);
      }
      return geo;
    }

    function papel(mapa) {
      // shadowSide: un plano de cara a la luz no echaría sombra con la de serie
      return new T.MeshStandardMaterial({ map: mapa, roughness: 0.92, metalness: 0, shadowSide: T.DoubleSide });
    }
    function pieza(geo, mat, z) {
      var m = new T.Mesh(geo, mat);
      m.position.z = z;
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }

    var sobre = new T.Group();
    escena.add(sobre);

    // Fondo por dentro
    var cFondo = lienzo2d(TW, TH);
    pintarPapel(cFondo, C.hueco, 3, [0.5, 0, 0.5, 1]);
    var fondo = pieza(new T.PlaneGeometry(W, H), papel(textura(cFondo)), 0);
    sobre.add(fondo);

    /* La carta: un pliego doblado en tres, como una carta de verdad. Por fuera
       es papel liso. Por dentro es la presentación —el papel y la acuarela del
       convento, desvanecida por los bordes como en css/presentacion.css— y
       tiene la proporción de la columna de la invitación (la pantalla en el
       móvil, el marco en el escritorio). Así, desplegada y a pantalla llena,
       la carta es el fondo de la presentación, y la capa se funde con la
       página sin que se note el cambio. */
    var imgPresenta = new Image();
    var carta = new T.Group();
    carta.position.z = 0.012;
    sobre.add(carta);
    var hojaW = 1.8, hojaH = 2.7, tercio = 0.9;
    var pliegueArriba = null, pliegueAbajo = null;
    var cDentroCarta = null, texDentro = null;

    var cFueraCarta = lienzo2d(512, 512);
    (function () {
      var g = cFueraCarta.getContext('2d');
      g.fillStyle = rgba(C.carta, 1);
      g.fillRect(0, 0, 512, 512);
      ponerGrano(g, 512, 512, 0.05);
    })();
    var matFuera = new T.MeshStandardMaterial({ map: textura(cFueraCarta), roughness: 0.9, shadowSide: T.DoubleSide });
    /* Por dentro, mientras la carta se mueve, el papel recibe la luz y las
       sombras de la escena; al acabar de desplegarse pasa a verse tal cual es
       la textura, sin luz encima (color a cero, la imagen como emisiva), que
       es exactamente como pinta el navegador la presentación de debajo. */
    var matDentro = new T.MeshStandardMaterial({
      roughness: 0.9, shadowSide: T.DoubleSide, emissive: new T.Color(1, 1, 1), emissiveIntensity: 0 });
    function luzDentro(plano) {
      matDentro.color.setScalar(1 - plano);
      matDentro.emissiveIntensity = plano;
    }

    /* Lo que hay detrás de la capa, medido: la columna de la invitación (la
       pantalla en el móvil, el marco en el escritorio) y la caja de la
       presentación, que no tiene por qué empezar en el borde de arriba ni
       acabar en el de abajo. La carta desplegada ocupa la columna de arriba
       abajo y por dentro lleva pintado lo que el navegador va a enseñar ahí,
       menos el texto, que entra con el fundido. Si la invitación aún no se
       ha pintado (el servidor no ha contestado), se supone la presentación a
       pantalla llena. */
    function opaco(c) { return !!c && c !== 'transparent' && !/,\s*0\)$/.test(c); }
    function medir() {
      var vw = capa.clientWidth || window.innerWidth;
      var vh = capa.clientHeight || window.innerHeight;
      var app = document.getElementById('app');
      var a = app && app.getBoundingClientRect();
      var m = { vw: vw, vh: vh, l: 0, w: vw, papel: rgba(C.papel, 1), debajo: rgba(C.papel, 1) };
      if (a && a.width) { m.l = a.left; m.w = a.width; }
      m.sl = m.l; m.sw = m.w; m.st = 0; m.sh = vh;
      var p = document.getElementById('presentacion');
      var r = p && p.getBoundingClientRect();
      if (r && r.width && r.height) {
        m.sl = r.left; m.sw = r.width; m.st = r.top; m.sh = r.height;
        var fs = getComputedStyle(p).backgroundColor;
        if (opaco(fs)) m.papel = fs;
        var sig = p.nextElementSibling;
        while (sig && sig.hidden) sig = sig.nextElementSibling;
        var fd = sig && getComputedStyle(sig).backgroundColor;
        if (opaco(fd)) m.debajo = fd;
      }
      return m;
    }
    var medida = null;

    function pintarDentro() {
      var m = medida, g = cDentroCarta.getContext('2d');
      var w = cDentroCarta.width, h = cDentroCarta.height, k = w / m.w;
      // lo que asoma por debajo de la presentación, si asoma algo
      g.fillStyle = m.debajo;
      g.fillRect(0, 0, w, h);
      // la caja de la presentación, en las coordenadas de la carta
      var sx = (m.sl - m.l) * k, sy = m.st * k, sw = Math.round(m.sw * k), sh = Math.round(m.sh * k);
      g.fillStyle = m.papel;
      g.fillRect(sx, sy, sw, sh);
      if (imgPresenta.complete && imgPresenta.naturalWidth && sw > 0 && sh > 0) {
        // `cover` anclado abajo y las dos máscaras de #presentacion::before
        var tmp = lienzo2d(sw, sh), tg = tmp.getContext('2d');
        var e = Math.max(sw / imgPresenta.naturalWidth, sh / imgPresenta.naturalHeight);
        var iw = imgPresenta.naturalWidth * e, ih = imgPresenta.naturalHeight * e;
        tg.drawImage(imgPresenta, (sw - iw) / 2, sh - ih, iw, ih);
        tg.globalCompositeOperation = 'destination-in';
        var mv = tg.createLinearGradient(0, 0, 0, sh);
        mv.addColorStop(0, 'rgba(0,0,0,0)'); mv.addColorStop(0.22, 'rgba(0,0,0,1)');
        mv.addColorStop(0.9, 'rgba(0,0,0,1)'); mv.addColorStop(1, 'rgba(0,0,0,0)');
        tg.fillStyle = mv;
        tg.fillRect(0, 0, sw, sh);
        var mh = tg.createLinearGradient(0, 0, sw, 0);
        mh.addColorStop(0, 'rgba(0,0,0,0)'); mh.addColorStop(0.05, 'rgba(0,0,0,1)');
        mh.addColorStop(0.95, 'rgba(0,0,0,1)'); mh.addColorStop(1, 'rgba(0,0,0,0)');
        tg.fillStyle = mh;
        tg.fillRect(0, 0, sw, sh);
        g.drawImage(tmp, sx, sy);
      }
      pintarTextos(g, m, k);
      if (texDentro) texDentro.needsUpdate = true;
    }

    /* El texto de la presentación, letra a letra donde el navegador lo ha
       puesto: se le pregunta a cada carácter su caja y se escribe ahí con la
       letra, el color y el halo que tiene en la página. Así la carta lleva ya
       escritos los nombres, la fecha y el sitio, y al fundirse con la página
       no aparece nada nuevo. */
    function sombras(css) {
      var lista = [], re = /((?:rgba?|color|hsla?)\([^)]*\)|#[0-9a-f]+|[a-z]+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+([\d.]+)px)?/gi, x;
      if (!css || css === 'none') return lista;
      while ((x = re.exec(css))) lista.push({ c: x[1], x: +x[2], y: +x[3], b: +(x[4] || 0) });
      return lista;
    }
    function pintarTextos(g, m, k) {
      var p = document.getElementById('presentacion');
      if (!p || !document.createRange || !document.createTreeWalker) return;
      var andar = document.createTreeWalker(p, 4 /* NodeFilter.SHOW_TEXT */, null, false);
      var rango = document.createRange(), nodo, i;
      g.save();
      g.setTransform(k, 0, 0, k, -m.l * k, 0);
      g.textBaseline = 'alphabetic';
      while ((nodo = andar.nextNode())) {
        var txt = nodo.nodeValue;
        if (!/\S/.test(txt)) continue;
        var el = nodo.parentNode, cs = getComputedStyle(el);
        if (cs.visibility !== 'visible' || cs.display === 'none') continue;
        var alfa = 1, e;
        for (e = el; e && e !== p.parentNode; e = e.parentNode) alfa *= +getComputedStyle(e).opacity;
        if (alfa <= 0) continue;
        g.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        g.fillStyle = cs.color;
        g.globalAlpha = alfa;
        var mayus = cs.textTransform === 'uppercase';
        var halos = sombras(cs.textShadow);
        for (i = 0; i < txt.length; i++) {
          var ch = txt.charAt(i);
          if (/\s/.test(ch)) continue;
          rango.setStart(nodo, i);
          rango.setEnd(nodo, i + 1);
          var r = rango.getClientRects()[0];
          if (!r || !r.width) continue;
          if (mayus) ch = ch.toUpperCase();
          var mt = g.measureText(ch), asc = mt.fontBoundingBoxAscent, des = mt.fontBoundingBoxDescent;
          var base = asc != null && asc + des > 0 ? r.top + asc * r.height / (asc + des) : r.bottom - r.height * 0.22;
          for (var h = 0; h < halos.length; h++) {
            g.shadowColor = halos[h].c;
            g.shadowOffsetX = halos[h].x * k;
            g.shadowOffsetY = halos[h].y * k;
            g.shadowBlur = halos[h].b * k;
            g.fillText(ch, r.left, base);
          }
          g.shadowColor = 'rgba(0,0,0,0)';
          g.fillText(ch, r.left, base);
        }
        // el subrayado de los enlaces, que es un borde de abajo
        var bw = parseFloat(cs.borderBottomWidth) || 0;
        if (bw && cs.borderBottomStyle !== 'none' && el.firstChild === nodo) {
          var cajas = el.getClientRects();
          g.fillStyle = cs.borderBottomColor;
          for (i = 0; i < cajas.length; i++) g.fillRect(cajas[i].left, cajas[i].bottom - bw, cajas[i].width, bw);
        }
      }
      g.restore();
    }
    imgPresenta.onload = seguro(function () {
      if (!cDentroCarta) return;
      pintarDentro();
      if (!corriendo) pintar();
    });
    imgPresenta.src = 'img/presentacion.webp';

    // un tercio del pliego: la cara de dentro con su franja de la presentación
    // y, de espaldas, la de fuera
    function panel(v0) {
      var p = new T.Group();
      var gd = new T.PlaneGeometry(hojaW, tercio), uv = gd.attributes.uv, i;
      for (i = 0; i < uv.count; i++) uv.setY(i, v0 + uv.getY(i) / 3);
      var dentro = new T.Mesh(gd, matDentro);
      var fuera = new T.Mesh(new T.PlaneGeometry(hojaW, tercio), matFuera);
      fuera.rotation.y = Math.PI;
      fuera.position.z = -0.001;
      dentro.castShadow = dentro.receiveShadow = true;
      fuera.castShadow = fuera.receiveShadow = true;
      p.add(dentro);
      p.add(fuera);
      return p;
    }

    /* Se monta según la pantalla, y se vuelve a montar si cambia mientras el
       sobre está cerrado. Doblada tiene que caber en el sobre: si la columna
       es muy alta, el pliego se estrecha. */
    function construirCarta() {
      carta.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
      while (carta.children.length) carta.remove(carta.children[0]);
      medida = medir();
      var A = Math.max(0.3, Math.min(1.3, medida.w / medida.vh));
      hojaW = Math.min(1.8, 3 * A * 1.12);
      hojaH = hojaW / A;
      tercio = hojaH / 3;

      if (texDentro) texDentro.dispose();
      // a la resolución de la pantalla, para que a tamaño final se vea igual de nítida
      var k = Math.min(window.devicePixelRatio || 1, 2, 4096 / medida.vh, 4096 / medida.w);
      cDentroCarta = lienzo2d(Math.round(medida.w * k), Math.round(medida.vh * k));
      texDentro = textura(cDentroCarta);
      pintarDentro();
      matDentro.map = texDentro;
      matDentro.emissiveMap = texDentro;
      matDentro.needsUpdate = true;

      carta.add(panel(1 / 3));
      pliegueArriba = new T.Group();
      var pa = panel(2 / 3);
      pa.position.y = tercio / 2;
      pliegueArriba.add(pa);
      carta.add(pliegueArriba);
      pliegueAbajo = new T.Group();
      var pb = panel(0);
      pb.position.y = -tercio / 2;
      pliegueAbajo.add(pb);
      carta.add(pliegueAbajo);
      plegar(1, 1);
    }

    // 1 es doblado del todo y 0 abierto. La de arriba va encima de la de abajo,
    // como se dobla una carta; abiertas, las tres quedan en el mismo plano.
    function plegar(arriba, abajo) {
      // Dobladas del todo quedan planas, una sobre otra, a un pelo de
      // distancia: si se quedan un grado abiertas, la punta sale por delante
      // de las solapas del sobre y la carta se transparenta a través de él.
      pliegueArriba.rotation.x = Math.PI * arriba;
      pliegueArriba.position.set(0, tercio / 2, 0.004 * arriba);
      pliegueAbajo.rotation.x = -Math.PI * abajo;
      pliegueAbajo.position.set(0, -tercio / 2, 0.002 * abajo);
    }

    construirCarta();

    // Las orejas, a los lados
    var cIzq = lienzo2d(TW, TH), cDer = lienzo2d(TW, TH);
    pintarPapel(cIzq, C.lado, 5, [0.5, 0.5, 0, 0.5]);
    pintarPapel(cDer, C.lado, 6, [0.5, 0.5, 1, 0.5]);
    var izq = pieza(geometria(forma(
      [[-W / 2, H / 2], [-W / 2, -H / 2], [-0.04, -0.02]], [0.015, 0.015, 0.09], [0, 0.025, 0.025]), 0),
      papel(textura(cIzq)), 0.03);
    var der = pieza(geometria(forma(
      [[W / 2, -H / 2], [W / 2, H / 2], [0.04, -0.02]], [0.015, 0.015, 0.09], [0, 0.025, 0.025]), 0),
      papel(textura(cDer)), 0.03);
    sobre.add(izq);
    sobre.add(der);

    // El bolsillo de abajo
    var cAbajo = lienzo2d(TW, TH);
    pintarPapel(cAbajo, C.frente, 7, [0.5, 0.4, 0.5, 1]);
    var abajo = pieza(geometria(forma(
      [[-W / 2, -H / 2], [W / 2, -H / 2], [0, 0.02]], [0.015, 0.015, 0.14], [0, 0.03, 0.03]), 0),
      papel(textura(cAbajo)), 0.05);
    sobre.add(abajo);

    /* El nombre del invitado va en una capa suya, pegada al bolsillo, y no
       pintado en el papel: así llega fundiéndose, sin repintar ni volver a
       subir la textura entera del bolsillo (que era el tirón que se notaba), y
       se escribe una sola vez, ya con su letra. */
    var NW = 1024, NH = 192;
    var cNombre = lienzo2d(NW, NH);
    var texNombre = textura(cNombre);
    var matNombre = new T.MeshStandardMaterial({
      map: texNombre, roughness: 0.9, transparent: true, opacity: 0, depthWrite: false });
    var anchoNombre = W * 0.72;
    var capaNombre = new T.Mesh(new T.PlaneGeometry(anchoNombre, anchoNombre * NH / NW), matNombre);
    capaNombre.position.set(0, H / 2 - H * 0.8, 0.002);
    abajo.add(capaNombre);
    var nombre = '', nombreDesde = 0;

    function escribirNombre() {
      var g = cNombre.getContext('2d'), tam = NH * 0.55;
      g.clearRect(0, 0, NW, NH);
      g.fillStyle = rgba(C.tinta, 0.92);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      do {
        g.font = 'italic 300 ' + tam + 'px ' + letraNombre;
        tam *= 0.94;
      } while (g.measureText(nombre).width > NW * 0.94 && tam > NH * 0.2);
      g.fillText(nombre, NW / 2, NH / 2);
      texNombre.needsUpdate = true;
    }

    /* Espera a que la letra haya bajado, para no escribir con la de reserva y
       cambiarla luego delante del invitado. Si tarda más de un segundo y
       medio, escribe con lo que haya. */
    function conLetra(hecho) {
      var listo = false;
      function una() { if (!listo) { listo = true; hecho(); } }
      if (!document.fonts || !document.fonts.load) { una(); return; }
      document.fonts.load('italic 300 40px ' + letraNombre).then(una, una);
      setTimeout(una, 1500);
    }

    /* La solapa: gira sobre el canto de arriba. Por fuera y por dentro son dos
       caras distintas; el lacre va cosido a la de fuera, en la punta. */
    var L = H * 0.6;
    var cSolapa = lienzo2d(TW, TH), cDentro = lienzo2d(TW, TH);
    pintarPapel(cSolapa, C.solBaja, 8, [0.5, 0, 0.5, 0.6]);
    pintarPapel(cDentro, C.solAlta, 9, null);
    var geoSolapa = geometria(forma(
      [[-W / 2, 0], [0, -L], [W / 2, 0]], [0.015, 0.11, 0.015], [0.028, 0.028, 0]), H / 2);
    var bisagra = new T.Group();
    bisagra.position.set(0, H / 2, 0.07);
    var solapaFuera = new T.Mesh(geoSolapa, papel(textura(cSolapa)));
    var solapaDentro = new T.Mesh(geoSolapa, new T.MeshStandardMaterial({
      map: textura(cDentro), roughness: 0.92, side: T.BackSide, shadowSide: T.DoubleSide }));
    solapaFuera.castShadow = solapaFuera.receiveShadow = true;
    solapaDentro.castShadow = solapaDentro.receiveShadow = true;
    bisagra.add(solapaFuera);
    bisagra.add(solapaDentro);
    sobre.add(bisagra);

    /* El lacre: el mismo sello del favicon (img/lacre.webp, recortado de
       originales/iconos/favicon/stamp/stamp.png), con las iniciales y las
       ramitas. La cara es la foto del sello; debajo va una galleta de cera
       del mismo color, con su grosor, que es la que se ve de canto cuando la
       solapa gira. El color de la cera se saca de la propia foto. */
    var lacre = new T.Group();
    var R = 0.19, ondas = 9, borde = new T.Shape(), i;
    for (i = 0; i <= 180; i++) {
      var ang = i / 180 * Math.PI * 2, rr = R * 0.9 * (1 + 0.035 * Math.cos(ondas * ang + 0.4));
      if (i) borde.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
      else borde.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    var cera = new T.MeshStandardMaterial({ color: color3(C.ocre),
      roughness: 0.45, metalness: 0, envMap: reflejo, envMapIntensity: 0.5, visible: false });
    var galleta = new T.Mesh(new T.ExtrudeGeometry(borde, {
      depth: 0.012, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01,
      bevelSegments: 5, curveSegments: 8 }), cera);
    galleta.castShadow = true;
    lacre.add(galleta);

    var imgLacre = new Image();
    var texLacre = new T.Texture(imgLacre);
    texLacre.colorSpace = T.SRGBColorSpace;
    texLacre.anisotropy = aniso;
    var caraLacre = new T.MeshStandardMaterial({
      map: texLacre, bumpMap: texLacre, bumpScale: 0.6, alphaTest: 0.5,
      roughness: 0.4, metalness: 0, envMap: reflejo, envMapIntensity: 0.35, visible: false });
    var cara = new T.Mesh(new T.PlaneGeometry(R * 2.08, R * 2.08), caraLacre);
    cara.position.z = 0.012 + 0.01 + 0.001;   // la cara de delante de la galleta
    cara.castShadow = true;
    lacre.add(cara);

    imgLacre.onload = seguro(function () {
      texLacre.needsUpdate = true;
      // la cera, del color medio del sello y un punto más oscura, que es canto
      var m = lienzo2d(32, 32), g = m.getContext('2d');
      g.drawImage(imgLacre, 0, 0, 32, 32);
      /* Con la página abierta desde el disco, Chrome da la foto por ajena y
         no deja leerla: la cera se queda en ocre. */
      var d = [], suma = [0, 0, 0], n = 0, j;
      try { d = g.getImageData(0, 0, 32, 32).data; } catch (e) { /* ocre */ }
      for (j = 0; j < d.length; j += 4) {
        if (d[j + 3] < 200) continue;
        suma[0] += d[j]; suma[1] += d[j + 1]; suma[2] += d[j + 2]; n++;
      }
      if (n) cera.color = color3([suma[0] / n * 0.8 | 0, suma[1] / n * 0.8 | 0, suma[2] / n * 0.8 | 0]);
      cera.visible = caraLacre.visible = true;
      if (!corriendo) pintar();
    });
    imgLacre.src = 'img/lacre.webp';

    // separado lo justo para que, con la solapa dada la vuelta, el canto de
    // atrás de la galleta no asome por la cara de dentro
    lacre.position.set(0, -L + 0.1, 0.012);
    bisagra.add(lacre);

    /* ---------- encuadre ---------- */

    var ancho = 1, alto = 1, aspecto = 1, distReposo = 6;
    function encuadrar() {
      ancho = capa.clientWidth || window.innerWidth;
      alto = capa.clientHeight || window.innerHeight;
      aspecto = ancho / alto;
      render.setSize(ancho, alto, false);
      camara.aspect = aspecto;
      camara.updateProjectionMatrix();
      // el sobre ocupa como mucho el 80 % del ancho y el 42 % del alto
      distReposo = Math.max(W / (0.8 * 2 * TAN * aspecto), H / (0.42 * 2 * TAN));
    }
    encuadrar();
    /* Solo mientras el sobre está delante: con él ya fuera, cada cambio de
       tamaño —en el móvil, cada vez que la barra del navegador se esconde al
       desplazar— volvería a pintar la escena entera en un lienzo que nadie ve. */
    var alRedimensionar = seguro(function () {
      encuadrar();
      if (estado === 'reposo' && pliegueArriba) construirCarta();
      if (!corriendo) pintar();
    });
    window.addEventListener('resize', alRedimensionar);

    /* ---------- la coreografía ---------- */

    function tramo(t, a, b) { return t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a); }
    function suave(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    function sale(x) { return 1 - Math.pow(1 - x, 3); }

    var estado = 'reposo', t0 = 0, tAbre = 0, corriendo = false;
    var quieto = 0, tAntes = 0;
    var arrastre = null, pSuelta = 0, tSuelta = 0;   // el dedo sobre el sello
    var p0 = 0, tSolapa = 1.3;                     // desde dónde sigue la solapa
    var alFundir = null, alTerminar = null, alDesplegar = null, fundido = false, desplegado = false;
    var dCerca = 1;           // a qué distancia la carta abierta llena el alto
    var dxColumna = 0;        // cuánto se corre la columna del centro, en unidades

    function colocar(ahora) {
      var t = (ahora - t0) / 1000;

      // reposo: el sobre entra desde abajo y flota, girando un pelo para que
      // el brillo de la cera del lacre se mueva con la luz
      var flota = sinMovimiento ? 0 : 1;
      matNombre.opacity = !nombreDesde ? 0 : sinMovimiento ? 1 : sale(tramo(ahora - nombreDesde, 0, 700));
      var u = estado === 'abriendo' ? (ahora - tAbre) / 1000 : -1;

      // Quieto mientras se arrastra el sello o se abre: el sobre deja de
      // flotar para que el lacre no se escape de debajo del dedo.
      var dt = Math.min(0.1, Math.max(0, (ahora - tAntes) / 1000));
      tAntes = ahora;
      var quiere = estado === 'reposo' && !arrastre ? 0 : 1;
      quieto += (quiere - quieto) * Math.min(1, dt * 7);
      var calma = 1 - quieto;
      var llega = sale(tramo(t, 0, 1.1));
      sobre.position.y = (-0.25 * (1 - llega) + Math.sin(t * 0.9) * 0.018 * flota) * calma;
      sobre.rotation.x = Math.sin(t * 0.7) * 0.06 * flota * calma;
      sobre.rotation.y = Math.sin(t * 0.5 + 1) * 0.09 * flota * calma;

      camara.position.set(0, 0, distReposo);
      camara.lookAt(0, 0, 0);

      if (u < 0) {
        /* Cerrado. La solapa va donde la lleve el dedo; si se suelta antes
           de tiempo vuelve a su sitio, y si nadie la toca se levanta un pelo
           de vez en cuando para decir que se puede. */
        var pS;
        if (arrastre) pS = arrastre.p;
        else if (tSuelta) pS = pSuelta * (1 - sale(tramo(ahora - tSuelta, 0, 380)));
        else {
          var ciclo = (t - 2.2) % 4.6;
          pS = t > 2.2 && flota ? 0.07 * Math.sin(Math.PI * tramo(ciclo, 0, 0.9)) : 0;
        }
        bisagra.rotation.x = -Math.PI * pS;
        bisagra.position.z = pS < 0.5 ? 0.07 : -0.03;
        lacre.scale.setScalar(arrastre ? 1.05 : 1);
        return;
      }

      // 1. el lacre da un respingo (solo si se abre sin arrastrar: teclado)
      var e = p0 ? 0 : Math.sin(Math.PI * tramo(u, 0, 0.35));
      lacre.scale.setScalar(1 + 0.08 * e);

      // 2. la solapa acaba de levantarse desde donde la dejó el dedo; al
      //    ponerse de canto se pasa detrás de la carta. Lo que viene después
      //    se adelanta lo que se haya ahorrado la solapa.
      var a = p0 + (1 - p0) * suave(tramo(u, 0, tSolapa));
      // Abierta del todo queda plana y por detrás: si se queda un poco
      // levantada, la punta sale por delante de la carta que sube.
      bisagra.rotation.x = -Math.PI * a;
      bisagra.position.z = a < 0.5 ? 0.07 : -0.03;
      var v = u + 1.3 - tSolapa;

      // 3. la carta sale del sobre, doblada, hasta quedar entera por encima
      var c = suave(tramo(v, 0.95, 2.0));
      var arribaY = H / 2 + tercio / 2 + 0.08;
      var cy = -0.02 + (arribaY + 0.02) * c;

      // 4. el sobre, entero, se retira despacio hacia abajo, y la carta se
      //    pone en medio y un poco por delante
      var d = suave(tramo(v, 1.9, 3.2));
      var baja = -4 * d;
      fondo.position.y = izq.position.y = der.position.y = abajo.position.y = baja;
      bisagra.position.y = H / 2 + baja;
      cy += (0 - cy) * d;
      carta.position.y = cy;
      carta.position.z = 0.012 + 0.15 * d;

      // 5. la carta se despliega: primero la hoja de arriba, luego la de abajo
      plegar(1 - suave(tramo(v, 2.45, 3.3)), 1 - suave(tramo(v, 2.8, 3.7)));

      // la cámara sigue a la carta y se acerca hasta que la carta abierta mide
      // justo el alto de la pantalla: es la presentación
      var f = suave(tramo(v, 2.0, 3.8));
      var mira = cy * (1 - f) * 0.6;
      // si la columna no está en medio exacto de la capa, la cámara se corre
      // lo justo para que la carta caiga encima de ella
      var mx = -dxColumna * f;
      camara.position.set(mx, mira, distReposo + (dCerca - distReposo) * f);
      camara.lookAt(mx, mira, 0);

      // ya desplegada y quieta: fuera la luz de la escena, la imagen tal cual
      luzDentro(suave(tramo(v, 3.1, 3.8)));

      if (!desplegado && v >= 2.45) { desplegado = true; if (alDesplegar) alDesplegar(); }
      if (!fundido && v >= 3.85) { fundido = true; if (alFundir) alFundir(); }
      if (v >= 4.1 && estado === 'abriendo') {
        estado = 'fuera';
        if (alTerminar) alTerminar();
      }
    }

    function pintar() {
      colocar(performance.now());
      render.render(escena, camara);
    }

    var bucle = seguro(function () {
      if (!corriendo) return;
      pintar();
      if (estado === 'fuera') { corriendo = false; return; }
      requestAnimationFrame(bucle);
    });

    /* La capa ya no está (lo avisa js/sobre.js al quitarla, se haya abierto
       con el 3D o sin él): fuera el oído al tamaño de la ventana y fuera la
       escena de la tarjeta gráfica. En ?lab se queda montada, que el
       laboratorio puede volver a cerrar el sobre. */
    function retirarse() {
      estado = 'fuera';
      corriendo = false;
      window.removeEventListener('resize', alRedimensionar);
      if (!enLaboratorio) liberar();
    }
    function liberar() {
      alApagar = null;
      window.sobre3d = null;
      escena.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        var mats = o.material ? [].concat(o.material) : [];
        for (var j = 0; j < mats.length; j++) {
          for (var k in mats[j]) {
            if (mats[j][k] && mats[j][k].isTexture) mats[j][k].dispose();
          }
          mats[j].dispose();
        }
      });
      reflejo.dispose();
      pmrem.dispose();
      render.dispose();
      render.forceContextLoss();
    }

    function arrancar() {
      if (corriendo) return;
      corriendo = true;
      requestAnimationFrame(bucle);
    }

    function reponerPiezas() {
      lacre.scale.setScalar(1);
      bisagra.rotation.x = 0;
      bisagra.position.set(0, H / 2, 0.07);
      carta.position.set(0, -0.02, 0.012);
      plegar(1, 1);
      luzDentro(0);
      fondo.position.y = izq.position.y = der.position.y = abajo.position.y = 0;
    }

    /* ---------- el gesto: arrastrar el sello hacia arriba ----------

       Se agarra el lacre (con un margen generoso alrededor, que el dedo es
       gordo) y se sube: la solapa lo sigue. Pasado algo más de un tercio del
       recorrido, al soltar se abre sola; antes, vuelve a cerrarse. Un clic o
       un toque sin arrastrar no hace nada; el teclado sigue abriendo con el
       botón (js/sobre.js). */
    var punto = new T.Vector3(), borde3 = new T.Vector3();
    function enPantalla(v) {
      v.project(camara);
      return { x: (v.x + 1) / 2 * ancho, y: (1 - v.y) / 2 * alto };
    }
    function sobreElSello(x, y) {
      // la escena como está ahora mismo, aunque aún no se haya pintado
      colocar(performance.now());
      escena.updateMatrixWorld();
      camara.updateMatrixWorld();
      lacre.getWorldPosition(punto);
      borde3.copy(punto).x += R;
      var c = enPantalla(punto), b = enPantalla(borde3);
      var radio = Math.max(30, Math.abs(b.x - c.x) * 1.6);
      var r = lienzo.getBoundingClientRect();
      var dx = x - r.left - c.x, dy = y - r.top - c.y;
      return dx * dx + dy * dy <= radio * radio;
    }
    // cuántos píxeles de pantalla son abrir la solapa del todo: lo que sube
    // la punta, de abajo del sobre a por encima de él
    function recorrido() {
      punto.set(0, 0, 0);
      borde3.set(0, 2 * L, 0);
      return Math.max(80, Math.abs(enPantalla(borde3).y - enPantalla(punto).y) * 0.75);
    }
    function xy(ev) { return { x: ev.clientX, y: ev.clientY }; }

    capa.addEventListener('pointerdown', seguro(function (ev) {
      if (estado !== 'reposo' || (ev.button != null && ev.button > 0)) return;
      var q = xy(ev);
      if (!sobreElSello(q.x, q.y)) return;
      arrastre = { y0: q.y, p: 0, largo: recorrido() };
      tSuelta = 0;
      capa.style.cursor = 'grabbing';
      if (capa.setPointerCapture) { try { capa.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ } }
      ev.preventDefault();
      arrancar();
    }));
    capa.addEventListener('pointermove', seguro(function (ev) {
      var q = xy(ev);
      if (!arrastre) {
        if (estado === 'reposo' && ev.pointerType === 'mouse') {
          capa.style.cursor = sobreElSello(q.x, q.y) ? 'grab' : '';
        }
        return;
      }
      arrastre.p = Math.max(0, Math.min(1, (arrastre.y0 - q.y) / arrastre.largo));
      if (!corriendo) pintar();
    }));
    var soltar = seguro(function () {
      if (!arrastre) return;
      capa.style.cursor = '';
      if (arrastre.p >= 0.35 && typeof window.abrirSobre === 'function') {
        window.abrirSobre();            // js/sobre.js: abre de verdad
      } else {
        pSuelta = arrastre.p;
        tSuelta = performance.now();
        arrastre = null;
        arrancar();
      }
    });
    capa.addEventListener('pointerup', soltar);
    capa.addEventListener('pointercancel', soltar);

    /* Si algo falla de aquí en adelante: con el sobre cerrado, vuelve el de
       CSS; si ya se estaba abriendo, se acaba de abrir sin el 3D. */
    alApagar = function () {
      corriendo = false;
      window.removeEventListener('resize', alRedimensionar);
      capa.style.cursor = '';
      arrastre = null;
      if (estado === 'fuera') return;
      if (alTerminar) {
        estado = 'fuera';
        if (!fundido && alFundir) alFundir();
        alTerminar();
      } else {
        capa.className = capa.className.replace(/\s*\ben-3d\b/g, '');
      }
    };

    t0 = performance.now();
    reponerPiezas();
    capa.className += ' en-3d';
    if (sinMovimiento) { pintar(); } else { arrancar(); }

    window.sobre3d = {
      abrir: seguro(function (fundir, terminar, desplegar) {
        alFundir = fundir;
        alTerminar = terminar;
        alDesplegar = desplegar;
        fundido = desplegado = false;
        /* La carta se rehace ahora, midiendo la página tal como ha quedado
           detrás: aún está metida en el sobre, así que el cambio no se ve. */
        construirCarta();
        dxColumna = (medida.l + medida.w / 2 - medida.vw / 2) * hojaH / medida.vh;
        // cerca: la carta abierta mide el alto de la pantalla (0.162 es lo
        // que se adelanta la carta al salir)
        dCerca = hojaH / (2 * TAN) + 0.162;
        estado = 'abriendo';
        p0 = arrastre ? arrastre.p : 0;
        arrastre = null;
        tSuelta = 0;
        tSolapa = 0.3 + (1 - p0);
        tAbre = performance.now();
        arrancar();
      }),
      ponerNombre: seguro(function (n) {
        n = n || '';
        if (n === nombre) return;      // la caché y el servidor dicen lo mismo
        nombre = n;
        conLetra(seguro(function () {
          if (nombre !== n) return;    // entretanto llegó otro
          escribirNombre();
          nombreDesde = performance.now();
          if (!corriendo) pintar();
        }));
      }),
      // js/sobre.js, al quitar la capa
      retirar: seguro(retirarse),
      // para el laboratorio: volver a cerrar el sobre
      reponer: seguro(function () {
        estado = 'reposo';
        arrastre = null;
        tSuelta = 0;
        p0 = 0;
        alFundir = alTerminar = alDesplegar = null;
        capa.style.cursor = '';
        window.addEventListener('resize', alRedimensionar);
        encuadrar();
        t0 = performance.now();
        reponerPiezas();
        if (sinMovimiento) pintar(); else arrancar();
      })
    };

    // por si el nombre llegó antes que el sobre
    var puesto = document.getElementById('sobre-nombre');
    if (puesto && puesto.textContent) window.sobre3d.ponerNombre(puesto.textContent);
  }
})();
