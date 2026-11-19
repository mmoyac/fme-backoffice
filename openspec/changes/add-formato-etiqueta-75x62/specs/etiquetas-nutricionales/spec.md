# Spec Delta

## ADDED Requirements

### Requirement: Formato de etiqueta 75 × 62 mm
El sistema SHALL ofrecer un formato de etiqueta "75 × 62 mm" (horizontal, para Brother QL con rollo continuo de 62 mm) además de los formatos existentes, en todos los lugares donde se elige formato de etiqueta (ficha del producto y etiquetas desde una orden de producción). El formato seleccionado por defecto en cada pantalla MUST NOT cambiar.

#### Scenario: Formato disponible en el selector
- **WHEN** el usuario abre el selector de formato de etiqueta en la ficha del producto o en las etiquetas de una OP finalizada
- **THEN** aparece la opción "75 × 62 mm" junto a las opciones existentes
- **AND** el formato preseleccionado es el mismo que antes de este cambio

#### Scenario: PDF del tamaño correcto
- **WHEN** el usuario descarga o imprime etiquetas en formato 75 × 62 mm
- **THEN** el PDF tiene una página de 75 mm de ancho por 62 mm de alto por cada copia

### Requirement: Diagramación del formato 75 × 62 mm
La etiqueta 75 × 62 mm SHALL seguir la diagramación de referencia de la empresa: marco alrededor; a la izquierda el nombre del producto destacado en mayúsculas con el logo al lado, contenido neto, ingredientes, preparación y condiciones de conservación destacadas, alérgenos destacados, dirección y origen, resolución sanitaria, "Lote N°", "ELABORACIÓN / VENCIMIENTO" y el código de barras; a la derecha los sellos "ALTO EN" apilados y la tabla nutricional; y un pie con "Elaborado por <razón social>", el teléfono y la comuna. Un dato vacío MUST NOT dejar un rótulo sin contenido (ej. no se imprime "Fono" si no hay teléfono).

#### Scenario: Producto con todos los datos
- **WHEN** se genera la etiqueta 75 × 62 mm de un producto con información nutricional, sellos, código de barras y datos de empresa completos
- **THEN** la etiqueta muestra todos los elementos en la posición descrita

#### Scenario: Producto sin sellos
- **WHEN** el producto no tiene sellos "ALTO EN"
- **THEN** la columna derecha muestra solo la tabla nutricional, sin espacios de sello vacíos

#### Scenario: Datos de empresa incompletos
- **WHEN** el tenant no tiene teléfono configurado
- **THEN** el pie muestra razón social y comuna sin el rótulo "Fono"

### Requirement: Formato 100 × 62 mm con el diseño de la empresa
El formato DK-11202 (100 × 62 mm) SHALL usar la misma diagramación, reglas de tabla nutricional y tratamiento de lote y vencimiento que el formato 75 × 62 mm, adaptados a 100 mm de ancho. Los sellos "ALTO EN" MAY ir en una fila sobre la tabla para aprovechar el ancho.

#### Scenario: Mismo diseño en 100 × 62
- **WHEN** el usuario genera etiquetas en formato DK-11202 (100 × 62 mm)
- **THEN** la etiqueta tiene marco, nombre con logo, textos, lote, elaboración/vencimiento, código de barras, sellos, tabla nutricional y pie, como en el formato 75 × 62 mm
- **AND** el PDF tiene páginas de 100 × 62 mm

#### Scenario: Otros formatos sin cambios
- **WHEN** el usuario genera etiquetas en A4, 62 × 29 mm o 29 × 90 mm
- **THEN** la diagramación es la misma que antes de este cambio

### Requirement: Tamaño legal y ubicación de los sellos "ALTO EN"
En los formatos con el diseño de la empresa (75 × 62 y 100 × 62 mm), cada sello "ALTO EN" SHALL medir al menos el lado que exige el Manual de Etiquetado Nutricional (pág. 30) según el área de la etiqueta (1,5 cm entre 30 y menos de 60 cm²; 2,0 cm entre 60 y menos de 100 cm²). Los sellos SHALL ir de a 2 por fila como máximo, pegados al borde derecho, con la tabla nutricional debajo. Si no caben a ese tamaño junto con la tabla, el sistema MUST impedir descargar o imprimir e indicar el formato que sí lo permite.

