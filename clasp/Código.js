const SHEET_ID = '1CWyE4-3iV2gzqoiOMJK4cf291ZrbVU8iNR_fGE6i6cY';
const HOJA = 'InvitacionesWeb';
const HOJA_CANCIONES = 'Canciones';
const HOJA_CONFIG = 'Configuracion';

/**
 * Boda — backend sobre Google Sheets.
 *
 * Pestaña "Invitados", cabeceras en la fila 1:
 *   A: token   B: nombre   C: asiste   D: fecha_respuesta   E: alergenos   F: nota
 *   G: vuelta  (hora del autobús de vuelta, o "No")
 *   H: ida     (hora del autobús de ida, o "No")
 *
 * Pestaña "Canciones" (se crea sola con la primera sugerencia):
 *   A: id   B: fecha   C: token   D: nombre   E: cancion
 *   F: artista   G: album   H: itunes_id   I: enlace
 *
 * Pestaña "Configuracion" (lo que se ve en la invitación, ver leerConfiguracion_):
 *   bloques separados por una fila vacía, cada uno con su [NOMBRE] en la columna A
 *
 * Publicar: Implementar > Nueva implementación > Aplicación web
 *   Ejecutar como: Yo
 *   Quién tiene acceso: Cualquier usuario
 */

const COL = { token: 1, nombre: 2, asiste: 3, fecha: 4, alergenos: 5, nota: 6, vuelta: 7, ida: 8 };

/* Cada sección de la invitación guarda lo suyo por separado, así que el cuerpo
   del POST trae solo sus campos: la confirmación manda `asiste` y `nota`, las
   alergias `alergenos`, el transporte `vuelta`. La tabla dice a qué columna va
   cada uno y cómo se normaliza; lo que no venga en el cuerpo no se toca, que es
   lo que permite guardar un formulario sin borrar los otros. */
const CAMPOS = {
  asiste:    { col: COL.asiste,    valor: function (v) { return v === true ? 'SI' : 'NO'; } },
  alergenos: { col: COL.alergenos, valor: function (v) { return String(v || '').slice(0, 500); } },
  nota:      { col: COL.nota,      valor: function (v) { return String(v || '').slice(0, 1000); } },
  vuelta:    { col: COL.vuelta,    valor: function (v) { return String(v || '').slice(0, 20); } },
  ida:       { col: COL.ida,       valor: function (v) { return String(v || '').slice(0, 20); } }
};

const COL_C = { id: 1, fecha: 2, token: 3, nombre: 4,
                cancion: 5, artista: 6, album: 7, itunes_id: 8, enlace: 9 };

/* Canciones que puede proponer cada invitado. El mismo número está en
   index.html; si cambia aquí, cambia allí. */
const MAX_CANCIONES = 3;

const CABECERAS_CANCIONES = ['id', 'fecha', 'token', 'nombre', 'cancion',
                             'artista', 'album', 'itunes_id', 'enlace'];

function hoja_() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(HOJA);
}

/** La pestaña de canciones, creándola con sus cabeceras si todavía no existe. */
function hojaCanciones_() {
  const libro = SpreadsheetApp.openById(SHEET_ID);
  let h = libro.getSheetByName(HOJA_CANCIONES);
  if (h) return h;

  h = libro.insertSheet(HOJA_CANCIONES);
  h.getRange(1, 1, 1, CABECERAS_CANCIONES.length).setValues([CABECERAS_CANCIONES]);
  h.setFrozenRows(1);
  return h;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* Cadena aleatoria sin caracteres ambiguos (0/O, 1/I/l), por si alguien la
   teclea a mano. */
function idAleatorio_(longitud) {
  const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < longitud; i++) {
    s += ALFABETO.charAt(Math.floor(Math.random() * ALFABETO.length));
  }
  return s;
}

