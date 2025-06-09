# CONFIGURACION DEL PLUGIN DE WORDPRESS

Guía de Integración: Aplicación React "Lanza el Dado y Gana" en WordPress

Para que tu juego de "Lanza el Dado y Gana" sea funcional en WordPress, necesitarás seguir estos pasos. La idea general es "construir" (compilar) tu aplicación React en archivos estáticos y luego "incrustarlos" en una página de WordPress.

## Paso 1: Preparar tu Aplicación React para Producción

Primero, debes compilar tu aplicación React. Esto la optimiza y la empaqueta en archivos HTML, CSS y JavaScript que un navegador puede entender y WordPress puede servir.

### Abrir tu Proyecto React

Abre tu terminal (línea de comandos) y navega hasta la carpeta raíz de tu proyecto React (donde está el archivo package.json).

### Instalar Dependencias (si no lo has hecho)

Si es un proyecto nuevo o cambiaste de entorno, asegúrate de tener las dependencias instaladas:

```bash
npm install
# o
yarn install
```

### Compilar la Aplicación

Ejecuta el comando de compilación:

```bash
npm run build
# o
yarn build
```

Este comando creará una carpeta build (o dist) en la raíz de tu proyecto. Dentro de esta carpeta estarán los archivos estáticos (index.html, archivos .js, .css, etc.).

Estos son los archivos que necesitas para WordPress.

## Paso 2: Elegir un Método para Incrustar en WordPress (Recomendado: Plugin Personalizado)

La forma más robusta y profesional de integrar una aplicación React en WordPress es a través de un plugin personalizado o un tema hijo. Esto te da control total y evita que los cambios en el tema de WordPress rompan tu aplicación.

### Opción Recomendada: Crear un Plugin Personalizado

Esta opción es ideal porque aísla tu aplicación y sus configuraciones.

1. Crea una Carpeta para el Plugin

Dentro de la carpeta wp-content/plugins/ de tu instalación de WordPress, crea una nueva carpeta (ej. esmioptica-dice-game).

2. Crea el Archivo Principal del Plugin

Dentro de la carpeta wp-content/plugins/ de tu instalación de WordPress, crea una nueva carpeta (ej. esmioptica-dice-game).

3. Crea el Archivo Principal del Plugin

Dentro de esa carpeta, crea un archivo PHP (ej. esmioptica-dice-game.php) con este contenido básico para activarlo:

