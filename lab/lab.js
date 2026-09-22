/* Laboratorio de estilos de la invitación.

   Se abre con ?lab en la dirección y no baja de otra forma: el invitado no lo
   descarga ni lo ve. Sirve para dos cosas:

     · probar colores y letras en vivo, sobre la página de verdad, y
     · mirar la invitación entera sin backend, con datos de mentira.

   Todo el tema se controla poniendo custom properties en <html>. Eso le gana
   al :root de la hoja, cae sobre lo que el script pinte después y alcanza al
   sobre y al índice, que viven fuera de #app. Por eso el panel no tiene que
   reaplicar nada cuando la invitación se repinta.

   Con el resultado en la mano, el botón «Exportar» escupe las declaraciones
   cambiadas para pegarlas en el :root de css/base.css y dejarlo fijo. */

(function () {
  'use strict';

  var raiz = document.documentElement;
  var CLAVE = 'lab-tema-v1';

  /* ================================================================
     0. No llevarse la invitación por delante
     ================================================================
     El window.onerror de index.html borra #app y escribe el error en su sitio.
     Es lo correcto para el invitado y un desastre aquí: un fallo tonto del
     panel dejaría la página en blanco. Los errores que salgan de este archivo
     se quedan en el panel. */

  var errorDeLaPagina = window.onerror;
  window.onerror = function (msg, fuente) {
    if (String(fuente || '').indexOf('lab/lab.js') !== -1) {
      quejarse(msg);
      return true;
    }
    return errorDeLaPagina ? errorDeLaPagina.apply(this, arguments) : false;
  };

  /* Envuelve un manejador para que su excepción tampoco escape. */
  function seguro(fn) {
    return function () {
      try { return fn.apply(this, arguments); }
      catch (e) { quejarse(e && e.message ? e.message : e); }
    };
  }

  function quejarse(texto) {
    var p = document.getElementById('lab-queja');
    if (!p) return;
    p.textContent = 'Fallo del laboratorio: ' + texto;
    p.hidden = false;
  }

  /* ================================================================
     1. Utilidades de color
     ================================================================ */

  function aRgb(valor) {
    var v = String(valor).trim();
    var m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
      var h = m[1];
      if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    m = v.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (m) { return [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])]; }
    return [0, 0, 0];
  }

  function aHex(rgb) {
    return '#' + rgb.map(function (n) {
      var x = Math.max(0, Math.min(255, Math.round(n))).toString(16);
      return x.length === 1 ? '0' + x : x;
    }).join('').toUpperCase();
  }

  function aHsl(color) {
    var c = aRgb(color).map(function (n) { return n / 255; });
    var mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]);
    var d = mx - mn, l = (mx + mn) / 2, h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = mx === c[0] ? (c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0)
        : mx === c[1] ? (c[2] - c[0]) / d + 2
        :               (c[0] - c[1]) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }

  function deHsl(h, s, l) {
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var caras = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]];
    var t = caras[Math.floor(h / 60) % 6];
    return aHex([(t[0] + m) * 255, (t[1] + m) * 255, (t[2] + m) * 255]);
  }

  /* El mismo color, más claro o más oscuro. Mantiene el tono y la saturación,
     que es lo que hace que los papeles del sobre sigan siendo del mismo juego
     que la piedra en vez de irse a un blanco frío al mezclarlos con blanco. */
  function conLuz(base, luz) {
    var hsl = aHsl(base);
    return deHsl(hsl[0], hsl[1], luz);
  }

  function luminancia(color) {
    return aRgb(color).map(function (n) {
      var c = n / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }).reduce(function (acc, c, i) {
      return acc + c * [0.2126, 0.7152, 0.0722][i];
    }, 0);
  }

  function contraste(a, b) {
    var x = luminancia(a), y = luminancia(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  /* ================================================================
     2. Qué se puede tocar
     ================================================================ */

  /* Fuera de la lista a propósito:
       --margen  es el margen de página de todas las secciones: tocarlo desde
                 aquí descuadra las sangrías (fotos, Confirmar) que lo cancelan
                 con un margen negativo.
       --marco   es maqueta y no paleta, como el `--pantallas` que lleva cada
                 sección: el ancho del marco y el alto de cada pantalla se
                 deciden en la hoja, no a ojo desde aquí.
       --linea, --sombra  son valores compuestos, no colores: exportarlos
                 hornearía el literal y cortaría el vínculo con --hueco.
       --campo   es luz blanca sobre los campos, no piedra: no sigue a la
                 paleta a propósito. */

  var COLORES = [
    { grupo: 'Paleta', tokens: [
      { t: '--tinta',  n: 'Tinta',  pista: 'el texto y el botón de enviar' },
      { t: '--piedra', n: 'Piedra', pista: 'el fondo de toda la página' },
      { t: '--hueco',  n: 'Hueco',  pista: 'juntas, bordes y líneas finas' },
      { t: '--ocre',   n: 'Ocre',   pista: 'el acento: arcos, enlaces, lacre' },
      { t: '--musgo',  n: 'Musgo',  pista: 'el texto secundario' },
      { t: '--error',  n: 'Error',  pista: 'solo los avisos que fallan' }
    ]},

    /* Los de abajo no son colores sueltos: son el de arriba a otra claridad.
       `luz` es la que tienen hoy, medida de los literales de la hoja, así que
       recalcularlos con la paleta de fábrica devuelve el mismo color con dos
       puntos de desvío como mucho —invisible— y con otra paleta los arrastra
       a todos en bloque en vez de dejarlos del color de antes. */
    { grupo: 'Derivados',
      nota: 'Salen solos del color del que cuelgan en cuanto lo mueves. Si eliges uno a mano, ese se queda fijo; el botón ⟲ lo devuelve al automático.',
      tokens: [
        { t: '--tinta-honda', n: 'Tinta honda', pista: 'el botón de enviar al pasar por encima',
          receta: { de: '--tinta',  luz: 0.1176 } },
        { t: '--papel',       n: 'Papel',       pista: 'el fondo de la tarjeta de Confirmar',
          receta: { de: '--piedra', luz: 0.929 } }
      ]},

    { grupo: 'El sobre',
      nota: 'Los papeles del sobre que tapa la invitación al abrirla. Todos cuelgan de la piedra.',
      tokens: [
        { t: '--sobre-carta',  n: 'La carta',     pista: 'lo que asoma al levantarse la solapa',
          receta: { de: '--piedra', luz: 0.963 } },
        { t: '--sobre-frente', n: 'El bolsillo',  pista: 'la cara de delante, con sus dobleces',
          receta: { de: '--piedra', luz: 0.916 } },
        { t: '--sobre-lado',   n: 'Las orejas',   pista: 'las solapas de los lados',
          receta: { de: '--piedra', luz: 0.894 } },
        { t: '--solapa-alta',  n: 'Solapa, alto', pista: 'el degradado de la solapa grande',
          receta: { de: '--piedra', luz: 0.833 } },
        { t: '--solapa-baja',  n: 'Solapa, bajo', pista: 'el otro extremo del degradado',
          receta: { de: '--piedra', luz: 0.896 } },
        { t: '--lacre-trazo',  n: 'Arco del lacre', pista: 'el arco grabado dentro del sello', alfa: 0.9,
          receta: { de: '--piedra', luz: 0.955 } }
      ]}
  ];

  /* Los pares que de verdad hay que mirar: son los cuatro sitios donde la
     página pone un color encima de otro y tiene que poder leerse. */
  var PARES = [
    { n: 'Texto sobre el fondo',     a: '--tinta',  b: '--piedra', min: 4.5 },
    { n: 'Texto flojo sobre fondo',  a: '--musgo',  b: '--piedra', min: 4.5 },
    { n: 'Botón de enviar',          a: '--piedra', b: '--tinta',  min: 4.5 },
    { n: 'Enlaces y arcos',          a: '--ocre',   b: '--piedra', min: 3.0 }
  ];

  /* ---------- fuentes ----------
     `g` es lo que se le pide a Google Fonts; null = ya está en el sistema.
     `cursiva` dice si la familia trae cursiva de verdad: sin ella el navegador
     se la inventa inclinando la recta, y eso emborrona.
     `cifras` marca las que tienen cifras de ancho fijo. Sin ellas la cuenta
     atrás pega un salto cada segundo. */
  var FUENTES = [
    { n: 'Great Vibes',        css: '"Great Vibes", cursive',        g: 'Great+Vibes',
      pesos: [400], cursiva: false, cifras: false, tipo: 'caligrafica' },
    { n: 'WindSong',           css: '"WindSong", cursive',           g: 'WindSong:wght@400;500',
      pesos: [400, 500], cursiva: false, cifras: false, tipo: 'caligrafica' },
    { n: 'Pinyon Script',      css: '"Pinyon Script", cursive',      g: 'Pinyon+Script',
      pesos: [400], cursiva: false, cifras: false, tipo: 'caligrafica' },
    { n: 'Dancing Script',     css: '"Dancing Script", cursive',     g: 'Dancing+Script:wght@400;500;600;700',
      pesos: [400, 500, 600, 700], cursiva: false, cifras: false, tipo: 'caligrafica' },

    { n: 'Cormorant Garamond', css: '"Cormorant Garamond", Georgia, serif',
      g: 'Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400',
      pesos: [300, 400, 600], cursiva: true, cifras: true, tipo: 'serif' },
    { n: 'EB Garamond',        css: '"EB Garamond", Georgia, serif',
      g: 'EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500',
      pesos: [400, 500, 600], cursiva: true, cifras: true, tipo: 'serif' },
    { n: 'Cardo',              css: '"Cardo", Georgia, serif',       g: 'Cardo:ital,wght@0,400;0,700;1,400',
      pesos: [400, 700], cursiva: true, cifras: false, tipo: 'serif' },
    { n: 'Sorts Mill Goudy',   css: '"Sorts Mill Goudy", Georgia, serif', g: 'Sorts+Mill+Goudy:ital@0;1',
      pesos: [400], cursiva: true, cifras: false, tipo: 'serif' },
    { n: 'Georgia',            css: 'Georgia, serif',                g: null,
      pesos: [400, 700], cursiva: true, cifras: true, tipo: 'serif' },

    { n: 'Cinzel',             css: '"Cinzel", Georgia, serif',      g: 'Cinzel:wght@400;500;600;700',
      pesos: [400, 500, 600, 700], cursiva: false, cifras: false, tipo: 'capitales' },
    { n: 'Marcellus',          css: '"Marcellus", Georgia, serif',   g: 'Marcellus',
      pesos: [400], cursiva: false, cifras: false, tipo: 'serif' },
    { n: 'Marcellus SC',       css: '"Marcellus SC", Georgia, serif', g: 'Marcellus+SC',
      pesos: [400], cursiva: false, cifras: false, tipo: 'capitales' },
    { n: 'Cormorant Unicase',  css: '"Cormorant Unicase", Georgia, serif', g: 'Cormorant+Unicase:wght@300;400;500;600',
      pesos: [300, 400, 500, 600], cursiva: false, cifras: false, tipo: 'capitales' },

    { n: 'Karla',              css: 'Karla, "Segoe UI", system-ui, sans-serif', g: 'Karla:wght@400;500;600',
      pesos: [400, 500, 600], cursiva: false, cifras: true, tipo: 'sans' },
    { n: 'Alegreya Sans',      css: '"Alegreya Sans", system-ui, sans-serif',
      g: 'Alegreya+Sans:ital,wght@0,300;0,400;0,500;0,700;1,400',
      pesos: [300, 400, 500, 700], cursiva: true, cifras: true, tipo: 'sans' },
    { n: 'Jost',               css: 'Jost, system-ui, sans-serif',   g: 'Jost:ital,wght@0,300;0,400;0,500;0,600;1,400',
      pesos: [300, 400, 500, 600], cursiva: true, cifras: true, tipo: 'sans' },
    { n: 'Lato',               css: 'Lato, system-ui, sans-serif',   g: 'Lato:ital,wght@0,300;0,400;0,700;1,400',
      pesos: [300, 400, 700], cursiva: true, cifras: true, tipo: 'sans' },
    { n: 'Inter',              css: 'Inter, system-ui, sans-serif',  g: 'Inter:wght@300;400;500;600',
      pesos: [300, 400, 500, 600], cursiva: false, cifras: true, tipo: 'sans' },
    { n: 'Del sistema',        css: 'system-ui, "Segoe UI", sans-serif', g: null,
      pesos: [300, 400, 500, 600, 700], cursiva: true, cifras: true, tipo: 'sans' }
  ];

  /* ---------- los seis papeles ---------- */
  var PAPELES = [
    { id: 'titulo', n: 'Títulos',
      pista: '«El gran día», «¿Nos acompañas?», «Ya es hoy»',
      muestra: 'El gran día',
      familia: '--letra-titulo', cursiva: '--cursiva-titulo', peso: '--peso-titulo', escala: '--escala-titulo' },

    { id: 'nombre', n: 'Tu nombre',
      pista: 'el saludo de la portada y el nombre escrito en el sobre',
      muestra: '¡Hola, Irene!',
      familia: '--letra-nombre', cursiva: '--cursiva-nombre', peso: '--peso-nombre', escala: '--escala-nombre' },

    { id: 'cita', n: 'Citas y frases',
      pista: 'el texto de portada, los pies de foto, la respuesta al confirmar',
      muestra: 'Nos casamos',
      familia: '--letra-cita', cursiva: '--cursiva-cita', escala: '--escala-cita' },

    { id: 'rotulo', n: 'Versalitas',
      pista: 'los novios, el índice lateral, «Fecha · Hora · Lugar»',
      muestra: 'Fecha · Hora · Lugar',
      familia: '--letra-rotulo', peso: '--peso-rotulo', caja: '--caja-rotulo', escala: '--escala-rotulo' },

    { id: 'cifra', n: 'Cifras',
      pista: 'la cuenta atrás y las horas del autobús',
      muestra: '317 · 12:30',
      familia: '--letra-cifra', peso: '--peso-cifra', escala: '--escala-cifra' },

    { id: 'texto', n: 'Texto corriente',
      pista: 'todo lo demás: formulario, botones, listas',
      muestra: 'Marca lo que necesites',
      familia: '--letra-texto', base: '--t-base' }
  ];

  /* ---------- presets ---------- */

  var PALETAS = [
    { n: 'Piedra', tokens: {} },
    { n: 'AGENTS.md', tokens: {
        '--tinta': '#464E47', '--piedra': '#F0DAB6', '--ocre': '#FFA600',
        '--musgo': '#6B7469', '--hueco': '#E2C89C'
      },
      aviso: 'AGENTS.md pide tres colores de detalle (#4BB9EC, #FFA600, #8FC243) y el diseño solo tiene una ranura de acento. Aquí va el naranja como ocre; los otros dos no tienen dónde ir. El verde como texto secundario daba 1.9:1, ilegible, así que el musgo es un verde apagado.' },
    { n: 'Lino',  tokens: {
        '--tinta': '#3B3A35', '--piedra': '#F4F1EA', '--hueco': '#E0DACD',
        '--ocre': '#A8763E', '--musgo': '#6B6A62'
      }},
    { n: 'Oliva', tokens: {
        '--tinta': '#2C3327', '--piedra': '#EFEDE3', '--hueco': '#D6D5C6',
        '--ocre': '#8A7B3F', '--musgo': '#5E6A55'
      }}
  ];

  var LETRAS = [
    { n: 'Piedra', tokens: {} },

    { n: 'Caligrafía', tokens: {
        '--letra-nombre': 'Great Vibes', '--cursiva-nombre': 'normal', '--peso-nombre': '400', '--escala-nombre': '1.35',
        '--letra-titulo': 'Cormorant Garamond', '--cursiva-titulo': 'italic', '--peso-titulo': '400',
        '--letra-cita': 'Cormorant Garamond', '--cursiva-cita': 'italic',
        '--letra-rotulo': 'Karla', '--peso-rotulo': '500', '--caja-rotulo': 'uppercase',
        '--letra-cifra': 'Cormorant Garamond', '--peso-cifra': '300',
        '--letra-texto': 'Karla'
      }},

    { n: 'Vals', tokens: {
        '--letra-nombre': 'Pinyon Script', '--cursiva-nombre': 'normal', '--peso-nombre': '400', '--escala-nombre': '1.4',
        '--letra-titulo': 'WindSong', '--cursiva-titulo': 'normal', '--peso-titulo': '400', '--escala-titulo': '1.1',
        '--letra-cita': 'EB Garamond', '--cursiva-cita': 'italic',
        '--letra-rotulo': 'Jost', '--peso-rotulo': '500', '--caja-rotulo': 'uppercase',
        '--letra-cifra': 'EB Garamond', '--peso-cifra': '400',
        '--letra-texto': 'Jost'
      }},

    { n: 'Inscripción', tokens: {
        '--letra-titulo': 'Cinzel', '--cursiva-titulo': 'normal', '--peso-titulo': '400', '--escala-titulo': '.9',
        '--letra-nombre': 'Cinzel', '--cursiva-nombre': 'normal', '--peso-nombre': '400', '--escala-nombre': '.8',
        '--letra-cita': 'EB Garamond', '--cursiva-cita': 'italic',
        '--letra-rotulo': 'Cinzel', '--peso-rotulo': '500', '--caja-rotulo': 'uppercase',
        '--letra-cifra': 'EB Garamond', '--peso-cifra': '400',
        '--letra-texto': 'Karla'
      }},

    { n: 'Claustro', tokens: {
        '--letra-titulo': 'Cardo', '--cursiva-titulo': 'italic', '--peso-titulo': '400',
        '--letra-nombre': 'Cardo', '--cursiva-nombre': 'italic', '--peso-nombre': '400',
        '--letra-cita': 'Cardo', '--cursiva-cita': 'italic',
        '--letra-rotulo': 'Marcellus SC', '--peso-rotulo': '400', '--caja-rotulo': 'none',
        '--letra-cifra': 'Cardo', '--peso-cifra': '400',
        '--letra-texto': 'Lato'
      }},

    { n: 'Escribanía', tokens: {
        '--letra-titulo': 'EB Garamond', '--cursiva-titulo': 'italic', '--peso-titulo': '400',
        '--letra-nombre': 'EB Garamond', '--cursiva-nombre': 'italic', '--peso-nombre': '400',
        '--letra-cita': 'EB Garamond', '--cursiva-cita': 'italic',
        '--letra-rotulo': 'Alegreya Sans', '--peso-rotulo': '500', '--caja-rotulo': 'uppercase',
        '--letra-cifra': 'EB Garamond', '--peso-cifra': '400',
        '--letra-texto': 'Alegreya Sans'
      }},

    { n: 'Llana', tokens: {
        '--letra-titulo': 'Jost', '--cursiva-titulo': 'normal', '--peso-titulo': '300', '--escala-titulo': '1.05',
        '--letra-nombre': 'Jost', '--cursiva-nombre': 'normal', '--peso-nombre': '300',
        '--letra-cita': 'Inter', '--cursiva-cita': 'normal', '--escala-cita': '.92',
        '--letra-rotulo': 'Jost', '--peso-rotulo': '500', '--caja-rotulo': 'uppercase',
        '--letra-cifra': 'Jost', '--peso-cifra': '300',
        '--letra-texto': 'Inter'
      }}
  ];

  /* ================================================================
     3. El tema
     ================================================================
     `tokens` guarda solo lo que has tocado: lo que no esté aquí se queda con
     el valor del :root de la hoja, y así abrir el laboratorio no cambia nada
     por el hecho de abrirlo. `fijos` marca los derivados que has elegido a
     mano y que por tanto ya no siguen a su color base. */

  var estado = { tokens: {}, fijos: {} };

  function buscarFuente(nombre) {
    for (var i = 0; i < FUENTES.length; i++) {
      if (FUENTES[i].n === nombre) return FUENTES[i];
    }
    return null;
  }

  /* El valor que acaba en el CSS. Las familias se guardan por su nombre
     ('Great Vibes') y se escriben como pila completa. */
  function valorCss(token, valor) {
    if (token.indexOf('--letra-') === 0) {
      var f = buscarFuente(valor);
      return f ? f.css : valor;
    }
    return valor;
  }

  function leido(token) {
    return getComputedStyle(raiz).getPropertyValue(token).trim();
  }

  function todosLosColores() {
    var lista = [];
    COLORES.forEach(function (g) { g.tokens.forEach(function (c) { lista.push(c); }); });
    return lista;
  }

  function todosLosTokens() {
    var lista = todosLosColores().map(function (c) { return c.t; });
    PAPELES.forEach(function (p) {
      ['familia', 'cursiva', 'peso', 'caja', 'escala', 'base'].forEach(function (k) {
        if (p[k]) lista.push(p[k]);
      });
    });
    lista.push('--aire-escala');
    return lista;
  }

  var TOKENS = todosLosTokens();

  function aplicar() {
    /* Primero lo que has puesto tú; lo que no, fuera, que vuelva la hoja. */
    TOKENS.forEach(function (t) {
      if (Object.prototype.hasOwnProperty.call(estado.tokens, t)) {
        raiz.style.setProperty(t, valorCss(t, estado.tokens[t]));
      } else {
        raiz.style.removeProperty(t);
      }
    });

    /* Y después los derivados que sigan en automático. Solo entran en juego si
       su color base se ha movido: con la paleta de fábrica no se tocan y la
       página sale idéntica a como la ve un invitado. */
    todosLosColores().forEach(function (c) {
      if (!c.receta || estado.fijos[c.t]) return;
      if (!Object.prototype.hasOwnProperty.call(estado.tokens, c.receta.de)) return;

      var hex = conLuz(leido(c.receta.de), c.receta.luz);
      raiz.style.setProperty(c.t, c.alfa ? conAlfa(hex, c.alfa) : hex);
    });

    cargarFuentesEnUso();
    pintarIcono();
    refrescarValores();
    guardar();
  }

  function conAlfa(hex, a) {
    var r = aRgb(hex);
    return 'rgba(' + r[0] + ',' + r[1] + ',' + r[2] + ',' + a + ')';
  }

  function poner(token, valor) {
    estado.tokens[token] = valor;
    aplicar();
  }

  function quitar(token) {
    delete estado.tokens[token];
    aplicar();
  }

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) { /* modo privado */ }
  }

  function recuperar() {
    /* La dirección manda sobre lo guardado: así se puede mandar un tema por
       enlace y verlo tal cual en otro aparato. Va en la query y no en el hash
       porque los enlaces del índice reescriben el hash a cada clic. */
    var m = location.search.match(/[?&]tema=([^&]+)/);
    if (m) {
      try {
        var leidoTema = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
        if (leidoTema && leidoTema.tokens) return leidoTema;
      } catch (e) { /* enlace roto: seguimos con lo de casa */ }
    }
    try {
      var g = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      if (g && g.tokens) return { tokens: g.tokens, fijos: g.fijos || {} };
    } catch (e) { /* nada guardado */ }
    return { tokens: {}, fijos: {} };
  }

  function enlaceDelTema() {
    var base = location.origin + location.pathname;
    var q = '?lab';
    if (token) { q += '&i=' + encodeURIComponent(token); }
    var paquete = btoa(unescape(encodeURIComponent(JSON.stringify(estado))));
    return base + q + '&tema=' + encodeURIComponent(paquete);
  }

  /* ---------- fuentes bajo demanda ---------- */

  var bajadas = {};

  function traerFuente(nombre) {
    var f = buscarFuente(nombre);
    if (!f || !f.g || bajadas[nombre]) return;
    bajadas[nombre] = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + f.g + '&display=swap';
    document.head.appendChild(l);
  }

  function cargarFuentesEnUso() {
    PAPELES.forEach(function (p) {
      var n = estado.tokens[p.familia];
      if (n) traerFuente(n);
    });
  }

  /* ---------- el icono y la barra del navegador ----------
     La paleta está repetida a mano en el <meta theme-color> y en favicon.svg.
     Aquí se actualizan en vivo para que se vea el cambio; al exportar salen
     escritos para dejarlos fijos. */

  /* Comillas simples: va dentro de un data-URI y así no hay que escaparlas.
     Es la forma exacta que lleva hoy el <link rel="icon"> de 404.html. */
  function svgDelIcono(tinta, piedra, ocre) {
    return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
           "<rect width='32' height='32' rx='6' fill='" + tinta + "'/>" +
           "<path d='M9 24.5V14a7 7 0 0 1 14 0v10.5z' fill='" + piedra + "'/>" +
           "<rect x='7' y='24.5' width='18' height='2.5' rx='1.25' fill='" + ocre + "'/>" +
           "</svg>";
  }

  /* Y esta otra es la del archivo favicon.svg: comillas dobles, un elemento
     por línea y el rótulo que lee el lector de pantalla. Se pega tal cual. */
  function archivoDelIcono(tinta, piedra, ocre) {
    var n = String.fromCharCode(10);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Invitación de boda">' + n +
           '  <rect width="32" height="32" rx="6" fill="' + tinta + '"/>' + n +
           '  <path d="M9 24.5V14a7 7 0 0 1 14 0v10.5z" fill="' + piedra + '"/>' + n +
           '  <rect x="7" y="24.5" width="18" height="2.5" rx="1.25" fill="' + ocre + '"/>' + n +
           '</svg>';
  }

  var iconoDeCasa = null;
  var metaDeCasa = null;

  function pintarIcono() {
    var meta = document.querySelector('meta[name="theme-color"]');
    var icono = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
    if (metaDeCasa === null && meta) { metaDeCasa = meta.getAttribute('content'); }
    if (iconoDeCasa === null && icono) { iconoDeCasa = icono.getAttribute('href'); }

    var tocado = ['--tinta', '--piedra', '--ocre'].some(function (t) {
      return Object.prototype.hasOwnProperty.call(estado.tokens, t);
    });

    if (meta) { meta.setAttribute('content', tocado ? leido('--piedra') : metaDeCasa); }
    if (icono) {
      if (!tocado) { icono.setAttribute('href', iconoDeCasa); return; }
      var svg = svgDelIcono(leido('--tinta'), leido('--piedra'), leido('--ocre'));
      icono.setAttribute('href', 'data:image/svg+xml,' + encodeURIComponent(svg));
    }
  }

  /* ================================================================
     4. Datos de mentira
     ================================================================
     El backend devuelve poco: {ok, nombre, canciones, alergenos, vuelta, nota,
     asiste}. Con eso se pinta la invitación entera sin tocar la red. */

  var VARIANTES = {
    completo: {
      n: 'Completa',
      pista: 'las diez secciones, con un nombre largo para ver cómo parte la línea',
      d: {
        ok: true,
        nombre: 'Familia Fernández de Villaverde',
        asiste: 'SI',
        alergenos: 'Gluten, Marisco',
        vuelta: '23:30',
        nota: 'Nos hace muchísima ilusión. ¿Podemos llevar a la niña?',
        canciones: [
          { id: 'p1', cancion: 'Lucha de gigantes', artista: 'Antonio Vega' },
          { id: 'p2', cancion: 'Los restos del naufragio', artista: 'Robe' }
        ]
      }
    },
    sinRespuesta: {
      n: 'Sin contestar',
      pista: 'todo a la vista y el botón de enviar apagado',
      d: { ok: true, nombre: 'Marta y Diego', canciones: [] }
    },
    noViene: {
      n: 'No viene',
      pista: 'media invitación escondida, índice corto y reloj parado',
      d: { ok: true, nombre: 'Tío Paco', asiste: 'NO', nota: 'Ese finde estoy fuera. Un abrazo enorme.', canciones: [] }
    },
    corto: {
      n: 'Sin nada',
      pista: 'nombre de una palabra, sin canciones ni alergias: el caso flaco',
      d: { ok: true, nombre: 'Ana', asiste: 'SI', canciones: [] }
    }
  };

  var variante = 'completo';

  function repintar(cual) {
    variante = cual || variante;
    var d = JSON.parse(JSON.stringify(VARIANTES[variante].d));

    /* pintar() no limpia el estado anterior: si no se resetea a mano, los
       alérgenos y las canciones de la variante de antes se quedan pegados. */
    window.marcados = {};
    window.elegido = null;
    window.vuelta = null;
    window.canciones = d.canciones || [];

    nombreEnSobre(d.nombre);
    pintar(d);
  }

  /* ---------- la red, apagada ----------
     `pedir` es global, así que se puede sustituir entera. Confirmar, apuntar
     una canción y quitarla siguen funcionando, y se les puede mirar el estado
     de acierto y el de fallo. */

  var fallaRed = false;
  var siguienteId = 100;

  function pedirDeMentira(metodo, url, cuerpo, alTerminar) {
    setTimeout(seguro(function () {
      if (fallaRed) { alTerminar(null); return; }

      var c = {};
      try { c = JSON.parse(cuerpo || '{}'); } catch (e) { c = {}; }

      if (c.accion === 'cancion') {
        var repetida = window.canciones.some(function (x) { return x.cancion === c.cancion; });
        if (!repetida) {
          window.canciones = window.canciones.concat([{
            id: 'm' + (++siguienteId), cancion: c.cancion, artista: c.artista
          }]);
        }
        var quitada = null;
        if (window.canciones.length > MAX_CANCIONES) {
          quitada = window.canciones[0];
          window.canciones = window.canciones.slice(1);
        }
        alTerminar({ ok: true, canciones: window.canciones, repetida: repetida, quitada: quitada });
        return;
      }

      if (c.accion === 'quitar_cancion') {
        window.canciones = window.canciones.filter(function (x) { return x.id !== c.id; });
        alTerminar({ ok: true, canciones: window.canciones });
        return;
      }

      alTerminar({ ok: true });
    }), 300);
  }

  /* ---------- volver a ver el sobre ---------- */

  function reponerSobre() {
    var s = document.getElementById('sobre');
    var b = document.getElementById('sobre-btn');
    var p = document.getElementById('sobre-pista');
    if (!s || !b) return;

    window.sobreAbierto = false;
    window.sobreAbriendo = false;
    s.style.display = '';
    s.className = 'sobre-capa';
    b.className = 'sobre';
    if (p) p.className = 'sobre-pista';
    document.body.className = 'sobre-visible';
    window.scrollTo(0, 0);
  }

  /* ================================================================
     5. El panel
     ================================================================ */

  var refrescos = [];   // funciones que releen su valor del tema

  function el(etiqueta, clase, texto) {
    var e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function fila(nombre, pista) {
    var f = el('div', 'lab-fila');
    var et = el('div', 'lab-etiqueta');
    et.appendChild(el('b', null, nombre));
    if (pista) et.appendChild(el('span', null, pista));
    f.appendChild(et);
    return f;
  }

  function boton(texto, alPulsar, clase) {
    var b = el('button', clase, texto);
    b.type = 'button';
    b.onclick = seguro(alPulsar);
    return b;
  }

  function desplegable(opciones, valor, alCambiar) {
    var s = document.createElement('select');
    opciones.forEach(function (o) {
      var op = document.createElement('option');
      op.value = o.v;
      op.textContent = o.n;
      s.appendChild(op);
    });
    s.value = valor;
    s.onchange = seguro(function () { alCambiar(s.value); });
    return s;
  }

  /* ---------- hoja de colores ---------- */

  function hojaColores() {
    var hoja = el('div', 'lab-hoja');

    var avisoPaleta = el('p', 'lab-aviso');
    avisoPaleta.hidden = true;

    var caja = el('div', 'lab-botonera');
    PALETAS.forEach(function (pal) {
      caja.appendChild(boton(pal.n, function () {
        todosLosColores().forEach(function (c) {
          delete estado.tokens[c.t];
          delete estado.fijos[c.t];
        });
        Object.keys(pal.tokens).forEach(function (t) { estado.tokens[t] = pal.tokens[t]; });
        avisoPaleta.textContent = pal.aviso || '';
        avisoPaleta.hidden = !pal.aviso;
        aplicar();
      }));
    });
    hoja.appendChild(caja);
    hoja.appendChild(avisoPaleta);

    COLORES.forEach(function (grupo) {
      var g = el('fieldset', 'lab-grupo');
      g.appendChild(el('legend', null, grupo.grupo));
      if (grupo.nota) g.appendChild(el('p', 'lab-nota', grupo.nota));

      grupo.tokens.forEach(function (c) {
        var f = fila(c.n, c.pista);

        var entrada = document.createElement('input');
        entrada.type = 'color';
        entrada.setAttribute('aria-label', c.n);
        entrada.oninput = seguro(function () {
          if (c.receta) estado.fijos[c.t] = true;
          poner(c.t, c.alfa ? conAlfa(entrada.value, c.alfa) : entrada.value.toUpperCase());
        });
        f.appendChild(entrada);

        if (c.receta) {
          var candado = boton('⟲', function () {
            delete estado.fijos[c.t];
            delete estado.tokens[c.t];
            aplicar();
          }, 'lab-icono');
          candado.title = 'Volver a calcularlo desde ' + c.receta.de.replace('--', '');
          f.appendChild(candado);
        }

        refrescos.push(function () {
          var v = estado.tokens[c.t] || leido(c.t);
          entrada.value = aHex(aRgb(v)).toLowerCase();
        });

        g.appendChild(f);
      });

      hoja.appendChild(g);
    });

    /* ---------- contraste ---------- */
    var gc = el('fieldset', 'lab-grupo');
    gc.appendChild(el('legend', null, 'Se lee o no se lee'));
    gc.appendChild(el('p', 'lab-nota',
      'Relación de contraste WCAG. Por debajo del mínimo hay gente que no lo lee, y en el móvil a pleno sol no lo lee nadie.'));

    PARES.forEach(function (par) {
      var linea = el('div', 'lab-contraste');
      linea.appendChild(el('span', null, par.n));
      var cifra = el('b');
      linea.appendChild(cifra);
      gc.appendChild(linea);

      refrescos.push(function () {
        var r = contraste(leido(par.a), leido(par.b));
        cifra.textContent = r.toFixed(2) + ':1';
        cifra.className = r >= par.min ? 'lab-bien' : (r >= par.min - 1.5 ? 'lab-justo' : 'lab-mal');
        cifra.title = 'Mínimo recomendado: ' + par.min + ':1';
      });
    });
    hoja.appendChild(gc);

    return hoja;
  }

  /* ---------- hoja de letra ---------- */

  function hojaLetra() {
    var hoja = el('div', 'lab-hoja');

    var caja = el('div', 'lab-botonera');
    LETRAS.forEach(function (pre) {
      caja.appendChild(boton(pre.n, function () {
        PAPELES.forEach(function (p) {
          ['familia', 'cursiva', 'peso', 'caja', 'escala', 'base'].forEach(function (k) {
            if (p[k]) delete estado.tokens[p[k]];
          });
        });
        Object.keys(pre.tokens).forEach(function (t) { estado.tokens[t] = pre.tokens[t]; });
        aplicar();
      }));
    });
    hoja.appendChild(caja);

    var opcionesFuente = FUENTES.map(function (f) { return { v: f.n, n: f.n }; });

    PAPELES.forEach(function (p) {
      var g = el('fieldset', 'lab-grupo');
      g.appendChild(el('legend', null, p.n));
      g.appendChild(el('p', 'lab-nota', p.pista));

      var muestra = el('span', 'lab-muestra', p.muestra);
      g.appendChild(muestra);

      /* familia */
      var fFam = fila('Familia', null);
      var sel = desplegable(opcionesFuente, '', function (nombre) {
        traerFuente(nombre);
        estado.tokens[p.familia] = nombre;
        ajustarAlaFuente(p, nombre);
        aplicar();
      });
      sel.style.flex = '1';
      sel.style.minWidth = '0';
      fFam.appendChild(sel);
      g.appendChild(fFam);

      /* cursiva */
      var cajaCursiva = null;
      if (p.cursiva) {
        var fCur = fila('Cursiva', null);
        cajaCursiva = boton('Cursiva', function () {
          var ahora = valorDe(p.cursiva);
          poner(p.cursiva, ahora === 'italic' ? 'normal' : 'italic');
        }, 'lab-corto');
        fCur.appendChild(cajaCursiva);
        g.appendChild(fCur);
      }

      /* peso */
      var selPeso = null;
      if (p.peso) {
        var fPeso = fila('Peso', null);
        selPeso = desplegable([], '', function (v) { poner(p.peso, v); });
        selPeso.className = 'lab-corto';
        fPeso.appendChild(selPeso);
        g.appendChild(fPeso);
      }

      /* mayúsculas */
      var botonCaja = null;
      if (p.caja) {
        var fCaja = fila('Mayúsculas', null);
        botonCaja = boton('MAYÚS', function () {
          var ahora = valorDe(p.caja);
          poner(p.caja, ahora === 'uppercase' ? 'none' : 'uppercase');
        }, 'lab-corto');
        fCaja.appendChild(botonCaja);
        g.appendChild(fCaja);
      }

      /* escala */
      var rango = null, cifraEscala = null;
      if (p.escala) {
        var fEsc = fila('Tamaño', null);
        cifraEscala = el('span', null, '');
        cifraEscala.style.cssText = 'flex:none;width:2.6rem;text-align:right;font-variant-numeric:tabular-nums';
        rango = document.createElement('input');
        rango.type = 'range';
        rango.min = '0.7'; rango.max = '1.6'; rango.step = '0.05';
        rango.setAttribute('aria-label', 'Tamaño de ' + p.n);
        rango.oninput = seguro(function () { poner(p.escala, rango.value); });
        fEsc.appendChild(cifraEscala);
        fEsc.appendChild(rango);
        g.appendChild(fEsc);
      }

      /* tamaño base del cuerpo, solo en el papel de texto */
      var rangoBase = null, cifraBase = null;
      if (p.base) {
        var fBase = fila('Tamaño base', null);
        cifraBase = el('span', null, '');
        cifraBase.style.cssText = 'flex:none;width:2.6rem;text-align:right;font-variant-numeric:tabular-nums';
        rangoBase = document.createElement('input');
        rangoBase.type = 'range';
        rangoBase.min = '14'; rangoBase.max = '21'; rangoBase.step = '1';
        rangoBase.setAttribute('aria-label', 'Tamaño del texto corriente');
        rangoBase.oninput = seguro(function () { poner(p.base, rangoBase.value + 'px'); });
        fBase.appendChild(cifraBase);
        fBase.appendChild(rangoBase);
        g.appendChild(fBase);
      }

      var aviso = el('p', 'lab-aviso');
      aviso.hidden = true;
      g.appendChild(aviso);

      refrescos.push(function () {
        var nombre = nombreDeFuente(p);
        sel.value = nombre;
        var f = buscarFuente(nombre) || FUENTES[0];

        muestra.style.fontFamily = f.css;
        muestra.style.fontStyle = p.cursiva ? valorDe(p.cursiva) : 'normal';
        muestra.style.fontWeight = p.peso ? valorDe(p.peso) : '400';
        muestra.style.textTransform = p.caja ? valorDe(p.caja) : 'none';

        if (cajaCursiva) {
          var esCursiva = valorDe(p.cursiva) === 'italic';
          cajaCursiva.setAttribute('aria-pressed', esCursiva ? 'true' : 'false');
        }
        if (botonCaja) {
          botonCaja.setAttribute('aria-pressed', valorDe(p.caja) === 'uppercase' ? 'true' : 'false');
        }
        if (selPeso) {
          var actual = valorDe(p.peso);
          selPeso.innerHTML = '';
          f.pesos.forEach(function (w) {
            var op = document.createElement('option');
            op.value = String(w); op.textContent = String(w);
            selPeso.appendChild(op);
          });
          selPeso.value = f.pesos.indexOf(+actual) === -1 ? String(pesoCercano(f, actual)) : String(actual);
        }
        if (rango) {
          rango.value = valorDe(p.escala);
          cifraEscala.textContent = (+rango.value).toFixed(2).replace(/0$/, '') + '×';
        }
        if (rangoBase) {
          rangoBase.value = parseInt(valorDe(p.base), 10);
          cifraBase.textContent = rangoBase.value + 'px';
        }

        var quejas = avisosDe(p, f);
        aviso.textContent = quejas.join(' ');
        aviso.hidden = !quejas.length;
      });

      hoja.appendChild(g);
    });

    /* interletraje */
    var ga = el('fieldset', 'lab-grupo');
    ga.appendChild(el('legend', null, 'Interletraje'));
    ga.appendChild(el('p', 'lab-nota',
      'Un solo mando para el aire de todas las versalitas. Mantiene la proporción entre ellas.'));
    var fAire = fila('Aire', null);
    var cifraAire = el('span', null, '');
    cifraAire.style.cssText = 'flex:none;width:2.6rem;text-align:right;font-variant-numeric:tabular-nums';
    var rangoAire = document.createElement('input');
    rangoAire.type = 'range';
    rangoAire.min = '0'; rangoAire.max = '2'; rangoAire.step = '0.05';
    rangoAire.setAttribute('aria-label', 'Interletraje de las versalitas');
    rangoAire.oninput = seguro(function () { poner('--aire-escala', rangoAire.value); });
    fAire.appendChild(cifraAire);
    fAire.appendChild(rangoAire);
    ga.appendChild(fAire);
    hoja.appendChild(ga);

    refrescos.push(function () {
      rangoAire.value = valorDe('--aire-escala');
      cifraAire.textContent = (+rangoAire.value).toFixed(2).replace(/0$/, '') + '×';
    });

    return hoja;
  }

  function valorDe(token) {
    if (Object.prototype.hasOwnProperty.call(estado.tokens, token)) return estado.tokens[token];
    return leido(token);
  }

  /* El token guarda el nombre de la familia; si nunca se ha tocado, hay que
     adivinar cuál es leyendo la pila que hay puesta en la hoja. */
  function nombreDeFuente(p) {
    if (estado.tokens[p.familia]) return estado.tokens[p.familia];
    /* Se compara la primera familia de la pila contra la primera de cada
       candidata, no una dentro de la otra: 'system-ui' vive dentro de la pila
       de Karla y 'Marcellus' dentro de 'Marcellus SC', y buscando por trozos
       se acaba eligiendo la que no es. */
    var pila = cabeza(leido(p.familia));
    for (var i = 0; i < FUENTES.length; i++) {
      if (cabeza(FUENTES[i].css) === pila) return FUENTES[i].n;
    }
    return FUENTES[0].n;
  }

  function cabeza(pila) {
    return String(pila).split(',')[0].replace(/["']/g, '').trim().toLowerCase();
  }

  function pesoCercano(f, actual) {
    var n = +actual || 400;
    return f.pesos.reduce(function (mejor, w) {
      return Math.abs(w - n) < Math.abs(mejor - n) ? w : mejor;
    }, f.pesos[0]);
  }

  /* Al cambiar de familia se apagan solos los rasgos que esa familia no tiene.
     Si no, el navegador se los inventa: una cursiva falsa inclinando la recta,
     o un 300 falso adelgazándola. */
  function ajustarAlaFuente(p, nombre) {
    var f = buscarFuente(nombre);
    if (!f) return;

    if (p.cursiva && !f.cursiva) { estado.tokens[p.cursiva] = 'normal'; }
    if (p.peso) {
      var actual = +valorDe(p.peso);
      if (f.pesos.indexOf(actual) === -1) { estado.tokens[p.peso] = String(pesoCercano(f, actual)); }
    }
    /* Una caligráfica en mayúsculas no se lee: capitales de Great Vibes una
       detrás de otra son un garabato. */
    if (p.caja && f.tipo === 'caligrafica') { estado.tokens[p.caja] = 'none'; }
    /* Y las de capitales ya vienen en versalita: no hay que mayusculizarlas. */
    if (p.caja && f.tipo === 'capitales') { estado.tokens[p.caja] = 'none'; }
  }

  function avisosDe(p, f) {
    var q = [];
    if (p.cursiva && !f.cursiva && valorDe(p.cursiva) === 'italic') {
      q.push(f.n + ' no tiene cursiva: el navegador la inclina a la fuerza y sale emborronada.');
    }
    if (p.peso && f.pesos.indexOf(+valorDe(p.peso)) === -1) {
      q.push(f.n + ' no trae el peso ' + valorDe(p.peso) + '.');
    }
    if (p.caja && valorDe(p.caja) === 'uppercase' && f.tipo === 'caligrafica') {
      q.push('En mayúsculas una caligráfica no se lee.');
    }
    if (p.id === 'cifra' && !f.cifras) {
      q.push(f.n + ' no tiene cifras de ancho fijo: la cuenta atrás dará un salto cada segundo.');
    }
    return q;
  }

  /* ---------- hoja de datos ---------- */

  function hojaDatos() {
    var hoja = el('div', 'lab-hoja');

    var g = el('fieldset', 'lab-grupo');
    g.appendChild(el('legend', null, 'Qué invitado'));
    g.appendChild(el('p', 'lab-nota',
      'Datos de mentira: la invitación se pinta entera sin hablar con el servidor.'));

    var botonesVariante = [];
    var caja = el('div', 'lab-botonera');
    Object.keys(VARIANTES).forEach(function (k) {
      var b = boton(VARIANTES[k].n, function () { repintar(k); refrescarValores(); });
      b.title = VARIANTES[k].pista;
      botonesVariante.push({ k: k, b: b });
      caja.appendChild(b);
    });
    g.appendChild(caja);
    hoja.appendChild(g);

    refrescos.push(function () {
      botonesVariante.forEach(function (x) {
        x.b.setAttribute('aria-pressed', x.k === variante ? 'true' : 'false');
      });
    });

    var g2 = el('fieldset', 'lab-grupo');
    g2.appendChild(el('legend', null, 'Cacharreo'));

    var f1 = fila('Volver a ver el sobre', 'la primera impresión, otra vez');
    f1.appendChild(boton('Abrir', reponerSobre, 'lab-corto'));
    g2.appendChild(f1);

    var f2 = fila('Sin animaciones', 'para no tragarse el revelado en cada repintado');
    var bAnim = boton('Quietas', function () {
      window.sinMovimiento = !window.sinMovimiento;
      bAnim.setAttribute('aria-pressed', window.sinMovimiento ? 'true' : 'false');
    }, 'lab-corto');
    bAnim.setAttribute('aria-pressed', window.sinMovimiento ? 'true' : 'false');
    f2.appendChild(bAnim);
    g2.appendChild(f2);

    var f3 = fila('Que falle la red', 'para mirar los estados de error');
    var bRed = boton('Fallar', function () {
      fallaRed = !fallaRed;
      bRed.setAttribute('aria-pressed', fallaRed ? 'true' : 'false');
    }, 'lab-corto');
    bRed.setAttribute('aria-pressed', 'false');
    f3.appendChild(bRed);
    g2.appendChild(f3);

    hoja.appendChild(g2);
    return hoja;
  }

  /* ---------- exportar ---------- */

  function textoExportado() {
    var lineas = [];
    var puestos = Object.keys(estado.tokens);

    if (!puestos.length) {
      return 'No has cambiado nada todavía: la invitación está tal cual la ve un invitado.';
    }

    lineas.push('/* ── pega esto dentro de :root, en css/base.css ── */');
    TOKENS.forEach(function (t) {
      if (!Object.prototype.hasOwnProperty.call(estado.tokens, t)) return;
      lineas.push('  ' + t + ': ' + valorCss(t, estado.tokens[t]) + ';');
    });

    /* Los derivados en automático también han cambiado de valor: van escritos
       para que el archivo quede igual que lo que estás viendo. */
    var derivados = todosLosColores().filter(function (c) {
      return c.receta && !estado.fijos[c.t] &&
             !Object.prototype.hasOwnProperty.call(estado.tokens, c.t) &&
             raiz.style.getPropertyValue(c.t);
    });
    if (derivados.length) {
      lineas.push('');
      lineas.push('/* calculados a partir de los de arriba */');
      derivados.forEach(function (c) {
        lineas.push('  ' + c.t + ': ' + raiz.style.getPropertyValue(c.t) + ';');
      });
    }

    /* El <link> de las fuentes */
    var familias = [];
    PAPELES.forEach(function (p) {
      var f = buscarFuente(nombreDeFuente(p));
      if (f && f.g && familias.indexOf(f.g) === -1) familias.push(f.g);
    });
    if (familias.length) {
      lineas.push('');
      lineas.push('/* ── sustituye el <link> de las fuentes, arriba del todo ── */');
      lineas.push('<link href="https://fonts.googleapis.com/css2?family=' +
                  familias.join('&family=') + '&display=swap" rel="stylesheet">');
    }

    /* Los sitios donde la paleta está repetida a mano */
    var tocaColor = puestos.some(function (t) {
      return t === '--tinta' || t === '--piedra' || t === '--ocre';
    });
    if (tocaColor) {
      var tinta = leido('--tinta'), piedra = leido('--piedra'), ocre = leido('--ocre');
      lineas.push('');
      lineas.push('/* ── y estos tres sitios repiten los colores a mano ── */');
      lineas.push('');
      lineas.push('index.html, en la cabecera:');
      lineas.push('  <meta name="theme-color" content="' + piedra + '">');
      lineas.push('');
      lineas.push('favicon.svg, entero:');
      lineas.push(archivoDelIcono(tinta, piedra, ocre));
      lineas.push('');
      lineas.push('404.html, el <link rel="icon">:');
      lineas.push('  href="data:image/svg+xml,' + encodeURIComponent(svgDelIcono(tinta, piedra, ocre)) + '"');
      lineas.push('');
      lineas.push('apple-touch-icon.png lleva la misma paleta horneada dentro y hay');
      lineas.push('que rehacerlo aparte, convirtiendo el SVG nuevo a PNG de 180×180.');
    }

    return lineas.join('\n');
  }

  function hojaExportar() {
    var hoja = el('div', 'lab-hoja');
    var area = document.createElement('textarea');
    area.readOnly = true;
    area.setAttribute('aria-label', 'Lo que hay que pegar en css/base.css');

    var caja = el('div', 'lab-botonera');
    caja.appendChild(boton('Copiar', function () {
      area.select();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(area.value);
      } else {
        try { document.execCommand('copy'); } catch (e) { /* que lo copie a mano */ }
      }
    }));
    caja.appendChild(boton('Copiar enlace del tema', function () {
      var enlace = enlaceDelTema();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(enlace);
      }
      area.value = enlace;
    }));
    hoja.appendChild(caja);
    hoja.appendChild(area);

    refrescos.push(function () {
      if (!hoja.hidden) area.value = textoExportado();
    });
    return hoja;
  }

  /* ---------- montaje ---------- */

  function refrescarValores() {
    refrescos.forEach(function (f) {
      try { f(); } catch (e) { /* un control roto no tumba los demás */ }
    });
  }

  function montar() {
    var panel = el('div');
    panel.id = 'lab';

    var cab = el('div', 'lab-cabecera');
    cab.appendChild(el('h2', null, 'Laboratorio'));
    cab.appendChild(boton('—', plegar, 'lab-icono'));
    panel.appendChild(cab);

    var hojas = [
      { n: 'Color',  h: hojaColores() },
      { n: 'Letra',  h: hojaLetra() },
      { n: 'Datos',  h: hojaDatos() },
      { n: 'Sacar',  h: hojaExportar() }
    ];

    var pestanas = el('div', 'lab-pestanas');
    pestanas.setAttribute('role', 'tablist');
    hojas.forEach(function (x, i) {
      var b = el('button', 'lab-pestana', x.n);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.onclick = seguro(function () {
        hojas.forEach(function (y, j) {
          y.h.hidden = j !== i;
          pestanas.children[j].setAttribute('aria-selected', j === i ? 'true' : 'false');
        });
        refrescarValores();
      });
      pestanas.appendChild(b);
    });
    panel.appendChild(pestanas);

    var cuerpo = el('div', 'lab-cuerpo');
    hojas.forEach(function (x, i) {
      x.h.hidden = i !== 0;
      cuerpo.appendChild(x.h);
    });
    pestanas.children[0].setAttribute('aria-selected', 'true');

    var queja = el('p', 'lab-aviso');
    queja.id = 'lab-queja';
    queja.hidden = true;
    cuerpo.appendChild(queja);

    panel.appendChild(cuerpo);

    var pie = el('div', 'lab-pie');
    pie.appendChild(boton('Volver a piedra', function () {
      estado = { tokens: {}, fijos: {} };
      aplicar();
    }));
    panel.appendChild(pie);

    document.body.appendChild(panel);

    var abrir = el('button', null, '✎');
    abrir.id = 'lab-abrir';
    abrir.type = 'button';
    abrir.title = 'Abrir el laboratorio (tecla L)';
    abrir.hidden = true;
    abrir.onclick = seguro(plegar);
    document.body.appendChild(abrir);

    function plegar() {
      var cerrado = !panel.hidden;
      panel.hidden = cerrado;
      abrir.hidden = !cerrado;
    }

    /* Con addEventListener y no con document.onkeydown: montarIndice() anula
       ese hueco cada vez que se repinta el índice. */
    document.addEventListener('keydown', seguro(function (e) {
      if (e.key !== 'l' && e.key !== 'L') return;
      var t = e.target || {};
      var etq = (t.tagName || '').toLowerCase();
      if (etq === 'input' || etq === 'textarea' || etq === 'select' || t.isContentEditable) return;
      plegar();
    }));
  }

  /* ================================================================
     6. Arranque
     ================================================================ */

  var estilo = document.createElement('link');
  estilo.rel = 'stylesheet';
  estilo.href = 'lab/lab.css';
  document.head.appendChild(estilo);

  raiz.classList.add('lab');

  estado = recuperar();
  montar();

  /* Sin token no hay a quién pedirle nada: la invitación la pinta el
     laboratorio con datos de mentira y la red se queda apagada. */
  if (!token) {
    window.pedir = pedirDeMentira;
    repintar('completo');
  }

  aplicar();
})();
