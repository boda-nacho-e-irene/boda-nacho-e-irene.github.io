# Invitación de boda

Página estática que muestra una invitación personalizada por token y guarda la
confirmación en una hoja de Google.

- Front: este repo, servido por GitHub Pages.
- Backend: proyecto de Google Apps Script publicado como aplicación web.
- Datos: hoja de cálculo de Google, pestaña `Invitados`
  (`token`, `nombre`, `asiste`, `fecha_respuesta`, `alergenos`, `nota`,
  `vuelta`) y pestaña `Canciones` con las sugerencias de música.

## Despliegue

1. Push a `main`.
2. Settings > Pages > Source: *Deploy from a branch*, rama `main`, carpeta `/ (root)`.
3. La URL sale en esa misma pantalla al cabo de un minuto.

Enlace de invitado:

```
https://USUARIO.github.io/REPO/?i=TOKEN
```

La barra antes del `?` es obligatoria en repos de proyecto.

## Configuración

La constante `API` al principio del `<script>` de `index.html` apunta a la URL
`/exec` del Apps Script. Al cambiar el backend hay que **crear una nueva
implementación** (o subir versión en la existente); guardar el `.gs` no basta.

## Secciones e índice lateral

La invitación es una sola página partida en `<section class="seccion" id="...">`.
El índice se genera desde la constante `SECCIONES` del `<script>`: cada entrada
es `{ id, titulo }` y se descarta sola si ese `id` no existe en la página.

Para añadir una sección: crea el `<section>` dentro de `pintar()` y añade su
entrada a `SECCIONES` en el mismo orden en que aparece.

Orden actual: inicio, fotos, el día, confirmar, cuenta atrás (con el *save the
date* dentro), dedicatoria, playlist, transporte, alojamiento, sitio web.

*Confirmar* va arriba a propósito: es lo único que necesitamos de verdad, y así
se responde sin bajar por toda la invitación.

### Emblema de sección

Cada sección se presenta con un emblema encima del título. Por defecto es un
arco románico dibujado con CSS —un rectángulo con las esquinas de arriba
redondeadas y sin borde abajo—, así que no cuesta ni un archivo ni una petición.

Para darle icono propio a una sección basta con dejar el archivo en `img/iconos/`
con el `id` de la sección como nombre y extensión `.svg`:

```
img/iconos/el-dia.svg
img/iconos/transporte.svg
img/iconos/inicio.svg       (sustituye al arco grande de la portada)
```

No hay que tocar el código. `probarIcono()` lo busca al pintar y lo pone si está.
El arco se dibuja primero y el icono solo lo sustituye si llega a cargarse, así
que una sección sin icono se queda con el suyo sin enterarse: ni parpadea ni da
un salto de maqueta. Los `id` son los de `SECCIONES`: `inicio`, `fotos`,
`el-dia`, `confirmar`, `cuenta-atras`, `dedicatoria`, `playlist`, `transporte`,
`alojamiento`, `sitio-web`.

El icono entra como `<img>`, y a un `<img>` la hoja de estilos no puede cambiarle
el color: dibújalo ya en el ocre de la casa, `#9C6B24`. Manda su altura y no su
ancho —28 px en los títulos, 84 px en la portada—, así que uno cuadrado y uno
apaisado se plantan a la misma altura que el arco al que sustituyen.

De cada sección sin icono sale una petición que acaba en 404. Son nueve como
mucho, van en paralelo y GitHub Pages las contesta con poco más de medio
kilobyte: es lo que cuesta que añadir un icono no sea más que dejar el archivo
en su sitio. Si algún día molestan, la alternativa es declarar a mano qué
secciones tienen icono.

### Secciones en obras

Las que todavía no tienen contenido viven en la constante `EN_OBRAS`
(`{ id, titulo, texto }`) y las pinta `seccionEnObras(id)`: título, el sello
*En preparación* y el texto provisional. Siguen apareciendo en el índice como
cualquier otra.

Para rellenar una: borra su entrada de `EN_OBRAS` y escribe su `<section>` a
mano en `pintar()`, en el mismo sitio donde estaba la llamada. Si se te olvida
lo segundo, la sección desaparece de la página y el índice descarta su entrada
él solo; no se rompe nada.