```php
<?php
/**
 * Plugin Name: EsmiÓptica Lanza el Dado y Gana
 * Description: Integra la aplicación React "Lanza el Dado y Gana" de EsmiÓptica.
 * Version: 1.0
 * Author: Tu Nombre
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly
}

// Define el shortcode para incrustar la aplicación React
function esmioptica_dice_game_shortcode() {
    // ID del div donde React montará la aplicación
    $html = '<div id="root-dice-game"></div>';
    return $html;
}
add_shortcode( 'esmioptica_dice_game', 'esmioptica_dice_game_shortcode' );

// Encola los scripts y estilos de React
function esmioptica_enqueue_react_app() {
    // Solo encola si estamos en la página que contiene el shortcode
    // Asegúrate de cambiar 'lanzar-dado-y-gana' por el slug de tu página de WordPress
    if ( is_page( 'lanzar-dado-y-gana' ) ) { // <--- CAMBIA ESTO AL SLUG DE TU PÁGINA
        // Encola los archivos CSS generados por React
        wp_enqueue_style( 'esmioptica-react-style', plugins_url( 'build/static/css/main.css', _FILE_ ) ); // <--- RUTA CORRECTA

        // Encola los archivos JS generados por React
        wp_enqueue_script( 'esmioptica-react-runtime', plugins_url( 'build/static/js/runtime-main.js', _FILE_ ), array(), null, true ); // <--- RUTA CORRECTA
        wp_enqueue_script( 'esmioptica-react-main', plugins_url( 'build/static/js/main.js', _FILE_ ), array('esmioptica-react-runtime'), null, true ); // <--- RUTA CORRECTA

        // ***********************
        // PASO CRÍTICO: Localizar las variables globales de Firebase
        // Asegúrate de que __app_id y __firebase_config sean las correctas.
        // *NO INCLUYAS LA API KEY DE FIREBASE DIRECTAMENTE AQUÍ EN UN ENTORNO PÚBLICO*
        // La variable __initial_auth_token es proporcionada por Canvas.
        // Para una integración fuera de Canvas, necesitarías una autenticación diferente.
        // Si la aplicación se va a usar SOLO dentro del entorno Canvas, estas variables
        // se manejan automáticamente. Si es para un sitio web público fuera de Canvas,
        // necesitas definir cómo se obtendrá la API key de Firebase (ej. variables de entorno)
        // y la autenticación.
        // ***********************
        $firebase_config_js = json_encode([
            'apiKey'            => 'TU_FIREBASE_API_KEY', // <--- CAMBIA ESTO
            'authDomain'        => 'TU_FIREBASE_AUTH_DOMAIN', // <--- CAMBIA ESTO
            'projectId'         => 'TU_FIREBASE_PROJECT_ID', // <--- CAMBIA ESTO
            'storageBucket'     => 'TU_FIREBASE_STORAGE_BUCKET', // <--- CAMBIA ESTO
            'messagingSenderId' => 'TU_FIREBASE_MESSAGING_SENDER_ID', // <--- CAMBIA ESTO
            'appId'             => 'TU_FIREBASE_APP_ID', // <--- CAMBIA ESTO
            'measurementId'     => 'TU_FIREBASE_MEASUREMENT_ID' // <--- CAMBIA ESTO
        ]);

        wp_add_inline_script(
            'esmioptica-react-main',
            "var __app_id = '" . esc_js( get_option( 'esmioptica_app_id', 'default-app-id' ) ) . "';" . // Puedes guardar el app_id en las opciones de WP
            "var __firebase_config = " . $firebase_config_js . ";",
            'before'
        );

        // Nota: __initial_auth_token normalmente se inyecta por el entorno Canvas.
        // Si esto es para una instalación de WordPress fuera de Canvas, necesitarás
        // manejar la autenticación de Firebase (ej. Anónima, Google, Email/Pass)
        // directamente en tu código React o a través de un backend seguro.
    }
}
add_action( 'wp_enqueue_scripts', 'esmioptica_enqueue_react_app' );

// Función para añadir la página de configuración del plugin (opcional, pero útil)
function esmioptica_add_admin_menu() {
    add_options_page(
        'Configuración EsmiÓptica Dado',
        'EsmiÓptica Dado',
        'manage_options',
        'esmioptica-dice-game',
        'esmioptica_dice_game_settings_page'
    );
}
add_action( 'admin_menu', 'esmioptica_add_admin_menu' );

function esmioptica_dice_game_settings_page() {
    // Aquí podrías añadir un formulario para que el usuario guarde el app_id de Canvas
    // y otras configuraciones de Firebase si es necesario.
    // Por ahora, es un placeholder.
    ?>
    <div class="wrap">
        <h1>Configuración de EsmiÓptica Lanza el Dado y Gana</h1>
        <p>Aquí puedes configurar las opciones para tu juego.</p>
        <p>Asegúrate de que los archivos de tu aplicación React compilada (⁠ build ⁠ folder) estén dentro de la carpeta del plugin.</p>
        <p>El shortcode para usar en tus páginas es: <code>[esmioptica_dice_game]</code></p>
        <form method="post" action="options.php">
            <?php settings_fields( 'esmioptica_dice_game_settings_group' ); ?>
            <?php do_settings_sections( 'esmioptica-dice-game' ); ?>
            <table class="form-table">
                <tr valign="top">
                <th scope="row">ID de Aplicación Canvas (__app_id)</th>
                <td><input type="text" name="esmioptica_app_id" value="<?php echo esc_attr( get_option( 'esmioptica_app_id' ) ); ?>" /></td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}

function esmioptica_register_settings() {
    register_setting( 'esmioptica_dice_game_settings_group', 'esmioptica_app_id' );
}
add_action( 'admin_init', 'esmioptica_register_settings' );
```

