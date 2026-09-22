/* La invitación se pinta detrás del sobre, así que la primera foto tiene
   los ~1,9 s de la animación para bajar y ya está puesta cuando el sobre
   se aparta. Las demás esperan a que el invitado baje hasta ellas. */
function galeria(lista) {
  if (!lista || !lista.length) { return ''; }

  var html = '<div class="galeria">';
  for (var i = 0; i < lista.length; i++) {
    var f = lista[i];
    var img = '<img class="foto" src="' + escapar(f.src) + '"'
            + ' width="' + escapar(f.ancho) + '" height="' + escapar(f.alto) + '"'
            + ' alt="' + escapar(f.alt) + '"'
            + ' loading="' + (i === 0 ? 'eager' : 'lazy') + '"'
            + ' decoding="async">';
    html += f.pie
      ? '<figure>' + img +
        '<figcaption class="pie">' + escapar(f.pie) + '</figcaption></figure>'
      : img;
  }
  return html + '</div>';
}

/* Sin fotos no hay sección, y el índice descarta su entrada él solo, igual
   que con la cuenta atrás. */
function seccionFotos() {
  var g = galeria(FOTOS);
  if (!g) return '';
  return '<section class="seccion" id="fotos">' +
           titulo('fotos', 'Fotos') + g +
         '</section>';
}

