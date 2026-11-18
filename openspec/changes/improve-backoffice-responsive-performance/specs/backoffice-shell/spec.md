# Spec Delta

## ADDED Requirements

### Requirement: Sin scroll horizontal de página
El backoffice SHALL mostrar cada pantalla sin desplazamiento horizontal del documento en anchos de 320 px o más. El contenido más ancho que la pantalla SHALL desplazarse dentro de su propio contenedor.

#### Scenario: Tabla ancha en escritorio
- **WHEN** una pantalla muestra una tabla más ancha que el área de contenido
- **THEN** la tabla se desplaza dentro de su recuadro y la página no tiene scroll horizontal

#### Scenario: Pantalla en celular
- **WHEN** se abre cualquier pantalla migrada en un ancho de 320 px
- **THEN** el ancho del documento no supera el de la pantalla

### Requirement: Listas distintas en escritorio y móvil
Las listas de registros SHALL mostrarse como tabla en pantallas de 1024 px o más y como tarjetas en pantallas más angostas, con la misma información principal y las mismas acciones.

#### Scenario: Escritorio
- **WHEN** se ve una lista en una pantalla de 1280 px
- **THEN** se muestra como tabla con columnas de ancho fijo y textos truncados

#### Scenario: Móvil
- **WHEN** se ve la misma lista en una pantalla de 390 px o de una tablet de 768 px
- **THEN** se muestra como tarjetas apiladas, sin tabla

### Requirement: Sesión y menú cargados una vez
El backoffice SHALL obtener el usuario y el menú una vez por sesión y reutilizarlos al navegar entre pantallas, sin volver a pedirlos al servidor en cada cambio de ruta. La autorización de rutas por rol SHALL mantenerse igual.

#### Scenario: Navegar entre pantallas
- **WHEN** un usuario autenticado navega de una pantalla del backoffice a otra
- **THEN** no se vuelve a pedir el usuario ni el menú, y el menú lateral no vuelve a mostrar su estado de carga

#### Scenario: Ruta no permitida para el rol
- **WHEN** un usuario no admin entra a una ruta que no está en su menú
- **THEN** es redirigido al primer ítem de su menú, como hasta ahora

### Requirement: Respuesta inmediata al navegar
Al navegar a otra pantalla, el backoffice SHALL mostrar de inmediato un estado de carga dentro del marco (menú y barra superior visibles) mientras llega la pantalla nueva.

#### Scenario: Clic en un ítem del menú
- **WHEN** el usuario hace clic en un ítem del menú
- **THEN** el área de contenido muestra un estado de carga sin esperar la respuesta del servidor

### Requirement: Las respuestas de la API no se guardan en la caché del service worker
El service worker SHALL cachear solo los archivos estáticos de la aplicación. Las llamadas a la API SHALL ir siempre a la red, para no mostrar datos viejos ni datos de otra sesión o tenant.

#### Scenario: Cambio de tenant del superadmin
- **WHEN** el superadmin cambia de tenant y vuelve a abrir una pantalla
- **THEN** los datos provienen de la API para el tenant activo y no de una respuesta guardada
