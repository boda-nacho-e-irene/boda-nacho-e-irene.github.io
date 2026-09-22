# Invitación de boda

Página estática que muestra una invitación personalizada por token y guarda la
confirmación en una hoja de Google.

- Front: este repo, servido por GitHub Pages.
- Backend: proyecto de Google Apps Script publicado como aplicación web.
- Datos: hoja de cálculo de Google, pestaña `Invitados`
  (`token`, `nombre`, `asiste`, `fecha_respuesta`, `alergenos`, `nota`,
  `vuelta`) y pestaña `Canciones` con las sugerencias de música.

## Estructura de archivos

La página está partida en tres: el `index.html` es solo el `<head>`, el sobre y
el hueco donde se pinta todo; los estilos viven en `css/` y la lógica en `js/`,
un archivo por sección. Así dos cambios en secciones distintas no se pisan el
mismo archivo.

```
index.html        <head>, el sobre, <main id="app"> y los enlaces a css/ y js/
css/base.css      los tokens de :root (color, tipos, espacio, forma); reset;
                  .seccion. Es el archivo que se toca para cambiar la pinta
css/presentacion.css  la primera pantalla: nombres, fecha y sitio
css/portada.css   portada, fotos y el día
css/indice.css    índice lateral, flechas de saltar sección y secciones en
                  obras
css/transporte.css
css/formulario.css
css/bloques.css   los formularios plegables y sus resúmenes
css/playlist.css
css/cuenta.css    cuenta atrás y guardar la fecha
css/sobre.css     el sobre, la entrada y el revelado
js/datos.js       EDITA ESTO: API, BODA, SECCIONES, EN_OBRAS, TRANSPORTE,
                  FOTOS, ALERGENOS, RESPUESTAS, MAX_CANCIONES, y el estado
js/util.js        pedir(), jsonp(), escapar(), titulo(), iconos, pantalla()
js/sobre.js       abrir el sobre y revelar las secciones
js/fotos.js       js/cuenta.js       js/calendario.js
js/transporte.js  js/playlist.js     js/formulario.js
js/bloques.js     los formularios plegables, los resúmenes y los envíos
js/indice.js      el índice lateral y las flechas de saltar sección
js/pintar.js      cargar(), pintar(), restaurar(), secciones en obras
lab/lab.css       el laboratorio de ?lab, que no se enlaza: lo baja cargar()
lab/lab.js
```

El orden de los `<link>` del `<head>` **es** la cascada, y el de los `<script>`
el orden de ejecución: `datos.js` va primero porque los demás leen sus
constantes, `calendario.js` después de `cuenta.js` (le hereda `objetivoMs`) y
`pintar.js` el último, que acaba llamando a `cargar()`.

Son `<script defer>` normales, no módulos: comparten las variables globales de
siempre sin `import`/`export`, y la página sigue abriéndose con doble clic
desde el disco. Al añadir un archivo nuevo hay que enlazarlo a mano; no hay
paso de compilación ni nada que instalar.

Al partir un archivo hay una trampa: lo que se ejecuta nada más bajar el
archivo —un `var` de arriba del todo— solo ve las funciones **de su propio
archivo**, porque es ahí y no más lejos donde suben. Por eso `BLOQUES` está en
el mismo `js/bloques.js` que sus `resumen*`: los lee al construirse, y desde
otro archivo llegarían sin definir. Dentro de una función no pasa: para cuando
corre, ya están todos los archivos.

`lab/` es la excepción: no cuelga del `<head>`, lo pide `abrirLaboratorio()`
(en `js/pintar.js`) solo cuando la dirección lleva `?lab`, así que al invitado
no le cuesta ni una petición.

`404.html` se queda con su `<style>` dentro a propósito: GitHub Pages la sirve
en rutas de cualquier profundidad y un `href` relativo a `css/` daría 404 en
cuanto la URL fallida tuviera una carpeta de más. Es lo mismo que le pasa a su
icono, incrustado como `data:`.

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

La constante `API` al principio de `js/datos.js` apunta a la URL
`/exec` del Apps Script. Al cambiar el backend hay que **crear una nueva
implementación** (o subir versión en la existente); guardar el `.gs` no basta.

## Colores y letras: el laboratorio

Toda la paleta y toda la tipografía viven en el `:root` de `css/base.css`, el
primero de los que enlaza el `<head>`. No hay un solo color ni una sola fuente
escritos a mano en el resto de los `css/`: para cambiar cómo se ve la
invitación se tocan los tokens de ahí y baja solo.