Los alérgenos no son una sección aparte: van dentro de *Confirmar*, plegados
hasta que alguien dice que sí, porque comparten el botón de enviar con ella.
Lo mismo con la elección de autobús de vuelta.

### Quien no puede venir

Al pulsar *No podré ir* desaparecen de la página y del índice todas las
secciones posteriores a *Confirmar* (cuenta atrás incluida, y su reloj se
para). Se quedan la portada, las fotos, el día y la propia confirmación con su
*Un mensaje para nosotros*, para que pueda escribirnos igualmente. Si cambia de
idea y pulsa *Sí, allí estaré*, vuelve todo.

La lista de lo que se esconde no está escrita a mano: `seccionesTrasConfirmar()`
la saca de `SECCIONES`, así que mover una sección en esa constante basta para
cambiar de qué lado del corte queda.

Cada opción enciende además un subtítulo bajo los botones, con los textos de la
constante `RESPUESTAS`.

En pantallas de 62rem o más el índice es un raíl fijo a la izquierda del texto;
por debajo es un panel que se abre con el botón de la esquina superior. La
sección activa se marca con `aria-current`, midiendo las secciones en cada
`scroll`: manda la última cuyo borde superior haya pasado el 42% de la pantalla.

## Cuenta atrás y save the date

Una sola sección, `cuenta-atras`: el reloj arriba y debajo el *save the date*,
separados por una línea fina. Las dos cosas hablan del mismo día y por separado
no daban para una sección cada una.

La pinta `seccionCuenta()`, y el bloque de guardar la fecha `bloqueCalendario()`.
Pasado el día de la boda no se pinta ninguna de las dos y el índice descarta su
entrada él solo.

El botón *Añadir a mi calendario* fabrica un `.ics` en el propio navegador
—`contenidoIcs()`, sin pedir nada al backend— y lo baja como `boda.ics`: es el
formato que entienden el Calendario del iPhone, Outlook y los demás. El evento
lleva un aviso un día antes (`VALARM`) y un `UID` fijo, así que añadirlo dos
veces lo actualiza en vez de duplicarlo. Debajo va el enlace a Google Calendar
(`enlaceGoogle()`), que abre la misma cita ya en su pantalla de guardar.

Las horas viajan en UTC a los dos sitios, calculadas desde `BODA.iso`, para no
arrastrar la zona de la boda. Lo que se puede tocar en `BODA`:

- `evento` — el nombre que el invitado verá en su agenda. Corto: en la vista de
  mes se lee a medias.
- `duracion` — horas que se le reservan a partir de `hora`.
- `direccion` — la dirección postal completa, que es la que el calendario del
  invitado convierte en un mapa. `lugar` es el nombre corto que se lee en *El
  día* y no le sirve para llegar. Si se queda vacía, se usa `lugar`.

La descripción del evento no lleva el enlace de la invitación a propósito: ese
enlace lleva el token del invitado, y los eventos se comparten y se sincronizan
con más servicios de los que uno cree.

## Transporte

La sección la pinta `seccionTransporte()` a partir de la constante
`TRANSPORTE`: una lista de `trayectos`, cada uno con su `id`, su `titulo`, sus
horas de `salidas` y sus `paradas` en orden (`lugar` y un `detalle` opcional
con el punto exacto de recogida). Con `trayectos` vacío no hay sección, igual
que con las fotos.

Los trayectos se pintan en paralelo —ida a un lado, vuelta al otro, separados
por una línea fina— en cuanto la pantalla llega a 23rem; por debajo se apilan.
El `id` de cada uno sirve para enlazarlo directo (`…/?i=TOKEN#transporte-ida`);
en el índice lateral entra la sección entera, no cada trayecto.

### Elegir autobús de vuelta

El trayecto marcado con `elegible: true` —y con más de una hora en `salidas`—
saca sus horas como botones dentro de *Confirmar*, junto a los alérgenos, más
un «No lo necesito». Los pinta `camposVuelta()` y la elección es exclusiva.

Lo elegido viaja a la hoja en el mismo POST que la confirmación, en el campo
`vuelta`, y acaba en la columna G:

- `21:30` / `23:30` — la hora elegida, tal cual está escrita en `salidas`.
- `No` — no coge el autobús (la constante `SIN_VUELTA`).
- Celda vacía — todavía no ha contestado, o no viene.