/** Devuelve el número de fila del token, o null. */
function buscarFila_(token) {
  const h = hoja_();
  const ultima = h.getLastRow();
  if (ultima < 2) return null;

  const tokens = h.getRange(2, COL.token, ultima - 1, 1).getValues();
  for (let i = 0; i < tokens.length; i++) {
    if (String(tokens[i][0]).trim() === token) return i + 2;
  }
  return null;
}

/**
 * La hora de vuelta se guarda como texto ("21:30"). Si alguien la ha escrito a
 * mano en la hoja, Sheets puede habérsela quedado como hora; la devolvemos
 * siempre con la misma pinta que los botones de la invitación.
 */
function vueltaTexto_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'HH:mm');
  }
  return String(v || '').trim();
}

/**
 * Canciones de un invitado, de la más vieja a la más nueva. `fila` es para
 * escribir encima o borrarla; se quita antes de mandarlas al navegador.
 */
function cancionesDe_(token) {
  const h = hojaCanciones_();
  const ultima = h.getLastRow();
  if (ultima < 2) return [];

  const filas = h.getRange(2, 1, ultima - 1, CABECERAS_CANCIONES.length).getValues();
  const suyas = [];

  for (let i = 0; i < filas.length; i++) {
    const f = filas[i];
    if (String(f[COL_C.token - 1]).trim() !== token) continue;
    suyas.push({
      fila:      i + 2,
      id:        String(f[COL_C.id - 1] || ''),
      fecha:     f[COL_C.fecha - 1],
      cancion:   String(f[COL_C.cancion - 1] || ''),
      artista:   String(f[COL_C.artista - 1] || ''),
      album:     String(f[COL_C.album - 1] || ''),
      itunes_id: String(f[COL_C.itunes_id - 1] || ''),
      enlace:    String(f[COL_C.enlace - 1] || '')
    });
  }

  suyas.sort(function (a, b) {
    const ta = a.fecha instanceof Date ? a.fecha.getTime() : 0;
    const tb = b.fecha instanceof Date ? b.fecha.getTime() : 0;
    return ta - tb;
  });
  return suyas;
}

/* La misma lista, sin el número de fila: eso no sale de aquí. */
function cancionesFuera_(lista) {
  return lista.map(function (c) {
    return {
      id: c.id, cancion: c.cancion, artista: c.artista,
      album: c.album, itunes_id: c.itunes_id, enlace: c.enlace
    };
  });
}

/** GET ?token=XXXX -> { ok, nombre, asiste, alergenos, nota, ida, vuelta, canciones, config } */
function doGet(e) {
  const token = String((e.parameter && e.parameter.token) || '').trim();
  if (!token) return json_({ ok: false, error: 'sin_token' });

  const fila = buscarFila_(token);
  if (!fila) return json_({ ok: false, error: 'no_encontrado' });

  const f = hoja_().getRange(fila, COL.nombre, 1, 7).getValues()[0];
  // f = [nombre, asiste, fecha, alergenos, nota, vuelta, ida]
  return json_({
    ok: true,
    nombre: f[0],
    asiste: f[1] || null,
    alergenos: f[3] || '',
    nota: f[4] || '',
    ida: vueltaTexto_(f[6]),
    vuelta: vueltaTexto_(f[5]),
    canciones: cancionesFuera_(cancionesDe_(token)),
    config: configuracionSegura_()
  });
}

/* Una hoja de configuración rota no puede dejar sin invitación a nadie: si
   falla la lectura, se responde sin `config` y el navegador usa lo de datos.js. */
function configuracionSegura_() {
  try {
    return leerConfiguracion_();
  } catch (err) {
    return {};
  }
}

/* --- configuración: lo que se ve en la invitación, editable desde la hoja --- */

/*
 * Parte la pestaña en bloques. Cada bloque empieza con su nombre entre
 * corchetes en la columna A ([BODA]); la fila de debajo son las cabeceras y las
 * siguientes, una por elemento. Una fila vacía cierra el bloque.
 */