Los colores van en dos capas. Los seis de la paleta —`--tinta`, `--piedra`,
`--hueco`, `--ocre`, `--musgo`, `--error`— son los que se eligen; el resto
—velos, sombras, pliegues del sobre— cuelgan de ellos por `color-mix`, dentro
de un `@supports` que deja los literales de siempre para el navegador que no
sepa mezclar.

Las letras van por **papeles**, no por familias: `--letra-titulo`,
`--letra-nombre`, `--letra-cita`, `--letra-rotulo`, `--letra-cifra` y
`--letra-texto`, cada uno con su cursiva, su peso y su multiplicador de tamaño.
Así se le puede cambiar la letra a los títulos sin tocar el nombre del invitado.
Cursiva y peso van aparte de la familia a propósito: las caligráficas y las de
capitales no tienen ninguna de las dos, y sin poder apagarlas el navegador se
las inventa y la letra sale emborronada.

### Probarlo en vivo

```
index.html?lab
```

Abre un panel para mover colores y letras sobre la página de verdad, y pinta la
invitación entera con datos de mentira: ni token ni backend. El panel vive en
`lab/` y solo se descarga con `?lab` en la dirección — para un invitado la
diferencia es un `if` y nada más.

- **Color**: los seis de la paleta, los derivados y los papeles del sobre. Los
  derivados siguen solos al color del que cuelgan; si eliges uno a mano se
  queda fijo y el botón `⟲` lo devuelve al automático. Debajo, el contraste
  WCAG de los cuatro pares que hay que mirar.
- **Letra**: familia, cursiva, peso y tamaño para cada papel, con una veintena
  de familias de Google Fonts que se bajan al elegirlas. Avisa cuando la
  familia no tiene lo que le estás pidiendo.
- **Datos**: cuatro invitados de mentira (completo, sin contestar, no viene, y
  uno sin nada), volver a ver el sobre, apagar las animaciones y hacer que
  falle la red para mirar los estados de error.
- **Sacar**: las declaraciones cambiadas, listas para pegar en el `:root` de
  `css/base.css`, el `<link>` de Google Fonts que hace falta (ese sí va en el
  `<head>` de `index.html`) y los sitios donde la paleta está repetida a mano
  (el `<meta name="theme-color">`, `favicon.svg` y el icono de `404.html`).
  `apple-touch-icon.png` la lleva horneada dentro y hay que rehacerlo aparte,
  convirtiendo el SVG nuevo a PNG de 180×180.

Lo que toques se guarda en el navegador y sigue ahí al recargar; «Volver a
piedra» lo deja como estaba. «Copiar enlace del tema» empaqueta la prueba en la
dirección para abrirla en otro aparato. La tecla `L` pliega y despliega el panel.

Con `?i=TOKEN&lab` el panel sale sobre los datos de verdad, por si hay que ver
cómo cae un nombre largo o una nota concreta.

## Verlo en el móvil

Para mirar la invitación en el teléfono sin desplegar nada hay que servir la
carpeta por la red de casa. Van dos servidores a la vez, porque el navegador de
este ordenador y el móvil no entran por el mismo sitio:

```
python -m http.server 8000 --bind 127.0.0.1
npx --yes http-server . -a 0.0.0.0 -p 8001 -c-1
```

El de Python se queda en loopback —`http://localhost:8000/?lab`— y por eso no
se pelea con el cortafuegos. El de Node escucha en todas las tarjetas, así que
el teléfono entra por `http://IP-LOCAL:8001/?lab`, con la IP que dé `ipconfig`
y siempre que esté en la misma Wi-Fi; si el móvil está en la red de invitados
no hay nada que hacer, esas suelen aislar los aparatos entre sí. El `-c-1`
apaga la caché: recargar en el teléfono enseña siempre la última edición.

Con `?lab` la invitación va con datos de mentira y sin backend. Con `?i=TOKEN`
pega contra el Apps Script de verdad y escribe en la hoja, así que para mirar
colores y letras mejor lo primero.

Los dos de golpe los levanta `scripts/servir.ps1`, que además saca la IP sola e
imprime los cuatro enlaces. Esa carpeta es un apaño de cada uno: está excluida
en `.git/info/exclude` y no sube al repositorio ni a la página.

## Secciones e índice lateral

La invitación es una sola página partida en `<section class="seccion" id="...">`.
El índice se genera desde la constante `SECCIONES` de `js/datos.js`: cada entrada
es `{ id, titulo }` y se descarta sola si ese `id` no existe en la página.

