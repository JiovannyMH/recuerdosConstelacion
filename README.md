# Cielo de recuerdos

Aplicacion de aniversario hecha con React, Vite y Netlify Functions. Incluye login con usuarios predefinidos, control de roles, modo solo vista, constelaciones de recuerdos y un panel para agregar imagenes, videos o textos.

## Lo que hace

- Login privado con usuario y contrasena, sin proveedor externo.
- Dos roles base pensados para ustedes: admin y viewer.
- Permiso opcional para convertir a alguien en editor desde el panel.
- Cielo con estilo de atardecer donde cada estrella abre un recuerdo.
- Recuerdos por constelacion, con navegacion entre etapas.
- Carga de imagenes o videos desde archivo local o por URL.
- Persistencia en Netlify Blobs en produccion.

## Tecnologias

- React 19 + Vite
- Netlify Functions
- Netlify Blobs

## Configuracion de usuarios

Define tus usuarios en la variable de entorno APP_USERS_JSON. Tienes un ejemplo completo en .env.example.

Ejemplo:

```env
APP_JWT_SECRET=una-clave-larga-y-privada
APP_TOKEN_DAYS=30
APP_USERS_JSON=[{"username":"tu_usuario","password":"tu_clave","displayName":"Tu nombre","role":"admin"},{"username":"ella","password":"su_clave","displayName":"Su nombre","role":"viewer"}]
```

Roles disponibles:

- admin: puede ver, crear constelaciones, agregar recuerdos y cambiar permisos.
- editor: puede ver, crear constelaciones y agregar recuerdos.
- viewer: solo puede mirar.

## Recuerdos multimedia

Puedes agregar recuerdos de tres tipos:

- Texto
- Imagen
- Video

Para imagen o video tienes dos opciones:

- Subir un archivo local directamente desde el formulario.
- Pegar una URL externa si ya tienes el archivo publicado.

### Imagenes de recuerdos en GitHub

Las imagenes de recuerdos ahora se sirven desde el propio proyecto para que queden versionadas en GitHub.

- Guarda tus imagenes en `public/recuerdos/`.
- Usa en la app la ruta publica, por ejemplo: `/recuerdos/nuestra-foto.jpg`.
- No uses `data:image/...` ni enlaces externos para recuerdos de tipo imagen.

Nota:

- El campo de subida directa en el formulario queda reservado para videos.
- Si agregas una imagen nueva al proyecto, haz commit y push para que Netlify la publique.

### Importar imagenes desde Descargas

Si quieres copiar automaticamente tus imagenes al proyecto:

```bash
npm run import:recuerdos
```

Esto hace lo siguiente:

- Copia imagenes desde tu carpeta `Downloads` a `public/recuerdos/`.
- Renombra archivos a un formato seguro para rutas web.
- Genera `public/recuerdos/recuerdos-manifest.json` con las rutas `/recuerdos/...` listas para usar en los recuerdos.

### Sincronizar recuerdos locales al proyecto (opcion 2)

Para que los recuerdos creados localmente se publiquen en Netlify via GitHub:

1. En la app, usa el boton **Exportar recuerdos (JSON)**.
2. Se descargara un archivo como `recuerdos-export-YYYY-MM-DD....json`.
3. En el proyecto, ejecuta:

```bash
npm run sync:recuerdos
```

4. El comando toma el export mas reciente de Descargas y actualiza `shared/user-constellations.mjs`.
5. Haz commit y push para que Netlify despliegue esos cambios.

Opcional: puedes pasar una ruta manual.

```bash
npm run sync:recuerdos -- C:/ruta/al/archivo/recuerdos-export.json
```

Si subes archivo local, intenta que no pese demasiado. El proyecto limita la carga a 8 MB por recuerdo para evitar problemas con Netlify.

## Desarrollo local

Instala dependencias:

```bash
npm install
```

Levanta el frontend:

```bash
npm run dev
```

## Verlo con Live Server

Live Server no ejecuta Vite ni las Netlify Functions, asi que no debes abrir la raiz del proyecto directamente. El flujo correcto es este:

1. Crea un archivo .env a partir de .env.example si quieres personalizar usuarios del modo local.
2. Genera el build estatico:

```bash
npm run build
```

3. Abre la carpeta dist con Live Server, o abre dist/index.html con la extension.

Notas importantes:

- El build ya usa rutas relativas, asi que funciona servido desde dist/ con Live Server.
- En ese modo, la app usa localStorage del navegador para login, recuerdos y permisos.
- Si cambias recuerdos o roles en Live Server, esos cambios quedan guardados solo en tu navegador local.
- Si abres la raiz del proyecto con Live Server, no va a funcionar porque Vite necesita transformar React durante desarrollo.

Si quieres probar tambien las funciones de Netlify en local, usa la CLI de Netlify:

```bash
npm install -g netlify-cli
netlify dev
```

## Despliegue en Netlify

1. Sube este proyecto a un repositorio.
2. Conectalo en Netlify.
3. Configura estas variables de entorno en el panel de Netlify:
	- APP_JWT_SECRET
	- APP_TOKEN_DAYS
	- APP_USERS_JSON
4. Despliega normalmente.

Netlify detecta automaticamente:

- build de Vite hacia dist
- funciones en netlify/functions
- rutas /api/* redirigidas a las functions

## Persistencia

- En produccion, los recuerdos y cambios de roles se guardan en Netlify Blobs.
- En desarrollo sin Netlify Blobs, la app usa almacenamiento temporal en memoria para que puedas probar el flujo.

## Limitaciones actuales

- La creacion de usuarios nuevos no se hace desde la interfaz. Si quieres agregar otro usuario, debes editar APP_USERS_JSON y volver a desplegar.
- Los videos muy pesados no son buena opcion para guardarlos embebidos como data URL.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