function bloquesConfiguracion_(h) {
  const filas = h.getDataRange().getValues();
  const bloques = {};
  let bloque = null;
  let cabeceras = null;

  filas.forEach(function (f) {
    const primera = String(f[0]).trim();
    if (!primera) { bloque = null; return; }

    const m = primera.match(/^\[([A-Z_]+)\]$/);
    if (m) {
      bloque = bloques[m[1]] = [];
      cabeceras = null;
      return;
    }
    if (!bloque) return;

    if (!cabeceras) {
      cabeceras = f.map(function (c) { return String(c).trim(); });
      return;
    }
    const fila = {};
    cabeceras.forEach(function (c, i) { if (c) fila[c] = f[i]; });
    bloque.push(fila);
  });
  return bloques;
}

/*
 * Lo que hay en una celda, como texto. Sheets convierte "12:30" en hora y una
 * fecha en Date si la celda no es de texto; crearHojaConfiguracion() la deja en
 * texto, y esto cubre lo que se escriba a mano después.
 */
function celda_(v) {
  if (v instanceof Date) {
    const zona = Session.getScriptTimeZone();
    return v.getFullYear() < 1950
      ? Utilities.formatDate(v, zona, 'HH:mm')                      // una hora
      : Utilities.formatDate(v, zona, "yyyy-MM-dd'T'HH:mm:ssXXX");  // una fecha
  }
  return String(v == null ? '' : v).trim();
}

/* Un bloque clave | valor, como objeto. Lo vacío no entra: manda el del código. */
function paresDe_(lista) {
  const p = {};
  (lista || []).forEach(function (f) {
    const k = celda_(f.clave);
    const v = celda_(f.valor);
    if (k && v) p[k] = v;
  });
  return p;
}

/* Una lista de { id, titulo }, sin filas que no tengan id. */
function listaConId_(lista) {
  return (lista || [])
    .map(function (f) { return { id: celda_(f.id), titulo: celda_(f.titulo) }; })
    .filter(function (s) { return s.id; });
}

/*
 * La configuración tal como la lee el navegador. Cada bloque que falte o esté
 * vacío no aparece en el resultado, y entonces el navegador usa lo de
 * js/datos.js. Los números y las listas llegan ya convertidos.
 */
function leerConfiguracion_() {
  const h = hojaConfig_();
  if (!h) return {};

  const b = bloquesConfiguracion_(h);

  const boda = paresDe_(b.BODA);
  if (boda.nombres) boda.nombres = boda.nombres.split(',').map(function (n) { return n.trim(); }).filter(Boolean);
  if (boda.duracion) boda.duracion = Number(boda.duracion);

  const ajustes = paresDe_(b.AJUSTES);

  const paradas = {};
  (b.PARADAS || []).forEach(function (f) {
    const t = celda_(f.trayecto);
    if (!t) return;
    (paradas[t] = paradas[t] || []).push({
      orden: Number(f.orden) || 0,
      lugar: celda_(f.lugar),
      detalle: celda_(f.detalle)
    });
  });

  return {
    boda: boda,
    textos: paresDe_(b.TEXTOS),
    respuestas: paresDe_(b.RESPUESTAS),
    ajustes: {
      max_canciones: Number(ajustes.max_canciones) || 0,
      itunes_pais: ajustes.itunes_pais || ''
    },
    alergenos: (b.ALERGENOS || []).map(function (f) { return celda_(f.alergeno); }).filter(Boolean),
    secciones: listaConId_(b.SECCIONES),
    en_obras: listaConId_(b.EN_OBRAS),
    fotos: (b.FOTOS || [])
      .map(function (f) {
        return {
          src: celda_(f.src),
          ancho: Number(f.ancho),
          alto: Number(f.alto),
          alt: celda_(f.alt),
          pie: celda_(f.pie)
        };
      })
      .filter(function (f) { return f.src; }),
    transporte: (b.TRANSPORTE || [])
      .map(function (f) {
        const id = celda_(f.id);
        const ps = (paradas[id] || []).sort(function (x, y) { return x.orden - y.orden; });
        return {
          id: id,
          titulo: celda_(f.titulo),
          salidas: celda_(f.salidas).split(',').map(function (s) { return s.trim(); }).filter(Boolean),
          elegible: celda_(f.elegible).toUpperCase() === 'SI',
          paradas: ps.map(function (p) { return { lugar: p.lugar, detalle: p.detalle }; })
        };
      })
      .filter(function (t) { return t.id; })
  };
}