Para añadir una sección: crea el `<section>` dentro de `pintar()`
(`js/pintar.js`), sus estilos en un `css/` nuevo enlazado desde el `<head>`, y
añade su
entrada a `SECCIONES` en el mismo orden en que aparece.

Orden actual: presentación, inicio, fotos, el día, confirmar, alergias, cuenta
atrás (con el *save the date* dentro), dedicatoria, playlist, transporte,
alojamiento, sitio web.

*Presentación* es la primera pantalla, la que asoma al apartarse el sobre: los
dos nombres de pila (`BODA.nombres`), la fecha, el sitio y un enlace a
*Confirmar*, sobre la acuarela de `img/presentacion.webp`. Se lleva el alto
entero de la pantalla y, en móvil, también el ancho. Lo personal —«Hola,
fulano»— es la sección siguiente, *inicio*, que sigue siendo la portada de toda
la vida.

El fondo va anclado abajo (`center bottom / cover`): el convento y el campo de
flores se quedan pegados al borde inferior y lo que se recorta al cambiar de
pantalla es cielo. Por eso el texto arranca arriba en vez de ir centrado, y por
eso la imagen que se ponga ahí tiene que ser vertical y con el motivo abajo.

*Confirmar* va arriba a propósito: es lo único que necesitamos de verdad, y así
se responde sin bajar por toda la invitación.

### Una pantalla por sección

Cada sección ocupa la pantalla entera, de lado a lado y de arriba abajo, y las
que necesitan más piden más. El mando es `--pantallas`, una propiedad que se
le pone a la sección desde su propia hoja:

```css
#playlist { --pantallas: 2; }     /* dos pantallas */
#confirmar { --pantallas: 1.5; }  /* admite decimales */
```

Vale 1 si no se dice otra cosa. `css/base.css` lo convierte en
`min-height: calc(var(--pantallas) * 100svh)`, que es un suelo y no un tope: una
sección con más contenido del que le cabe crece sola y no se recorta nunca. El
centrado vertical solo se nota mientras sobra sitio.

Ojo al subirlo, porque el contenido se centra en la sección **entera**: pedir
dos pantallas para algo que ocupa media deja el contenido a caballo entre las
dos y, al saltar a la sección, lo primero que se ve es un vacío. Solo pide más
de una la sección cuyo contenido llene de verdad lo que pide.

Reparto de hoy: **todas a una**. Ninguna tiene hoy contenido para más, y las
que crecen —playlist con los resultados del buscador, transporte con sus dos
recorridos— crecen solas cuando toca. Cada número vive en la hoja de su
sección (`css/portada.css`, `css/playlist.css`…), que es donde se toca para
moverlo.

Una sección **no lleva `scroll-margin-top`**, y es a propósito: mide una
pantalla, así que al saltar a ella —desde el índice o desde las flechas— tiene
que quedar clavada en la pantalla, y cualquier margen la baja y la descentra.
Lo lleva `.trayecto`, que es un ancla de dentro de una sección y no una
pantalla.

El margen de página (`--margen`) lo pone ahora la sección y no `main`. Quien lo
cancela con un margen negativo para llegar al borde —la galería de fotos— sigue
funcionando igual, porque la referencia sigue siendo la misma.

La junta entre dos secciones la marca un filete corto y centrado arriba del
todo (`--costura`), que se traza abriéndose desde el centro cuando la sección
entra. Va horizontal porque ahora las secciones se tocan: antes, cuando entre
una y otra había un hueco, era un hilo vertical que lo cruzaba.

#### El marco

De 34rem (544 px) para arriba ya no es un teléfono, y la invitación **no se
estira**: se planta en medio dentro de un marco (`--marco`), se lleva consigo
el papel, el grano y una sombra, y lo que sobra a los lados se rellena con una
foto. En el portátil se ve exactamente la misma maqueta que en el teléfono: no
hay una segunda que mantener.

El ancho del marco **sale del alto de la pantalla**, no de un número fijo. Un
móvil es alto y estrecho; un monitor es bajo y panorámico, y con un ancho de
teléfono clavado la invitación se quedaba en una tira. Los dos tokens están en
el `:root` de `css/base.css`:

```css
--marco: min(38rem, calc(100vw - var(--e5) * 2), max(28rem, calc(100svh / 1.5)));
--fondo-escritorio: url("../img/fondo.webp");
```

