/* ====== EDITA ESTO ====== */
const API = 'https://script.google.com/macros/s/AKfycbylVOv614p1kH3pHOuUPaca0xuOKaK7o1miE0DUJaWQ3oLV4mHdkAEZVwf2fTtDPLPKpA/exec';

var BODA = {
  novios: 'Irene Alcalde Méndez e Ignacio Arenas Guerra',
  fecha:  '17 de Julio de 2027',
  lugar:  'Convento de Mave, Palencia',
  hora:   '12:30',
  mapa:   'https://www.google.com/maps/search/?api=1&query=Convento%20de%20Mave%20Palencia',
  // La misma fecha y hora de arriba, en formato máquina y con el desfase de
  // España en julio (+02:00), para que la cuenta atrás salga bien también si
  // alguien abre la invitación desde otro huso. Si cambias 'fecha' u 'hora',
  // cambia esto también.
  iso:    '2027-07-17T12:30:00+02:00',

  // Cómo entra el evento en el calendario del invitado cuando pulsa «Añadir a
  // mi calendario»: el nombre que verá en su agenda (corto, que en la vista de
  // mes se lee a medias) y las horas que le reservamos a partir de 'hora'.
  evento:   'Boda de Irene e Ignacio',
  duracion: 8,

  // La dirección completa, la que el calendario del invitado le convierte en un
  // mapa: 'lugar' es el nombre corto de la página y no le sirve para llegar.
  direccion: 'Hotel El Convento, Monasterio s/n, C. Mayor Smmv, 31, ' +
             '34492 Santa María de Mave, Palencia, España'
};

/* El autobús: los dos trayectos, con sus horas de salida y sus paradas en
   orden. El `id` de cada trayecto sirve para enlazarlo directo
   (…/?i=TOKEN#transporte-ida); el índice lateral entra por la sección entera.

   `salidas` admite varias horas (la vuelta hace el mismo camino dos veces) y
   cada parada lleva un `detalle` opcional con el punto exacto de recogida.
   Si `trayectos` se queda vacío, la sección no se pinta y el índice descarta
   sus entradas él solo, igual que con las fotos.

   `elegible: true` marca el trayecto cuyas salidas elige el invitado: esas
   horas salen como botones dentro de *Confirmar* y la elegida viaja a la hoja
   en el mismo envío que la confirmación. Solo tiene sentido en uno, y solo si
   tiene más de una hora. */
var TRANSPORTE = {
  /* Una línea debajo de los dos trayectos, por si hay que decir algo (reservar
     plaza, a quién avisar...). Vacía: no se pinta. */
  nota: 'Al confirmar tu asistencia nos dices en cuál de los dos autobuses de vuelta te guardamos sitio.',

  trayectos: [
    { id: 'transporte-ida', titulo: 'Ida',
      salidas: ['10:00'],
      paradas: [
        { lugar: 'Venta de Baños', detalle: 'Ayuntamiento' },
        { lugar: 'Palencia',       detalle: 'San Lázaro' },
        { lugar: 'Convento de Mave' }
      ] },

    { id: 'transporte-vuelta', titulo: 'Vuelta',
      salidas: ['21:30', '23:30'],
      elegible: true,
      paradas: [
        { lugar: 'Convento de Mave' },
        { lugar: 'Palencia',       detalle: 'San Lázaro' },
        { lugar: 'Venta de Baños', detalle: 'Ayuntamiento' }
      ] }
  ]
};

/* Índice lateral: el orden manda, y es también el orden en que se pintan las
   secciones. Cada `id` tiene que existir en la página o la entrada se descarta
   sola. Para añadir una sección, crea el <section class="seccion" id="...">
   dentro de pintar() (o mete una entrada en EN_OBRAS) y añádela aquí. */