/** Cuántas canciones puede proponer cada invitado: la hoja manda, el código respalda. */
function maxCanciones_() {
  const n = leerConfiguracion_().ajustes;
  return n && n.max_canciones > 0 ? n.max_canciones : MAX_CANCIONES;
}

function hojaConfig_() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(HOJA_CONFIG);
}

/*
 * Crea la pestaña Configuracion con los valores actuales de js/datos.js, para
 * que la hoja y la invitación empiecen iguales. Si ya existe, no toca nada.
 * Ejecutar a mano desde el editor de Apps Script, una sola vez.
 */
function crearHojaConfiguracion() {
  const libro = SpreadsheetApp.openById(SHEET_ID);
  if (libro.getSheetByName(HOJA_CONFIG)) {
    Logger.log('La pestaña "' + HOJA_CONFIG + '" ya existe');
    return;
  }

  const filas = filasConfiguracionInicial_();
  const ancho = filas.reduce(function (m, f) { return Math.max(m, f.length); }, 1);
  const relleno = filas.map(function (f) {
    const r = f.slice();
    while (r.length < ancho) r.push('');
    return r;
  });

  const h = libro.insertSheet(HOJA_CONFIG);
  // Todo en texto: si no, Sheets convierte "12:30" o la fecha ISO en fecha.
  h.getRange(1, 1, Math.max(relleno.length, 300), ancho + 2).setNumberFormat('@');
  h.getRange(1, 1, relleno.length, ancho).setValues(relleno);
  h.setColumnWidth(1, 150);
  h.setColumnWidth(2, 420);
  Logger.log('Pestaña "' + HOJA_CONFIG + '" creada');
}

/* Los valores de partida: uno por fila, y cada bloque con su nombre entre
   corchetes y una fila vacía detrás. Espejan los de js/datos.js; a partir de
   aquí manda la hoja. */