El `1.5` es la proporción —la de un móvil ancho— y es el número que se toca
para que la columna sea más ancha o más estrecha. Lo demás son topes: nunca
más de 38rem, que es donde el renglón empieza a hacerse largo de leer; nunca
tanto que se coma el relleno de los lados en una ventana estrecha y alta; y
nunca menos de 28rem. La línea de `vh` que hay encima en la hoja es la misma
cuenta para el navegador que no entienda `svh`.

El `../` es obligatorio: un `url()` de una hoja se resuelve contra la hoja y no
contra la página. Mientras el archivo no exista se ve `--relleno` —piedra
tirando a tinta, que sale sola de la paleta— y no se rompe nada: al dejar la
foto en `img/` aparece sin tocar código. Como fondo a pantalla completa,
cuanto más grande mejor, pero el archivo pesa para todos: 1600 px de ancho y
menos de 300 KB es un buen sitio donde parar.

Las 34rem del corte están en dos sitios y tienen que ir a la par: el modo marco
en `css/base.css` y la colocación del índice en `css/indice.css`.

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
un salto de maqueta. Los `id` son los de `SECCIONES`: `presentacion`, `inicio`,
`fotos`, `el-dia`, `confirmar`, `alergias`, `cuenta-atras`, `dedicatoria`,
`playlist`, `transporte`, `alojamiento`, `sitio-web`.

El icono entra como `<img>`, y a un `<img>` la hoja de estilos no puede cambiarle
el color: dibújalo ya en el ocre de la casa, `#9C6B24`. Manda su altura y no su
ancho —28 px en los títulos, 84 px en la presentación y en la portada—, así que
uno cuadrado y uno apaisado se plantan a la misma altura que el arco al que
sustituyen.

De cada sección sin icono sale una petición que acaba en 404. Son nueve como
mucho, van en paralelo y GitHub Pages las contesta con poco más de medio
kilobyte: es lo que cuesta que añadir un icono no sea más que dejar el archivo
en su sitio. Si algún día molestan, la alternativa es declarar a mano qué
secciones tienen icono.

### Icono del sitio

El mismo arco románico, esta vez en la pestaña del navegador: `favicon.svg`
(el que usan los navegadores actuales), `favicon.ico` con 16, 32 y 48 px para
los que aún piden el `.ico`, y `apple-touch-icon.png` de 180 px para cuando la
invitación se guarda en la pantalla de inicio del móvil. Los tres van en la raíz
y se enlazan con ruta relativa desde `index.html`, como las fotos: la absoluta
da 404 en un repositorio de proyecto.

`404.html` lleva el icono incrustado como `data:` en vez de enlazarlo. GitHub
Pages sirve esa página en rutas de cualquier profundidad, y una ruta relativa
se rompería en cuanto la URL fallida tuviera una carpeta de más.

### Secciones en obras

Las que todavía no tienen contenido viven en la constante `EN_OBRAS`
(`js/datos.js`)
(`{ id, titulo, texto }`) y las pinta `seccionEnObras(id)`: título, el sello
*En preparación* y el texto provisional. Siguen apareciendo en el índice como
cualquier otra.

Para rellenar una: borra su entrada de `EN_OBRAS` y escribe su `<section>` a
mano en `pintar()` (`js/pintar.js`), en el mismo sitio donde estaba la
llamada. Si se te olvida
lo segundo, la sección desaparece de la página y el índice descarta su entrada
él solo; no se rompe nada.

### Formularios independientes y plegado

Cada sección que nos pide algo lleva su formulario dentro y su propio botón de
enviar, y guarda solo lo suyo: *Confirmar* manda `asiste` y `nota`, *Alergias*
manda `alergenos`, *Transporte* manda `vuelta`, y *Playlist* guarda cada canción
al añadirla. Ninguna espera a las demás, así que la invitación se contesta a
trozos, en el orden que quiera el invitado.

Lo que hace posible eso es que el backend **escribe solo los campos que vengan
en el cuerpo del POST**: la tabla `CAMPOS` de `Code.gs` dice a qué columna va
cada uno, y `guardarRespuesta_()` deja intacto lo que no llegue. Antes escribía
la fila entera de una vez, así que guardar una cosa borraba las demás.

Guardado lo suyo, el cuerpo del formulario se pliega y deja en su sitio una
línea de resumen —con su marca de hecho y el valor guardado— y un botón
*Cambiar* que lo vuelve a abrir para reenviarlo; abierto, el botón dice
*Cerrar*. Se pliega en dos momentos: al guardar con éxito y al volver a entrar,
si la hoja ya tenía esos datos. Mientras se rellena no se mueve nada.

