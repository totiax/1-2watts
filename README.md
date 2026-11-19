# ½ watts

El fin de año de 25watts en tres actos: un video con las fotos del equipo, un juego ("¿Quién dijo eso?") y una foto grupal en versión dibujito.

Hoy está armado el **Acto 0 (Carga)**: login con la cuenta de trabajo y carga de fotos y respuestas.

## Cómo levantarlo

```bash
npm install
cp .env.example .env.local   # completar SESSION_SECRET y las credenciales OAuth
npm run dev
```


## Quién puede entrar

Entra quien esté en **`data/equipo.json`** (no se commitea). Se edita a mano y se relee solo, sin reiniciar:

```json
[
  { "email": "ana.perez@25watts.com.ar", "nombre": "Ana", "apellido": "Pérez", "apodo": "La Jefa del Deploy" },
  { "email": "beto.gomez@25watts.com.ar", "nombre": "Beto", "apellido": "Gómez", "apodo": null, "clave": "su-clave" }
]
```

- `email` puede ser una lista si alguien entra con más de un mail.
- `apodo` es lo que se muestra en la app (si no hay, el nombre).
- `clave` es opcional: si no está, usa la contraseña compartida del equipo. Puede ir en claro o como hash (`npm run password -- 'la-clave'` y copiar lo que va después de `LOGIN_PASSWORD_HASH=`).
- Sacar a alguien del JSON lo deja afuera al toque, aunque tenga la sesión abierta.

Ver `data/equipo.example.json`. En un servidor sin archivos se puede pasar el mismo JSON en la variable `EQUIPO_JSON`.

Si no hay `equipo.json`, usa `data/roster.json` exportado de People:

```bash
npm run roster:seed -- ../people/backend-people/prisma/seed.ts "Tecnología"   # desde el seed
PEOPLE_DATABASE_URL=postgres://… npm run roster -- "Tecnología"               # desde la base
```

El id de cada persona sale de su mail, así que cambiar de archivo no pierde lo cargado.

## Login

- **Mail + contraseña:** la propia de `equipo.json` o la compartida del equipo. De la compartida, en `.env.local` va solo el hash: `npm run password -- 'la-clave'` imprime la línea `LOGIN_PASSWORD_HASH=…`. Tiene límite de intentos.
- **Google** (OAuth con PKCE vía `arctic`): el mail tiene que estar en el roster. Callback: `${APP_URL}/api/auth/google/callback`.
- En `next dev` hay un atajo sin botón: `/api/auth/dev?email=…`.

La sesión es una cookie firmada (`jose`) que solo guarda el id de la persona.

## Datos

- `storage/medio-watts.db`: SQLite con las fotos y respuestas
- `storage/uploads/<id>/`: las fotos (JPEG achicado a 2048 px en el navegador)

Las dos carpetas están en `.gitignore`. Cada persona ve y borra solo sus fotos.

## Fechas y acceso

`EVENT_DATE` (en `.env.local`) es la fiesta. Cinco días antes sale el mail y se abre la carga:

- **Antes del mail:** se puede loguear pero no hay nada; ve "Todavía no se enchufó nada".
- **Carga abierta:** quien no enchufó solo ve `/cargar`. Necesita las 4 fotos con su pregunta (mascota, fiesta, viaje y un escrache libre a cualquier compañero), la selfie y los **Premios ½ watts** (7 votos a compañeros y 4 premios "del año" escritos), y aprieta **Enchufar**. Desde ahí no puede volver ni cambiar nada (la API también lo bloquea).
- **Enchufado:** entra a `/inicio`, la sala de espera antes del juego: fotos de todos de fondo en columnas infinitas (sin nombre, sin escraches), batería del equipo, quiénes faltan y cuenta regresiva, todo en una pantalla. Tocando el nombre de alguien que enchufó se ven sus tres fotos con lo que contestó. Los premios se revelan al final de la fiesta, después del video. Las fotos de los demás solo se ven si los dos enchufaron; la selfie y el escrache no se comparten.
- **En la fiesta (por hacer):** juego en el proyector con los celulares; se abren los premios y quien pase un mínimo de aciertos ve la galería de escraches. Quien no enchufó no entra.

## Datos de prueba

Con fotos de Pexels en `storage/demo/pexels/`, por prefijo: `m-` mascota, `f-` fiesta, `v-` viaje, `e-` escrache, `s-` selfie.

```bash
npm run demo                         # carga a todos menos los dos primeros del roster
npm run demo -- --pending a@x,b@x    # deja sin enchufar a esos mails
npm run demo -- clear                # borra todo lo de prueba
```

No toca a nadie que ya haya cargado cosas de verdad.