function filasConfiguracionInicial_() {
  const bloques = [
    ['[BODA]'],
    ['clave', 'valor'],
    ['novios', 'Irene Alcalde Méndez e Ignacio Arenas Guerra'],
    ['nombres', 'Irene, Ignacio'],
    ['fecha', '17 de Julio de 2027'],
    ['lugar', 'Convento de Mave, Palencia'],
    ['hora', '12:30'],
    ['mapa', 'https://www.google.com/maps/search/?api=1&query=Convento%20de%20Mave%20Palencia'],
    ['iso', '2027-07-17T12:30:00+02:00'],
    ['evento', 'Boda de Irene e Ignacio'],
    ['duracion', '8'],
    ['direccion', 'Hotel El Convento, Monasterio s/n, C. Mayor Smmv, 31, 34492 Santa María de Mave, Palencia, España'],
    [],

    ['[AJUSTES]'],
    ['clave', 'valor'],
    ['max_canciones', '3'],
    ['itunes_pais', 'ES'],
    [],

    ['[TEXTOS]'],
    ['clave', 'valor'],
    ['presenta_rotulo', 'Nos casamos'],
    ['presenta_enlace', 'Confirma tu asistencia'],
    ['inicio_saludo', 'Hola'],
    ['inicio_cita_1', 'Como ya sabes'],
    ['inicio_cita_destacado', '¡Nos casamos!'],
    ['inicio_cita_2', 'y nos encantaría que nos acompañases en este día tan especial.'],
    ['inicio_cita_3', 'Aquí te dejamos algunos detalles y toda la información que necesitas.'],
    ['titulo_fotos', 'Fotos'],
    ['titulo_dia', 'El gran día'],
    ['dia_fecha', 'Fecha'],
    ['dia_hora', 'Hora'],
    ['dia_lugar', 'Lugar'],
    ['dia_mapa', 'Ver cómo llegar'],
    ['titulo_confirmar', '¿Nos acompañas?'],
    ['confirmar_si', 'Sí, allí estaré'],
    ['confirmar_no', 'No podré ir'],
    ['confirmar_mensaje', 'Un mensaje para nosotros'],
    ['confirmar_mensaje_pista', 'Opcional'],
    ['confirmar_enviar', 'Enviar confirmación'],
    ['confirmar_guardado_si', 'Guardado. Nos vemos allí.'],
    ['confirmar_guardado_no', 'Guardado. Te echaremos de menos.'],
    ['resumen_si', 'Sí, allí estarás'],
    ['resumen_no', 'No podrás venir'],
    ['resumen_con_mensaje', 'con mensaje'],
    ['bloque_cambiar', 'Cambiar'],
    ['bloque_cerrar', 'Cerrar'],
    ['titulo_alergias', 'Alergias e intolerancias'],
    ['alergias_ayuda', 'Marca lo que necesites. Se lo pasamos tal cual a la cocina.'],
    ['alergias_otros', 'Otra cosa que debamos saber'],
    ['alergias_otros_pista', 'Otra alergia, medicación, lo que sea'],
    ['alergias_enviar', 'Guardar alergias'],
    ['alergias_guardado', 'Guardado. Se lo pasamos a la cocina.'],
    ['titulo_cuenta', 'No puedo esperar, ¿Cuándo?'],
    ['cuenta_hoy', 'Hoy nos casamos'],
    ['cuenta_dia', 'día'],
    ['cuenta_dias', 'días'],
    ['cuenta_hora', 'hora'],
    ['cuenta_horas', 'horas'],
    ['cuenta_min', 'min'],
    ['cuenta_seg', 'seg'],
    ['cuenta_menos_de_un_dia', 'Falta menos de un día para la boda.'],
    ['cuenta_faltan', 'Faltan {n} {dias} para la boda.'],
    ['calendario_rotulo', 'Save the date'],
    ['calendario_texto', 'Guarda el {fecha} en tu calendario y deja que te avise él.'],
    ['calendario_boton', 'Añadir a mi calendario'],
    ['calendario_google', 'Abrir en Google Calendar'],
    ['calendario_listo', 'Listo: abre el archivo y tu calendario hace el resto.'],
    ['calendario_error', 'Este navegador no nos deja preparar el archivo. Abre el enlace de Google Calendar.'],
    ['evento_descripcion', 'Nos casamos en {lugar}. La ceremonia es a las {hora}.'],
    ['titulo_playlist', 'Pon tú la música'],
    ['playlist_ayuda', 'Busca hasta {max} canciones y te las apuntamos. Si añades una más, sustituye a la más antigua.'],
    ['playlist_tus_canciones', 'Tus canciones'],
    ['playlist_buscar', 'Busca una canción'],
    ['playlist_buscar_pista', 'Título o artista'],
    ['playlist_vacia', 'Todavía no has propuesto ninguna.'],
    ['playlist_sin_artista', 'Sin artista'],
    ['playlist_anadir', 'Añadir'],
    ['playlist_quitar', 'Quitar'],
    ['playlist_sin_resultados', 'No encontramos nada con eso.'],
    ['playlist_manual', 'Añadirla tal cual'],
    ['playlist_repetida', 'Esa ya la tenías apuntada.'],
    ['playlist_apuntada', 'Apuntada.'],
    ['playlist_apuntada_quitada', 'Apuntada. Hemos quitado «{cancion}» para hacerle sitio.'],
    ['playlist_quitada', 'Quitada.'],
    ['playlist_guardando', 'Guardando…'],
    ['playlist_quitando', 'Quitando…'],
    ['playlist_error_buscar', 'No hemos podido buscar. Prueba otra vez en un momento.'],
    ['playlist_error_quitar', 'No se ha podido quitar. Inténtalo otra vez.'],
    ['resumen_playlist_uno', '1 canción propuesta'],
    ['resumen_playlist', '{n} canciones propuestas'],
    ['titulo_transporte', 'Transporte'],
    ['transporte_nota', 'Al confirmar tu asistencia nos dices en cuál de los dos autobuses de vuelta te guardamos sitio.'],
    ['transporte_salida', 'Salida'],
    ['transporte_salidas', 'Salidas'],
    ['transporte_vuelta', 'Autobús de vuelta'],
    ['transporte_vuelta_ayuda', 'Sale del convento hacia Palencia y Venta de Baños. Dinos con cuál contamos.'],
    ['transporte_sin_vuelta', 'No lo necesito'],
    ['transporte_guardar', 'Guardar mi autobús'],
    ['transporte_guardado', 'Guardado. Te guardamos sitio.'],
    ['resumen_vuelta', 'Vuelta a las {hora}'],
    ['resumen_sin_vuelta', 'Sin autobús de vuelta'],
    ['indice_hecho', 'Hecho'],
    ['indice_proximamente', 'Próximamente'],
    ['indice_obras_nota', 'Estas secciones se habilitarán pronto.'],
    ['indice_hecho_voz', '(hecho)'],
    ['guardando', 'Guardando…'],
    ['error_guardar', 'No se ha podido guardar. Inténtalo otra vez.'],
    ['error_servidor', 'No se ha podido guardar: el servidor necesita una actualización. Escríbenos y lo arreglamos.'],
    ['resumen_marca_voz', 'Hecho'],
    ['aviso_incompleto', 'Este enlace está incompleto. Escríbenos y te mandamos el tuyo.'],
    ['aviso_no_encontrado', 'No encontramos este enlace. Escríbenos y lo revisamos.'],
    ['aviso_sin_conexion', 'No hemos podido conectar. Prueba otra vez en un momento.'],
    [],

    ['[RESPUESTAS]'],
    ['clave', 'valor'],
    ['si', '¡Nos alegramos mucho de oírlo!'],
    ['no', 'No te preocupes, lo entendemos perfectamente'],
    [],

    ['[ALERGENOS]'],
    ['alergeno'],
    ['Gluten'], ['Lactosa'], ['Frutos secos'], ['Marisco'], ['Pescado'],
    ['Huevo'], ['Soja'], ['Vegetariano'], ['Vegano'],
    [],

    ['[SECCIONES]'],
    ['id', 'titulo'],
    ['presentacion', 'Presentación'],
    ['inicio', 'Inicio'],
    ['cuenta-atras', 'Cuenta atrás'],
    ['el-dia', 'El gran día'],
    ['confirmar', 'Confirmar'],
    ['mas-detalles', 'Más detalles'],
    ['dedicatoria', 'Dedicatoria'],
    ['alojamiento', 'Alojamiento'],
    ['sitio-web', 'Sitio web'],
    [],

    ['[EN_OBRAS]'],
    ['id', 'titulo'],
    ['dedicatoria', 'Dedicatoria'],
    ['alojamiento', 'Alojamiento'],
    ['sitio-web', 'Sitio web'],
    [],

    ['[FOTOS]'],
    ['src', 'ancho', 'alto', 'alt', 'pie'],
    ['img/claustro-mave.webp', '1200', '800', 'El claustro del convento de Mave', ''],
    ['img/claustro-mave2.webp', '1200', '800', 'El claustro del convento de Mave 2', ''],
    [],

    ['[TRANSPORTE]'],
    ['id', 'titulo', 'salidas', 'elegible'],
    ['transporte-ida', 'Ida', '10:00', 'NO'],
    ['transporte-vuelta', 'Vuelta', '21:30, 23:30', 'SI'],
    [],

    ['[PARADAS]'],
    ['trayecto', 'orden', 'lugar', 'detalle'],
    ['transporte-ida', '1', 'Venta de Baños', 'Ayuntamiento'],
    ['transporte-ida', '2', 'Palencia', 'San Lázaro'],
    ['transporte-ida', '3', 'Mave', ''],
    ['transporte-vuelta', '1', 'Mave', ''],
    ['transporte-vuelta', '2', 'Palencia', 'San Lázaro'],
    ['transporte-vuelta', '3', 'Venta de Baños', 'Ayuntamiento']
  ];
  return bloques;
}