#### Scenario: Tamaño por formato
- **WHEN** se generan etiquetas en 75 × 62 mm (46,5 cm²) o 100 × 62 mm (62 cm²)
- **THEN** los sellos miden 1,5 cm y 2,0 cm de lado, respectivamente

#### Scenario: Cuatro sellos en 75 × 62 mm
- **WHEN** un producto con 4 sellos se imprime en 75 × 62 mm
- **THEN** los sellos van en 2 filas de 2, pegados a la derecha, y la tabla debajo en letra compacta

#### Scenario: Cuatro sellos en 100 × 62 mm
- **WHEN** un producto con 3 o 4 sellos se quiere imprimir en 100 × 62 mm (sellos de 2,0 cm)
- **THEN** los botones Descargar e Imprimir quedan deshabilitados
- **AND** se indica que se use 75 × 62 mm

### Requirement: Vencimiento y lote en el formato 75 × 62 mm
En la etiqueta 75 × 62 mm la fecha de vencimiento SHALL quedar en blanco para completarla a mano. El lote SHALL mostrar la fecha de elaboración y el código de la OP cuando la etiqueta se imprime desde una orden de producción, y quedar en blanco cuando se imprime desde la ficha del producto.

#### Scenario: Impresión desde una OP
- **WHEN** se imprimen etiquetas 75 × 62 mm desde la OP #34 finalizada el 18/11/2026
- **THEN** la etiqueta muestra la elaboración 18/11/2026 y el lote OP-34
- **AND** el vencimiento queda en blanco

#### Scenario: Impresión desde la ficha del producto
- **WHEN** se imprime la etiqueta 75 × 62 mm desde la ficha del producto
- **THEN** lote, elaboración y vencimiento quedan en blanco para completar a mano

### Requirement: Filas obligatorias de la tabla nutricional en 75 × 62 mm
La tabla nutricional del formato 75 × 62 mm SHALL mostrar dos columnas (por 100 g y por porción) y siempre las filas obligatorias del Manual de Etiquetado Nutricional: energía (kcal), proteínas (g), grasas totales (g), hidratos de carbono disponibles (g), azúcares totales (g) y sodio (mg). Cuando las grasas totales por porción sean 3 g o más, SHALL mostrar además grasas saturadas, monoinsaturadas, poliinsaturadas, trans (g) y colesterol (mg). Si un valor obligatorio no está cargado, la fila MUST aparecer con "—" en lugar de omitirse.

#### Scenario: Producto con grasas ≥ 3 g por porción
- **WHEN** el producto declara 6,4 g de grasas totales por porción
- **THEN** la tabla incluye saturadas, monoinsaturadas, poliinsaturadas, trans y colesterol

#### Scenario: Producto con grasas < 3 g por porción
- **WHEN** el producto declara 1,2 g de grasas totales por porción
- **THEN** la tabla no está obligada a mostrar el desglose de grasas

#### Scenario: Azúcares no cargados
- **WHEN** el producto no tiene cargado el valor de azúcares totales
- **THEN** la fila "Azúcares totales (g)" aparece con "—"

### Requirement: Datos de empresa para etiquetas por tenant
Cada tenant SHALL poder configurar, en Configuración → Landing, el origen del producto (ej. "Producto Chileno"), la comuna del pie de etiqueta (ej. "Santiago, Lampa") y un logo específico para etiquetas. La etiqueta SHALL usar el logo de etiquetas si existe y, si no, el logo general del tenant. Estos datos MUST ser propios de cada tenant.

#### Scenario: Configurar origen y comuna
- **WHEN** un administrador guarda "Producto Chileno" como origen y "Santiago, Lampa" como comuna
- **THEN** las etiquetas 75 × 62 mm de ese tenant muestran ambos textos

#### Scenario: Sin logo de etiquetas
- **WHEN** el tenant no tiene logo de etiquetas pero sí logo general
- **THEN** la etiqueta usa el logo general

#### Scenario: Aislamiento por tenant
- **WHEN** el tenant A configura su origen y comuna
- **THEN** las etiquetas del tenant B no cambian
