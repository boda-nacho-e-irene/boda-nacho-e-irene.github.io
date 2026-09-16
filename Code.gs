const SHEET_ID = '1CWyE4-3iV2gzqoiOMJK4cf291ZrbVU8iNR_fGE6i6cY';
const HOJA = 'InvitacionesWeb';
const HOJA_CANCIONES = 'Canciones';

/**
 * Boda — backend sobre Google Sheets.
 *
 * Pestaña "Invitados", cabeceras en la fila 1:
 *   A: token   B: nombre   C: asiste   D: fecha_respuesta   E: alergenos   F: nota
 *   G: vuelta  (hora del autobús de vuelta, o "No")
 *
 * Pestaña "Canciones" (se crea sola con la primera sugerencia):
 *   A: id   B: fecha   C: token   D: nombre   E: cancion
 *   F: artista   G: album   H: itunes_id   I: enlace
 *
 * Publicar: Implementar > Nueva implementación > Aplicación web
 *   Ejecutar como: Yo
 *   Quién tiene acceso: Cualquier usuario
 */

const COL = { token: 1, nombre: 2, asiste: 3, fecha: 4, alergenos: 5, nota: 6, vuelta: 7 };

/* Cada sección de la invitación guarda lo suyo por separado, así que el cuerpo
   del POST trae solo sus campos: la confirmación manda `asiste` y `nota`, las
   alergias `alergenos`, el transporte `vuelta`. La tabla dice a qué columna va
   cada uno y cómo se normaliza; lo que no venga en el cuerpo no se toca, que es
   lo que permite guardar un formulario sin borrar los otros. */
const CAMPOS = {
  asiste:    { col: COL.asiste,    valor: function (v) { return v === true ? 'SI' : 'NO'; } },
  alergenos: { col: COL.alergenos, valor: function (v) { return String(v || '').slice(0, 500); } },
  nota:      { col: COL.nota,      valor: function (v) { return String(v || '').slice(0, 1000); } },
  vuelta:    { col: COL.vuelta,    valor: function (v) { return String(v || '').slice(0, 20); } }
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

/** GET ?token=XXXX -> { ok, nombre, asiste, alergenos, nota, vuelta, canciones } */
function doGet(e) {
  const token = String((e.parameter && e.parameter.token) || '').trim();
  if (!token) return json_({ ok: false, error: 'sin_token' });

  const fila = buscarFila_(token);
  if (!fila) return json_({ ok: false, error: 'no_encontrado' });

  const f = hoja_().getRange(fila, COL.nombre, 1, 6).getValues()[0];
  // f = [nombre, asiste, fecha, alergenos, nota, vuelta]
  return json_({
    ok: true,
    nombre: f[0],
    asiste: f[1] || null,
    alergenos: f[3] || '',
    nota: f[4] || '',
    vuelta: vueltaTexto_(f[5]),
    canciones: cancionesFuera_(cancionesDe_(token))
  });
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
    if (campo.col === COL.vuelta) { h.getRange(fila, campo.col).setNumberFormat('@'); }

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

  if (suyas.length >= MAX_CANCIONES) {
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
 *   { "token": "XXXX", "vuelta": "21:30" }                ← Transporte
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