/*
 * Guarda los campos de CAMPOS que traiga el cuerpo, celda a celda, y deja el
 * resto de la fila como estaba. Es lo que hace que los formularios de la
 * invitación sean independientes: antes se escribía C a G de una vez y guardar
 * solo la hora del autobús borraba los alérgenos.
 *
 * Devuelve el objeto de respuesta, sin serializar.
 */
function guardarRespuesta_(datos, fila) {
  const h = hoja_();
  const escritos = [];

  Object.keys(CAMPOS).forEach(function (nombre) {
    if (!Object.prototype.hasOwnProperty.call(datos, nombre)) return;
    const campo = CAMPOS[nombre];

    // Texto plano en la columna de la vuelta: si no, Sheets se queda "21:30"
    // como una hora y deja de coincidir con los botones de la invitación.
    if (campo.col === COL.vuelta || campo.col === COL.ida) { h.getRange(fila, campo.col).setNumberFormat('@'); }

    h.getRange(fila, campo.col).setValue(campo.valor(datos[nombre]));
    escritos.push(nombre);
  });

  // Ni un campo conocido: mejor decirlo que devolver un ok que no guardó nada.
  if (!escritos.length) return { ok: false, error: 'sin_campos' };

  h.getRange(fila, COL.fecha).setValue(new Date());
  return { ok: true, guardado: escritos };
}