El backend fuerza formato de texto en esa columna antes de escribir: si no,
Sheets se queda `21:30` como una hora y deja de coincidir con los botones.

Al cambiar las horas de `salidas` cambian los botones, pero **no** lo ya
guardado en la hoja: esas respuestas siguen con la hora antigua y hay que
repasarlas a mano.

## Fotos

La sección *Fotos* la pinta `seccionFotos()` a partir de la constante `FOTOS`
del `<script>` de `index.html`. Con la lista vacía no hay sección y el índice
descarta su entrada él solo, igual que con la cuenta atrás.

Los archivos van en `img/`, en `.webp`:

- Nombres en minúscula, sin espacios ni acentos: acaban en una URL.
- Ruta relativa (`img/foo.webp`). La absoluta da 404 en repos de proyecto,
  igual que la barra antes del `?`.
- 1200 px de ancho sobran: la columna mide 432 px como mucho, 864 px en
  pantallas 2x. Menos de 200 KB por foto; los invitados la abren con datos.
- `ancho` y `alto` son los píxeles reales del archivo. Sin ellos la página
  da saltos según van cargando.
- `pie` es opcional; si está, la foto se envuelve en un `<figure>`.

La primera foto se pide en cuanto se pinta la página y las demás esperan a que
el invitado baje hasta ellas. Descomentando el `<link rel="preload">` del
`<head>` con la ruta de la primera, esa empieza a bajar sin esperar al backend.

Convertir y quitar EXIF (las fotos de móvil llevan las coordenadas GPS de
casa) de una tacada, con ImageMagick:

```
magick mogrify -path img -resize 1200x1200\> -quality 75 -strip -format webp originales/*.jpg
```

El `<meta robots>` mantiene la página fuera de los buscadores, pero
cualquiera con la URL puede descargar las fotos directamente.

## Playlist

Cada invitado puede proponer canciones desde la sección *Pon tú la música*.
Buscan en el catálogo de iTunes y lo que eligen cae en la pestaña `Canciones`
de la misma hoja, con una fila por canción:

```
id  fecha  token  nombre  cancion  artista  album  itunes_id  enlace
```

`nombre` se copia de la pestaña de invitados al escribir, así que la lista dice
quién pidió cada cosa sin tener que cruzar tokens. `enlace` es la ficha de la
canción en Apple Music, útil para encontrarla luego en otro servicio.

La pestaña se crea sola con la primera sugerencia. Para verla montada antes,
ejecuta `crearHojaCanciones()` a mano desde el editor de Apps Script, igual que
`generarTokens()`.

El tope son **tres canciones por invitado**, en `MAX_CANCIONES`. Al añadir una
cuarta no se rechaza: sustituye a la más antigua, escribiendo encima de su fila
para no mover el resto. La constante está en los dos archivos (`Code.gs` e
`index.html`) y manda la del backend; si cambias una, cambia la otra.

La búsqueda va por **JSONP** (`<script>` con `&callback=`), no por `fetch`:
iTunes no promete cabeceras CORS y ese parámetro es la vía que documenta Apple.
Corta sobre las 20 búsquedas por minuto y por IP, así que el buscador espera
400 ms desde la última tecla antes de preguntar. Si una canción no aparece,
la página ofrece mandarla tal cual se escribió, sin `itunes_id`.

La sección va detrás de *Confirmar*, así que cae con las demás cuando alguien
pulsa *No podré ir* (ver *Quien no puede venir*). Lo que ya hubiese mandado se
queda en la hoja; solo desaparece la sección, y vuelve si cambia de idea.

## Notas

- Al abrir, un sobre cerrado tapa la página hasta que el invitado toca. Lleva su
  nombre escrito en cuanto responde el backend. La invitación se pinta detrás
  mientras tanto; su animación de entrada espera a que el sobre se aparte.
  Con `prefers-reduced-motion` el sobre desaparece al primer toque, sin animación.
- El token va en el parámetro `i` y es la única credencial. Nada sensible en esta página.
- `robots.txt` y el `<meta robots>` evitan que los enlaces acaben indexados.
- El POST se manda con `Content-Type: text/plain` a propósito: `application/json`
  dispara el preflight CORS, que Apps Script no responde.