4. Copia los Archivos Compilados de React:

Toma todo el contenido de la carpeta build (generada en el Paso 1) y cópialo dentro de la carpeta `esmioptica-dice-game` que creaste en `wp-content/plugins/`.

Debería quedar algo como `wp-content/plugins/esmioptica-dice-game/build/`.

5. Verifica las Rutas:

Revisa las rutas en plugins_url() en el archivo PHP del plugin para asegurarte de que apunten correctamente a `build/static/css/main.css`, `build/static/js/runtime-main.js` y `build/static/js/main.js`. Estos nombres de archivo pueden variar ligeramente con cada compilación de React, así que verifícalos en tu carpeta `build/static/css` y `build/static/js`.

6. Activar el Plugin:

Ve al panel de administración de WordPress (Plugins > Plugins Instalados) y activa tu nuevo plugin "EsmiÓptica Lanza el Dado y Gana".

7. Crear una Página en WordPress:

Crea una nueva página en WordPress (ej. "Lanza el Dado y Gana").

En el editor de WordPress, inserta el shortcode que definiste en tu plugin: [esmioptica_dice_game]

¡Importante! Asegúrate de que el slug de esta página (la parte de la URL) sea el mismo que usaste en la condición `is_page( 'lanzar-dado-y-gana' )` en tu archivo PHP.

## Paso 3: Configuración de Firebase en WordPres

Tu aplicación React espera que las variables globales `__app_id` y `__firebase_config` estén definidas.

Para un entorno de WordPress, las definirás en el PHP del plugin.

En el archivo `esmioptica-dice-game.php`, en la función `esmioptica_enqueue_react_app`, encontrarás un bloque `wp_add_inline_script`.

Reemplaza los valores de `TU_FIREBASE_API_KEY`, `TU_FIREBASE_AUTH_DOMAIN`, etc., con tus credenciales reales de Firebase.

Puedes obtenerlas desde la consola de Firebase de tu proyecto (Configuración del proyecto > Configuración general > Tus apps).

La variable `__initial_auth_token`: Esta variable es proporcionada por el entorno de Canvas de Google.

Si estás instalando esto en un WordPress estándar fuera de Canvas, no existirá.

Tu aplicación React ya tiene un fallback (`signInAnonymously`) si no está presente, lo cual es ideal para un juego público.

Si necesitas autenticación de usuario completa (ej. con email/contraseña), esa lógica de autenticación debe implementarse en tu React y/o en el backend de WordPress.

Consideraciones Importantes:

- Rutas de Archivos: Las rutas en `plugins_url()` son críticas. Si tu estructura de compilación de React cambia, deberás actualizar estas rutas.
- Caché de WordPress: Después de cualquier cambio, es posible que necesites borrar la caché de WordPress (si usas un plugin de caché) y la caché de tu navegador para ver los cambios.
- Personalización del CSS: Asegúrate de que los estilos de Tailwind CSS de tu aplicación React no entren en conflicto con los estilos de tu tema de WordPress. Puedes añadir un prefijo a tus clases de Tailwind en la configuración de tailwind. Por ejemplo, en `config.js` (prefix: 'esmioptica-') si encuentras conflictos.
- Actualizaciones: Cada vez que hagas cambios significativos en tu aplicación React, deberás recompilarla (npm run build) y subir los nuevos archivos a la carpeta build de tu plugin de WordPress.

Este proceso te dará una integración sólida y funcional de tu juego "Lanza el Dado y Gana" en tu sitio de WordPress.

¡Espero que te sea de gran ayuda!
