/* ====== EDITA ESTO ======
   Son los valores de respaldo. Lo que está en la pestaña «Configuracion» de la
   hoja tiene prioridad (ver js/configuracion.js y leerConfiguracion_() en
   Code.gs): cambiar algo ahí no necesita redesplegar nada. Si la hoja no
   responde, se ve esto. */
const API = 'https://script.google.com/macros/s/AKfycbylVOv614p1kH3pHOuUPaca0xuOKaK7o1miE0DUJaWQ3oLV4mHdkAEZVwf2fTtDPLPKpA/exec';

var BODA = {
  novios: 'Irene Alcalde Méndez e Ignacio Arenas Guerra',

  // Los nombres de pila, para la primera pantalla: van uno debajo del otro con
  // el «&» en medio, como en una invitación impresa. 'novios' sigue siendo el
  // nombre completo que firma la portada. Si esta lista se queda vacía, la
  // presentación tira de 'novios'.
  nombres: ['Irene', 'Ignacio'],

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
   horas salen como botones dentro de *Transporte* y la elegida viaja a la hoja
   en su propio envío. Solo tiene sentido en uno, y solo si tiene más de una
   hora. */
var TRANSPORTE = {
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
   dentro de pintar() (o mete una entrada en EN_OBRAS) y añádela aquí.

   Es el orden de partida, no el de siempre: en cuanto el invitado guarda un
   formulario, su sección se va al final de la página y al apartado «Hecho» del
   índice (ordenarSecciones(), en js/indice.js). Dentro de cada montón —lo que
   queda y lo hecho— siguen mandando estas líneas. */
var SECCIONES = [
  { id: 'presentacion',  titulo: 'Presentación' },
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

/* Secciones todavía en obras: **no se pintan**. Aparecen al final del índice,
   como botones apagados bajo el aviso de que se habilitarán pronto, y en la
   página no ocupan nada: hasta que tengan algo que enseñar, una pantalla con
   una promesa dentro es una pantalla de más entre medias.

   El `id` tiene que coincidir con el de SECCIONES —ahí es donde está apuntado
   el sitio que le toca cuando se estrene— y el orden de aquí es el que llevan
   en el menú. Para estrenar una: bórrala de esta lista y escribe su <section>
   a mano en pintar(), en el sitio que dice SECCIONES. */
var EN_OBRAS = [
  { id: 'dedicatoria', titulo: 'Dedicatoria' },
  { id: 'alojamiento', titulo: 'Alojamiento' },
  { id: 'sitio-web',   titulo: 'Sitio web' }
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

/* Canciones que puede proponer cada invitado. El backend (MAX_CANCIONES en
   Code.gs) manda: al añadir una de más, sustituye a la más antigua en vez de
   rechazarla. ITUNES_PAIS es el catálogo de iTunes en el que se busca. */
var MAX_CANCIONES = 3;
var ITUNES_PAIS = 'ES';

/* Fotos de la sección «Fotos». `src` puede ser una ruta relativa dentro del
   repo (img/foo.webp, que en un repo de proyecto sirve sin barra inicial) o una
   URL https:// de cualquier alojamiento.

   'ancho' y 'alto' son los píxeles reales del archivo; el navegador
   reserva el hueco con ellos y la página no pega saltos al cargar.
   'pie' es opcional.

   Lista vacía: no hay sección y el índice descarta su entrada. */
var FOTOS = [
  { src: 'img/claustro-mave.webp', ancho: 1200, alto: 800,
    alt: 'El claustro del convento de Mave' },
  { src: 'img/claustro-mave2.webp', ancho: 1200, alto: 800,
    alt: 'El claustro del convento de Mave 2' }
];

/* Los textos de la página. Cada clave se usa con t('clave') (js/configuracion.js).
   Los que llevan {algo} se rellenan al pintar. Las frases de *Inicio* van partidas
   en tres para que no haya HTML dentro: el <strong> lo pone el código. */
var TEXTOS = {
  presenta_rotulo: 'Nos casamos',
  presenta_enlace: 'Confirma tu asistencia',

  inicio_saludo: 'Hola',
  inicio_cita_1: 'Como ya sabes',
  inicio_cita_destacado: '¡Nos casamos!',
  inicio_cita_2: 'y nos encantaría que nos acompañases en este día tan especial.',
  inicio_cita_3: 'Aquí te dejamos algunos detalles y toda la información que necesitas.',

  titulo_fotos: 'Fotos',

  titulo_dia: 'El gran día',
  dia_fecha: 'Fecha',
  dia_hora: 'Hora',
  dia_lugar: 'Lugar',
  dia_mapa: 'Ver cómo llegar',

  titulo_confirmar: '¿Nos acompañas?',
  confirmar_si: 'Sí, allí estaré',
  confirmar_no: 'No podré ir',
  confirmar_mensaje: 'Un mensaje para nosotros',
  confirmar_mensaje_pista: 'Opcional',
  confirmar_enviar: 'Enviar confirmación',
  confirmar_guardado_si: 'Guardado. Nos vemos allí.',
  confirmar_guardado_no: 'Guardado. Te echaremos de menos.',
  resumen_si: 'Sí, allí estarás',
  resumen_no: 'No podrás venir',
  resumen_con_mensaje: 'con mensaje',
  bloque_cambiar: 'Cambiar',
  bloque_cerrar: 'Cerrar',

  titulo_alergias: 'Alergias e intolerancias',
  alergias_ayuda: 'Marca lo que necesites. Se lo pasamos tal cual a la cocina.',
  alergias_otros: 'Otra cosa que debamos saber',
  alergias_otros_pista: 'Otra alergia, medicación, lo que sea',
  alergias_enviar: 'Guardar alergias',
  alergias_guardado: 'Guardado. Se lo pasamos a la cocina.',

  titulo_cuenta: 'Cuenta atrás',
  cuenta_hoy: 'Hoy nos casamos',
  cuenta_dia: 'día',
  cuenta_dias: 'días',
  cuenta_hora: 'hora',
  cuenta_horas: 'horas',
  cuenta_min: 'min',
  cuenta_seg: 'seg',
  cuenta_menos_de_un_dia: 'Falta menos de un día para la boda.',
  cuenta_faltan: 'Faltan {n} {dias} para la boda.',
  calendario_rotulo: 'Save the date',
  calendario_texto: 'Guarda el {fecha} en tu calendario y deja que te avise él.',
  calendario_boton: 'Añadir a mi calendario',
  calendario_google: 'Abrir en Google Calendar',
  calendario_listo: 'Listo: abre el archivo y tu calendario hace el resto.',
  calendario_error: 'Este navegador no nos deja preparar el archivo. Abre el enlace de Google Calendar.',
  evento_descripcion: 'Nos casamos en {lugar}. La ceremonia es a las {hora}.',

  titulo_playlist: 'Pon tú la música',
  playlist_ayuda: 'Busca hasta {max} canciones y te las apuntamos. Si añades una más, sustituye a la más antigua.',
  playlist_tus_canciones: 'Tus canciones',
  playlist_buscar: 'Busca una canción',
  playlist_buscar_pista: 'Título o artista',
  playlist_vacia: 'Todavía no has propuesto ninguna.',
  playlist_sin_artista: 'Sin artista',
  playlist_anadir: 'Añadir',
  playlist_quitar: 'Quitar',
  playlist_sin_resultados: 'No encontramos nada con eso.',
  playlist_manual: 'Añadirla tal cual',
  playlist_repetida: 'Esa ya la tenías apuntada.',
  playlist_apuntada: 'Apuntada.',
  playlist_apuntada_quitada: 'Apuntada. Hemos quitado «{cancion}» para hacerle sitio.',
  playlist_quitada: 'Quitada.',
  playlist_guardando: 'Guardando…',
  playlist_quitando: 'Quitando…',
  playlist_error_buscar: 'No hemos podido buscar. Prueba otra vez en un momento.',
  playlist_error_quitar: 'No se ha podido quitar. Inténtalo otra vez.',
  resumen_playlist_uno: '1 canción propuesta',
  resumen_playlist: '{n} canciones propuestas',

  titulo_transporte: 'Transporte',
  transporte_nota: 'Al confirmar tu asistencia nos dices en cuál de los dos autobuses de vuelta te guardamos sitio.',
  transporte_salida: 'Salida',
  transporte_salidas: 'Salidas',
  transporte_vuelta: 'Autobús de vuelta',
  transporte_vuelta_ayuda: 'Sale del convento hacia Palencia y Venta de Baños. Dinos con cuál contamos.',
  transporte_sin_vuelta: 'No lo necesito',
  transporte_guardar: 'Guardar mi autobús',
  transporte_guardado: 'Guardado. Te guardamos sitio.',
  resumen_vuelta: 'Vuelta a las {hora}',
  resumen_sin_vuelta: 'Sin autobús de vuelta',

  indice_hecho: 'Hecho',
  indice_proximamente: 'Próximamente',
  indice_obras_nota: 'Estas secciones se habilitarán pronto.',
  indice_hecho_voz: '(hecho)',

  guardando: 'Guardando…',
  error_guardar: 'No se ha podido guardar. Inténtalo otra vez.',
  error_servidor: 'No se ha podido guardar: el servidor necesita una actualización. Escríbenos y lo arreglamos.',
  resumen_marca_voz: 'Hecho',

  aviso_incompleto: 'Este enlace está incompleto. Escríbenos y te mandamos el tuyo.',
  aviso_no_encontrado: 'No encontramos este enlace. Escríbenos y lo revisamos.',
  aviso_sin_conexion: 'No hemos podido conectar. Prueba otra vez en un momento.'
};

/* --- lo que el navegador guarda mientras pinta: no se toca a mano --- */

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