var SECCIONES = [
  { id: 'inicio',        titulo: 'Inicio' },
  { id: 'fotos',         titulo: 'Fotos' },
  { id: 'el-dia',        titulo: 'El gran día' },
  { id: 'confirmar',     titulo: 'Confirmar' },
  { id: 'alergias',      titulo: 'Alergias' },
  { id: 'cuenta-atras',  titulo: 'Cuenta atrás' },
  { id: 'dedicatoria',   titulo: 'Dedicatoria' },
  { id: 'playlist',      titulo: 'Playlist' },
  { id: 'transporte',    titulo: 'Transporte' },
  { id: 'alojamiento',   titulo: 'Alojamiento' },
  { id: 'sitio-web',     titulo: 'Sitio web' }
];

/* Secciones todavía en obras: de momento solo enseñan el sello y una promesa.
   El `id` tiene que coincidir con el de SECCIONES y el orden de arriba es el
   que manda; estas se pintan solas donde toque. Para rellenar una, bórrala de
   aquí y escribe su <section> a mano en pintar(). */
var EN_OBRAS = [
  { id: 'dedicatoria', titulo: 'Dedicatoria',
    texto: 'Aquí irán unas palabras nuestras. Todavía las estamos escribiendo.' },

  { id: 'alojamiento', titulo: 'Alojamiento',
    texto: 'Estamos apalabrando habitaciones cerca del convento. Aquí verás los sitios y los precios.' },

  { id: 'sitio-web', titulo: 'Sitio web',
    texto: 'Habrá una página con todos los detalles de la boda. Sigue en obras.' }
];

/* El subtítulo que aparece bajo los botones nada más elegir. */
var RESPUESTAS = {
  si: '¡Nos alegramos mucho de oírlo!',
  no: 'No te preocupes, lo entendemos perfectamente'
};

var ALERGENOS = [
  'Gluten', 'Lactosa', 'Frutos secos', 'Marisco',
  'Pescado', 'Huevo', 'Soja', 'Vegetariano', 'Vegano'
];

/* Canciones que puede proponer cada invitado. Tiene que ser el mismo número
   que MAX_CANCIONES en Code.gs, que es quien manda: al añadir una de más, el
   backend sustituye a la más antigua en vez de rechazarla.
   ITUNES_PAIS es el catálogo de iTunes en el que se busca. */
var MAX_CANCIONES = 3;
var ITUNES_PAIS = 'ES';

/* Fotos de la sección «Fotos». Van en la carpeta img/ del repo, con la ruta
   relativa: en un repo de proyecto la página cuelga de /REPO/, así que
   'img/foo.webp' funciona y '/img/foo.webp' da 404.

   'ancho' y 'alto' son los píxeles reales del archivo; el navegador
   reserva el hueco con ellos y la página no pega saltos al cargar.
   'pie' es opcional.

   var FOTOS = [
     { src: 'img/mave-claustro.webp', ancho: 1200, alto: 800,
       alt: 'El claustro del convento de Mave' },
     { src: 'img/irene-ignacio.webp', ancho: 1200, alto: 1600,
       alt: 'Irene e Ignacio en el mirador', pie: 'El día que lo decidimos' }
   ];

   Lista vacía: no hay sección y el índice descarta su entrada. */
var FOTOS = [
     { src: 'img/claustro-mave.webp', ancho: 1200, alto: 800,
       alt: 'El claustro del convento de Mave' },
     { src: 'img/claustro-mave2.webp', ancho: 1200, alto: 800,
       alt: 'El claustro del convento de Mave 2' },
];
/* ======================== */

var app = document.getElementById('app');
var token = (function () {
  var m = location.search.match(/[?&]i=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : '';
})();

var elegido = null;          // true | false | null
var marcados = {};           // alérgenos seleccionados
var vuelta = null;           // hora del autobús de vuelta, SIN_VUELTA, o null

/* Lo que ya está en la hoja, campo a campo. Es lo que da un formulario por
   hecho —y por tanto lo que se pliega—, y no lo que haya en los campos: un chip
   marcado sin enviar no cuenta. Se llena al cargar con lo que devuelve el
   backend y en cada envío que sale bien. */
var guardado = { asiste: false, alergenos: false, vuelta: false };

var canciones = [];          // las que ya ha mandado este invitado
var hallazgos = [];          // lo último que devolvió iTunes
var buscador = null;         // temporizador del debounce del buscador
var buscadaN = 0;            // descarta lo que llegue de búsquedas ya pasadas

