# Birthday Experience

Una experiencia de cumpleaños privada para una sola persona: una URL personalizada,
un código compartido, y tres páginas — bienvenida, playlist de Spotify y una
carta — cargadas desde archivos Markdown.

Sin base de datos, sin CMS, sin backend aparte. Un solo proyecto de Next.js
que se despliega en Vercel como funciones serverless.

---

## Stack

| Pieza | Elección |
|---|---|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript en modo estricto |
| Estilos | Tailwind CSS v4 (tokens en `app/globals.css`) |
| Animación | Framer Motion + animaciones CSS |
| Contenido | Markdown con frontmatter (`gray-matter`, `remark`, `rehype`) |
| Sesiones | Cookie firmada con HMAC-SHA256 |
| Rate limiting | Upstash Redis REST (compatible con Vercel KV) |
| Despliegue | Vercel |

---

## Puesta en marcha

```bash
npm install
cp .env.example .env.local

# Genera el hash y la sal del código de acceso:
npm run hash-code -- "el código que quieras"

# Genera el secreto de sesión:
openssl rand -hex 32

npm run dev
```

Abre <http://localhost:3000>. La raíz redirige al slug configurado en
`RECIPIENT_SLUG` (por defecto `ana`).

El código de ejemplo en `.env.local` es `prueba-dev-123`; cámbialo antes de
desplegar.

---

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `ACCESS_CODE_HASH` | Sí | Digest SHA-256 (hex) de la clave derivada con scrypt. Nunca el código en claro. |
| `ACCESS_CODE_SALT` | Sí | Sal (hex) usada para derivar la clave. |
| `SESSION_SECRET` | Sí | Secreto de al menos 32 caracteres con el que se firma la cookie de sesión. |
| `RECIPIENT_SLUG` | No (por defecto `ana`) | Destino de la redirección de `/`. Debe coincidir con un archivo de `content/`. |
| `NEXT_PUBLIC_SITE_URL` | No | Origen público del despliegue. |
| `UPSTASH_REDIS_REST_URL` | **En producción** | Endpoint REST de Upstash Redis. Sin él, el endpoint de acceso no está limitado. |
| `UPSTASH_REDIS_REST_TOKEN` | **En producción** | Token del endpoint REST. |

La configuración se valida con `zod` al arrancar (`lib/config/env.ts`). Si falta
o es inválida una variable, la aplicación falla al inicio indicando el nombre
de la variable — no cuando alguien intenta entrar.

### Generar el hash del código

```bash
npm run hash-code -- "mi código secreto"
# ACCESS_CODE_HASH=...
# ACCESS_CODE_SALT=...

npm run hash-code            # sin argumentos: lo pregunta sin mostrarlo
```

El código en claro nunca se escribe en disco ni se vuelve a imprimir.

### Rotar el código

1. `npm run hash-code -- "el código nuevo"` para obtener hash y sal nuevos.
2. Sustituye `ACCESS_CODE_HASH` y `ACCESS_CODE_SALT` en `.env.local` y en las
   variables de Vercel.
3. Despliega. Las sesiones antiguas siguen siendo válidas hasta que expiran
   (7 días); si quieres invalidarlas de inmediato, regenera también
   `SESSION_SECRET`.

---

## Rutas

| Ruta | Descripción |
|---|---|
| `/` | Redirige a `/${RECIPIENT_SLUG}`. |
| `/[slug]` | Pantalla del código de acceso. |
| `/[slug]/bienvenida` | Bienvenida personalizada. |
| `/[slug]/playlist` | Playlist de Spotify incrustada. |
| `/[slug]/carta` | La carta. |
| `POST /api/access` | Verifica el código y emite la cookie de sesión. |
| `POST /api/logout` | Borra la cookie de sesión. |

---

## Escribir el contenido

Cada destinatario tiene su propio archivo Markdown en `content/`:

```text
content/
  ana.md
```

```markdown
---
title: "Una sorpresa para ti"
recipient: "Ana"
dateLabel: "Tu día especial"
subtitle: "Algo que preparé con mucho cariño, solo para ti."
spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
---

Hay días que merecen algo más que un mensaje.

**Feliz cumpleaños.** ❤️
```

### Frontmatter

| Campo | Obligatorio | Descripción |
|---|---|---|
| `title` | Sí | Titular de la bienvenida y de la carta. |
| `recipient` | Sí | Nombre de la persona destinataria. |
| `dateLabel` | Sí | Línea corta sobre la ocasión, p. ej. «Tu día especial». |
| `subtitle` | No | Una línea bajo el titular. |
| `spotifyUrl` | No | URL de la playlist. Se acepta la forma normal y la de *embed*. |
| `playlistId` | No | Id de la playlist. Tiene prioridad sobre `spotifyUrl`. |

### Markdown

Se admiten títulos, énfasis, listas, citas, enlaces, código, líneas separadoras
y saltos de línea. **El HTML en crudo se descarta** y la salida se sanea con
una lista blanca antes de insertarse en la página, así que un archivo de
contenido no puede inyectar scripts.

### Añadir otro destinatario

1. Crea `content/<otro-slug>.md`.
2. Si es el predeterminado, cambia `RECIPIENT_SLUG`.

No hace falta tocar el código ni crear una tabla en ninguna base de datos.

### Si un archivo no es válido

| Problema | Qué ocurre |
|---|---|
| Frontmatter ausente o inválido | Se registra el detalle en el servidor y se muestra una página amable. Nunca se muestra el error en crudo. |
| HTML inválido | Se descarta y el resto de la carta se muestra igual. |
| Sin `spotifyUrl` | La página de la playlist muestra un marcador en lugar del reproductor. |
| Archivo inexistente | La ruta responde con un «no encontrado» elegante. |

---

## Seguridad