Las piezas, todas en `js/bloques.js` (su hoja, en `css/bloques.css`):

- `BLOQUES` — un `{ id, alto, resumen }` por formulario. `alto` es el tope de
  `max-height` del cuerpo plegable: con holgura sobre lo que mide abierto,
  porque por debajo se recorta.
- `bloque(id, alto, cuerpo)` — pinta el envoltorio: línea de resumen, cuerpo y
  el `.estado` del formulario, que va **fuera** del pliegue para que el
  «Guardado» no se plegue con él justo al aparecer.
- `repasarBloques(abrir)` — el único sitio que decide qué se pliega. Si un
  bloque tiene resumen, sus datos están en la hoja. `abrir` deja uno abierto
  aunque lo tenga, que es lo que necesita *Playlist* al añadir una canción.
- `plegarBloque(id, si)` y `guardado` — el estado. `guardado` dice qué campos
  están en la hoja, y es eso y no los campos del formulario lo que da algo por
  hecho: un chip marcado sin enviar no cuenta.

Las secciones con formulario ya guardado se marcan además en el índice lateral
(`data-hecho`, arco relleno en musgo): ahí es donde el índice se lee como una
lista de recados.

Los alérgenos sí son una sección aparte —antes vivían dentro de *Confirmar*
porque compartían su botón de enviar—, y la elección de autobús de vuelta ha
vuelto a *Transporte*, con los recorridos. En *Confirmar* se queda *Un mensaje
para nosotros*: es lo único de esa sección que también tiene sentido para quien
no puede venir, y allí no se lo esconde.

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

El índice es el mismo a todos los anchos: un panel que se abre con el botón de
la esquina superior y se cierra al elegir, con `Esc` o tocando fuera. Con marco
(ver *Una pantalla por sección*) el botón y el panel se meten dentro de él, así
que en el portátil se abre encima de la invitación y no en la esquina de la
pantalla. La sección activa se marca con `aria-current`, midiendo las secciones
en cada `scroll`: manda la última cuyo borde superior haya pasado el 42% de la
pantalla.

En la esquina de abajo hay dos flechas que saltan a la sección anterior y a la
siguiente, en el orden de `SECCIONES`. Con cada sección ocupando una pantalla o
más, bajar a rueda o a dedo se hace largo; el salto es de sección a sección,
tenga la de abajo una pantalla o tres. En la primera y en la última se apaga la
flecha que no lleva a ninguna parte, apagada y no escondida para que la otra no
cambie de sitio. Salen de la misma cuenta que marca el índice —la sección que
él señala es de donde saltan— y viven con él en `js/indice.js` y
`css/indice.css`. El hueco que se reservan abajo para no pisar el contenido es
`--paso-hueco`, que va en el padding de `.seccion`.

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

La sección la pinta `seccionTransporte()` (`js/transporte.js`) a partir de la
constante
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
saca sus horas como botones debajo de los recorridos, en la propia sección
*Transporte*, más un «No lo necesito». Los pinta `camposVuelta()`, que añade
también el botón de guardar, y la elección es exclusiva. Sin trayecto elegible
no hay botones ni botón de enviar: la sección se queda en los recorridos.

Lo elegido viaja a la hoja en su propio POST, con el campo `vuelta` y nada más,
y acaba en la columna G:

- `21:30` / `23:30` — la hora elegida, tal cual está escrita en `salidas`.
- `No` — no coge el autobús (la constante `SIN_VUELTA`).
- Celda vacía — todavía no ha contestado, o no viene.

El backend fuerza formato de texto en esa columna antes de escribir: si no,
Sheets se queda `21:30` como una hora y deja de coincidir con los botones.

Al cambiar las horas de `salidas` cambian los botones, pero **no** lo ya
guardado en la hoja: esas respuestas siguen con la hora antigua y hay que
repasarlas a mano.

## Fotos

La sección *Fotos* la pinta `seccionFotos()` (`js/fotos.js`) a partir de la
constante `FOTOS` de `js/datos.js`. Con la lista vacía no hay sección y el índice
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
para no mover el resto. La constante está en los dos sitios (`Code.gs` y
`js/datos.js`) y manda la del backend; si cambias una, cambia la otra.

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
- Los formularios independientes necesitan la escritura parcial de
  `guardarRespuesta_()`, así que con un backend viejo implementado se pisarían
  unos a otros: al tocar `Code.gs` hay que **crear una implementación nueva**
  (ver *Configuración*), no solo guardar el archivo.