/*
 * Añade una canción. Con MAX_CANCIONES ya puestas, la nueva escribe encima de
 * la más vieja: así nadie se queda sin poder cambiar de idea. Repetir una que
 * ya tiene no gasta hueco.
 */
function guardarCancion_(datos, token, fila) {
  const cancion = String(datos.cancion || '').trim().slice(0, 200);
  if (!cancion) return { ok: false, error: 'sin_cancion' };

  const artista  = String(datos.artista || '').trim().slice(0, 200);
  const album    = String(datos.album || '').trim().slice(0, 200);
  const itunesId = String(datos.itunes_id || '').trim().slice(0, 32);
  const enlace   = String(datos.enlace || '').trim().slice(0, 300);

  const suyas = cancionesDe_(token);

  // Misma canción de iTunes, o mismo título y artista si vino escrita a mano.
  const clave = (cancion + '|' + artista).toLowerCase();
  for (let i = 0; i < suyas.length; i++) {
    const misma = itunesId
      ? suyas[i].itunes_id === itunesId
      : (suyas[i].cancion + '|' + suyas[i].artista).toLowerCase() === clave;
    if (misma) {
      return { ok: true, repetida: true, canciones: cancionesFuera_(suyas) };
    }
  }

  const nueva = [];
  nueva[COL_C.id - 1]        = idAleatorio_(8);
  nueva[COL_C.fecha - 1]     = new Date();
  nueva[COL_C.token - 1]     = token;
  nueva[COL_C.nombre - 1]    = hoja_().getRange(fila, COL.nombre).getValue();
  nueva[COL_C.cancion - 1]   = cancion;
  nueva[COL_C.artista - 1]   = artista;
  nueva[COL_C.album - 1]     = album;
  nueva[COL_C.itunes_id - 1] = itunesId;
  nueva[COL_C.enlace - 1]    = enlace;

  const h = hojaCanciones_();
  let quitada = null;

  if (suyas.length >= maxCanciones_()) {
    // Escribir encima en vez de borrar y añadir: no mueve el resto de filas.
    const vieja = suyas[0];
    quitada = { cancion: vieja.cancion, artista: vieja.artista };
    h.getRange(vieja.fila, 1, 1, CABECERAS_CANCIONES.length).setValues([nueva]);
  } else {
    h.appendRow(nueva);
  }

  return {
    ok: true,
    quitada: quitada,
    canciones: cancionesFuera_(cancionesDe_(token))
  };
}

