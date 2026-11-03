/* --- la configuración de la hoja: lo que se ve, por encima de js/datos.js --- */

/* El texto de `clave` con sus huecos rellenos: t('cuenta_faltan', {n: 3}).
   No escapa: quien lo meta en HTML tiene que pasarlo por escapar(). */
function t(clave, valores) {
  var s = TEXTOS[clave] || '';
  if (valores) {
    for (var k in valores) {
      if (valores.hasOwnProperty(k)) { s = s.split('{' + k + '}').join(String(valores[k])); }
    }
  }
  return s;
}

/* Las fechas que cuentan la cuenta atrás y el calendario salen de BODA, así que
   se recalculan cada vez que se pinta: la hoja puede haber cambiado la fecha. */
function recalcularFechas() {
  objetivoMs = momento(BODA.iso);
  finBodaMs = objetivoMs === null
    ? null
    : momento(BODA.iso.slice(0, 10) + 'T00:00:00' + BODA.iso.slice(19)) + 86400000;
  finEventoMs = objetivoMs === null
    ? null
    : objetivoMs + Math.max(1, +BODA.duracion || 1) * 3600000;
}

/* Lo que llega de la hoja pisa a lo de datos.js, pero solo lo que venga con
   contenido: un campo vacío o un bloque que no existe se queda con el del
   código. Si no llega nada (backend viejo, hoja sin pestaña), no cambia nada. */
function aplicarConfiguracion(c) {
  if (!c) return;
  var k;

  if (c.boda) { for (k in c.boda) { if (c.boda.hasOwnProperty(k)) { BODA[k] = c.boda[k]; } } }
  if (c.textos) { for (k in c.textos) { if (c.textos.hasOwnProperty(k)) { TEXTOS[k] = c.textos[k]; } } }
  if (c.respuestas) {
    if (c.respuestas.si) { RESPUESTAS.si = c.respuestas.si; }
    if (c.respuestas.no) { RESPUESTAS.no = c.respuestas.no; }
  }
  if (c.ajustes) {
    if (c.ajustes.max_canciones > 0) { MAX_CANCIONES = c.ajustes.max_canciones; }
    if (c.ajustes.itunes_pais) { ITUNES_PAIS = c.ajustes.itunes_pais; }
  }

  if (c.alergenos && c.alergenos.length) { ALERGENOS = c.alergenos; }
  if (c.secciones && c.secciones.length) { SECCIONES = c.secciones; }
  if (c.en_obras && c.en_obras.length) { EN_OBRAS = c.en_obras; }
  if (c.transporte && c.transporte.length) { TRANSPORTE.trayectos = c.transporte; }

  // Solo fotos de un sitio que sepamos servir: el repo o https. Lo demás se cae.
  if (c.fotos && c.fotos.length) {
    FOTOS = c.fotos.filter(function (f) { return /^(https:\/\/|img\/)/.test(f.src); });
  }
}
