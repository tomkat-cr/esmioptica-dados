# CONFIGURACION DE LA BASE DE DATOS DE FIREBASE

Guía de Configuración de Firebase para la Aplicación React "Lanza el Dado y Gana"

Esta guía te llevará a través de los pasos necesarios para configurar un proyecto de Firebase, obtener tus credenciales y preparar la base de datos de Firestore para tu aplicación de React.

## Paso 1: Crear un Proyecto de Firebase

Ve a la Consola de Firebase:

Abre tu navegador y dirígete a [https://console.firebase.google.com](https://console.firebase.google.com)

1. Inicia Sesión:
Inicia sesión con tu cuenta de Google.

2. Añadir Proyecto:
Haz clic en "Añadir proyecto" o "Crear un proyecto".

3. Nombre del Proyecto: Ingresa un nombre para tu proyecto (ej. "EsmiOpticaDadoVirtual"). Este nombre es solo para tu referencia en la consola.

4. Google Analytics: Decide si deseas habilitar Google Analytics para este proyecto. Para fines de marketing y seguimiento de usuarios, es altamente recomendable mantenerlo habilitado.

5. Crear Proyecto: Sigue los pasos y haz clic en "Crear proyecto". Espera a que Firebase aprovisione los recursos.

## Paso 2: Registrar tu Aplicación Web en Firebase

Una vez que tu proyecto de Firebase esté creado:

1. Añadir una Aplicación a tu Proyecto: En la página principal de tu nuevo proyecto de Firebase, haz clic en el icono de "Web" ( < /> ) para añadir una aplicación web.

2. Nombre de la Aplicación: Ingresa un apodo para tu aplicación (ej. "LanzaElDadoWeb"). Es opcional configurar el hosting en este paso, puedes dejarlo desmarcado por ahora si ya usas WordPress.

3. Registrar Aplicación: Haz clic en "Registrar aplicación".

4. Obtener Credenciales de Configuración: Firebase te proporcionará un objeto de configuración (firebaseConfig). Copia este objeto completo. Lucirá algo como esto (los valores serán únicos para tu proyecto):

```js
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "...",
  appId: "1:...",
  measurementId: "G-..." // Si habilitaste Analytics
};
```

Guarda este firebaseConfig en un lugar seguro. Lo necesitarás para tu aplicación React.

## Paso 3: Configurar la Base de Datos Firestore

Tu aplicación utiliza Firestore para guardar los leads y los códigos de los premios.

1. Ir a Firestore Database: En el menú lateral izquierdo de la Consola de Firebase, haz clic en "Firestore Database".

2. Crear Base de Datos: Haz clic en "Crear base de datos".

3. Modo de Inicio:
    Para pruebas y desarrollo inicial, puedes seleccionar "Iniciar en modo de prueba" (lo que permite lectura y escritura públicas durante 30 días). Sin embargo, para producción, DEBES cambiar a "Iniciar en modo de producción bloqueado" y luego ajustar las reglas de seguridad.
    Si seleccionas "Modo de producción bloqueado", no te preocupes, ajustaremos las reglas en el siguiente paso.

4. Ubicación de Cloud Firestore:
    Elige una ubicación para tu base de datos.
    Selecciona la región que esté más cerca de tus usuarios o de tu servidor principal para una mejor latencia (ej. southamerica-east1 si estás en Sudamérica).

5. Habilitar: Haz clic en "Habilitar" y espera a que se cree la base de datos.

### Ajustar Reglas de Seguridad de Firestore (CRÍTICO para la funcionalidad)

Para que tu aplicación pueda escribir leads en Firestore, necesitarás ajustar las reglas.

1. Pestaña "Reglas": En la interfaz de Firestore, haz clic en la pestaña "Reglas".

2. Editar las Reglas: Reemplaza las reglas existentes con el siguiente código. Estas reglas permiten la lectura y escritura en la colección game_leads solo si el usuario está autenticado (anónima o de otra forma), lo cual es manejado por el código de React.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas para la colección pública de leads del juego
    // Permite lectura y escritura si el usuario está autenticado
    match /artifacts/{appId}/public/data/game_leads/{document=**} {
      allow read, write: if request.auth != null;
    }

    // Si tienes otras colecciones o datos privados, asegúrate de añadir reglas específicas aquí
    // Por ejemplo, para datos privados por usuario (si más adelante lo necesitas):
    /*
    match /artifacts/{appId}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    */
  }
}
```

3. Publicar Reglas: Haz clic en "Publicar" para guardar los cambios.

## Paso 4: Configurar Firebase Authentication

Tu aplicación usa autenticación anónima por defecto para generar un userId para cada participante

1. Ir a Authentication: En el menú lateral izquierdo de la Consola de Firebase, haz clic en "Authentication".

2. Pestaña "Método de inicio de sesión": Haz clic en la pestaña "Método de inicio de sesión".

3. Habilitar Anónimo: Busca la opción "Anónimo" en la lista y haz clic en el icono del lápiz para editarlo. Habilítalo y haz clic en "Guardar".

## Paso 5: Integrar las Credenciales de Firebase en tu Aplicación React

Ahora que tienes tus credenciales y Firebase está configurado, debes pasárselas a tu aplicación React.

1. En el código de tu componente App.js (en el useEffect de inicialización de Firebase), verás las siguientes líneas:

```js
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
```

Estas líneas están diseñadas para funcionar en un entorno como Canvas, donde __firebase_config y __app_id se inyectan globalmente.

2. Si estás instalando esto en un WordPress o servidor propio (fuera de Canvas), debes reemplazar estas líneas por tus valores directos o inyectarlos de otra manera segura:

### Opción 1: Hardcodeado (Solo para PRUEBAS LOCALES, NO para PRODUCCIÓN)

```js
const firebaseConfig = {
  apiKey: "TU_FIREBASE_API_KEY_AQUÍ", // <--- Pega tu apiKey
  authDomain: "tu-proyecto.firebaseapp.com", // <--- Pega tu authDomain
  projectId: "tu-proyecto-id", // <--- Pega tu projectId
  storageBucket: "tu-proyecto.appspot.com", // <--- Pega tu storageBucket
  messagingSenderId: "...", // <--- Pega tu messagingSenderId
  appId: "1:...", // <--- Pega tu appId
  measurementId: "G-..." // <--- Pega tu measurementId (si aplica)
};
const appId = "tu-app-id-de-firebase"; // <--- Pega el valor de tu appId de Firebase
```

ADVERTENCIA: NO coloques tu apiKey directamente en el código fuente de una aplicación de producción que se ejecuta en el navegador. Cualquiera podría verla.

### Opción 2: Variables de Entorno (RECOMENDADO para Producción)

Esta es la mejor práctica para producción.

1. Crea un archivo .env en la raíz de tu proyecto React (si no existe).

2. Añade tus variables:

```env
REACT_APP_FIREBASE_API_KEY=AIzaSyC...
REACT_APP_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=tu-proyecto-id
REACT_APP_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=1:...
REACT_APP_FIREBASE_MEASUREMENT_ID=G-...
REACT_APP_CANVAS_APP_ID=default-app-id-para-wordpress-o-tu-id-único
```

(Nota: El prefijo REACT_APP_ es necesario para que Create React App las reconozca).

3. Accede a ellas en tu código React:

```js
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};
const appId = process.env.REACT_APP_CANVAS_APP_ID || 'default-app-id'; // Usar un default si la variable no está
```

4. ¡Re-compila! Después de crear o modificar el archivo `.env`, debes volver a ejecutar `npm run build` para que React lea estas nuevas variables y las incluya en la compilación. 

Una vez que hayas completado estos pasos, tu aplicación React estará configurada para interactuar con tu proyecto de Firebase, permitiendo que el juego guarde los leads y acceda a las funcionalidades de IA.