- **El código nunca llega al cliente.** Solo se guarda su hash con sal derivado
  con `crypto.scrypt`; la comparación es de tiempo constante.
- **Sesiones sin estado.** Cookie `bday_session` firmada con HMAC-SHA256:
  `HttpOnly`, `SameSite=Lax`, `Secure` en producción, `Path=/` y con caducidad
  (7 días). El payload incluye el slug, así que una sesión no sirve para otro
  destinatario.
- **Errores genéricos.** Un slug desconocido, un código incorrecto y un hash
  corrupto devuelven exactamente la misma respuesta, byte a byte.
- **Todas las páginas privadas se validan en el servidor.** La comprobación
  ocurre *antes* de leer el contenido, de modo que nada privado llega a la
  respuesta de un visitante sin sesión.
- **El código no va en la URL.** El formulario solo se habilita tras la
  hidratación, para que un envío nativo no lo dejara en la barra de
  direcciones ni en el historial.
- **Content-Security-Policy con nonce.** `proxy.ts` genera un nonce por
  respuesta; Next.js lo aplica a sus scripts. `script-src` no incluye
  `'unsafe-inline'`, así que un script inyectado no puede ejecutarse ni aunque
  se saltara el saneador del Markdown.
- **Sin indexación.** La experiencia entera es privada, y hay tres capas
  independientes para que ningún buscador la indexe:
  - `X-Robots-Tag: noindex, nofollow, noarchive` en **todas** las respuestas,
    incluidas las privadas, los iconos y las rutas inexistentes.
  - `<meta name="robots" content="noindex, nofollow, nocache">` en el HTML,
    más la variante específica para `googleBot` (con `noimageindex`).
  - `robots.txt` con `Disallow: /` para todos los rastreadores.

  Un rastreador que haga caso a uno de los tres se queda fuera; uno que los
  ignore los tres se encuentra igualmente el `noindex` en los otros dos.
- **Sin fugas en los registros.** Los detalles de los fallos se registran solo
  en el servidor.

### Limitación de intentos

El endpoint de acceso está limitado por IP y por slug mediante un contador
compartido en Upstash Redis (5 intentos por cada 15 minutos). Un contador en
memoria no serviría: en Vercel cada función es una instancia distinta y se
reinicia en cada arranque en frío.

Sin `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` la aplicación
funciona, pero **no está limitada** y avisa por consola al arrancar.

---

## Despliegue en Vercel

1. Sube el repositorio a GitHub y conéctalo en Vercel.
2. Añade **Upstash Redis** desde el Marketplace de Vercel: rellena
   `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` automáticamente.
3. Añade el resto de variables (`ACCESS_CODE_HASH`, `ACCESS_CODE_SALT`,
   `SESSION_SECRET`, `RECIPIENT_SLUG`).
4. Despliega.
5. **Comprueba que una página privada carga.** Es la única forma de confirmar
   que el directorio `content/` se ha copiado al bundle de la función; los
   archivos se cargan desde disco en tiempo de ejecución y `next.config.ts` los
   incluye explícitamente con `outputFileTracingIncludes`.

### Regla de firewall recomendada

Como segunda capa, añade en Vercel → Firewall → Rate Limit una regla para la
ruta `POST /api/access` (5 peticiones por minuto y IP). Vive en la
configuración del proyecto, no en el repositorio, por lo que no sustituye al
limitador de la aplicación: sirve de red de seguridad.

---

## Verificación

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run test        # vitest
npm run build       # next build
```

### Iconos

El favicon se genera desde código, sin herramientas de imagen:

```bash
npm run generate-favicon
```

Escribe `app/favicon.ico` (16, 32 y 48 px), `app/apple-icon.png` (180 px) y
comparte el diseño con `app/icon.svg`, que es el icono vectorial que usan los
navegadores modernos. `app/icon.svg` se edita a mano; si lo cambias, vuelve a
ejecutar el script para que los tres queden iguales.

Para las comprobaciones que un test unitario no puede hacer —hidratación,
violaciones de CSP, animaciones, legibilidad en distintos tamaños— hay un
script que conduce un Chrome real:

```bash
npm run build
npm run start                       # en otra terminal
ACCESS_CODE="prueba-dev-123" node scripts/verify-visual.mjs
```

Guarda las capturas en `.verification/`.

---

## Estructura

```text
app/
  api/access/route.ts           # verificación del código
  api/logout/route.ts           # cierre de sesión
  icon.svg                      # icono vectorial (favicon moderno)
  favicon.ico                   # 16/32/48 px, generado
  apple-icon.png                # 180 px, generado
  robots.ts                     # robots.txt con Disallow: /
  [slug]/page.tsx                # pantalla del código
  [slug]/(protected)/            # páginas privadas (guard de sesión)
    layout.tsx                   # guard + navegación
    bienvenida/page.tsx
    playlist/page.tsx
    carta/page.tsx
components/
  access/AccessGate.tsx          # formulario del código
  ambient/AmbientBackground.tsx  # fondo ambiental (CSS, sin imágenes)
  motion/                        # Reveal, PageTransition, MotionProvider
  layout/                        # navegación y pie
content/
  ana.md                         # contenido por destinatario
lib/
  auth/                          # hash, sesión, cookies, guard
  content/                       # esquema, carga y renderizado del Markdown
  config/env.ts                  # configuración validada
  rate-limit/limiter.ts          # limitador compartido
  slug.ts                        # validación y rutas seguras
  spotify/url.ts                 # normalización de la URL de Spotify
proxy.ts                         # Content-Security-Policy con nonce
scripts/
  hash-code.mjs                  # genera hash y sal
  generate-favicon.mjs           # genera favicon.ico y apple-icon.png
  verify-visual.mjs              # comprobaciones en un navegador real
tests/                           # vitest
```