/* Quita una canción por su id. El token tiene que coincidir: nadie borra las
   de otro. */
function quitarCancion_(datos, token) {
  const id = String(datos.id || '').trim();
  if (!id) return { ok: false, error: 'sin_id' };

  const suyas = cancionesDe_(token);
  for (let i = 0; i < suyas.length; i++) {
    if (suyas[i].id !== id) continue;
    hojaCanciones_().deleteRow(suyas[i].fila);
    return { ok: true, canciones: cancionesFuera_(cancionesDe_(token)) };
  }

  // Ya no estaba: la lista que devolvemos es la buena de todos modos.
  return { ok: true, canciones: cancionesFuera_(suyas) };
}

/**
 * POST con cuerpo JSON (enviado como text/plain para evitar el preflight CORS).
 *
 * Confirmación (sin `accion`, o con "rsvp"). Cada formulario de la invitación
 * manda solo sus campos y los demás se quedan como estaban:
 *   { "token": "XXXX", "asiste": true, "nota": "…" }      ← Confirmar
 *   { "token": "XXXX", "alergenos": "Gluten, Marisco" }   ← Alergias
 *   { "token": "XXXX", "ida": "10:00" }                   ← Transporte (ida)
 *   { "token": "XXXX", "vuelta": "21:30" }                ← Transporte (vuelta)
 *
 * Canción:
 *   { "token": "XXXX", "accion": "cancion", "cancion": "…", "artista": "…",
 *     "album": "…", "itunes_id": "…", "enlace": "…" }
 *
 * Quitar una canción:
 *   { "token": "XXXX", "accion": "quitar_cancion", "id": "…" }
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'ocupado' });
  }

  try {
    const datos = JSON.parse(e.postData.contents);
    const token = String(datos.token || '').trim();

    const fila = buscarFila_(token);
    if (!fila) return json_({ ok: false, error: 'no_encontrado' });

    const accion = String(datos.accion || 'rsvp');
    if (accion === 'cancion') return json_(guardarCancion_(datos, token, fila));
    if (accion === 'quitar_cancion') return json_(quitarCancion_(datos, token));
    return json_(guardarRespuesta_(datos, fila));
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Rellena la columna token en las filas que tengan nombre y no tengan token.
 * Ejecutar a mano desde el editor cada vez que añadas invitados.
 */
function generarTokens() {
  const LONGITUD = 8;

  const h = hoja_();
  const ultima = h.getLastRow();
  if (ultima < 2) return;

  const rango = h.getRange(2, COL.token, ultima - 1, 2);
  const valores = rango.getValues(); // [token, nombre]

  const usados = {};
  valores.forEach(function (f) {
    if (f[0]) usados[String(f[0]).trim()] = true;
  });

  let nuevos = 0;
  for (let i = 0; i < valores.length; i++) {
    const tieneNombre = String(valores[i][1]).trim() !== '';
    const tieneToken = String(valores[i][0]).trim() !== '';
    if (!tieneNombre || tieneToken) continue;

    let t;
    do { t = idAleatorio_(LONGITUD); } while (usados[t]);

    usados[t] = true;
    valores[i][0] = t;
    nuevos++;
  }

  rango.setValues(valores);
  Logger.log(nuevos + ' tokens generados');
}

/**
 * Crea la pestaña de canciones a mano, para verla montada antes de que llegue
 * la primera sugerencia. Si ya está, no toca nada.
 */
function crearHojaCanciones() {
  Logger.log('Pestaña "' + hojaCanciones_().getName() + '" lista');
}

/** Comprobación rápida del vínculo con la hoja. */
function test() {
  const h = hoja_();
  Logger.log(h ? 'OK, ' + h.getLastRow() + ' filas' : 'NULL — revisa el ID o el nombre de la pestaña');
}
