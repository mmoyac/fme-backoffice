# Spec Delta

## Purpose

Permitir ver e imprimir la etiqueta nutricional chilena de un producto (información nutricional, sellos de advertencia, textos legales, código de barras, fecha y lote) en los formatos de impresora soportados, tanto desde la ficha del producto como en lote desde una orden de producción finalizada.

## ADDED Requirements

### Requirement: Etiqueta única para producto y producción
La etiqueta nutricional SHALL verse igual (mismo contenido y diagramación por formato) cuando se previsualiza desde la ficha del producto y cuando se imprime desde una orden de producción. La única diferencia permitida es el campo "Fecha de elaboración / Lote".

#### Scenario: Preview desde la ficha del producto
- **WHEN** el usuario abre la preview de etiqueta en la pestaña "Etiquetas y Nutrición" de un producto
- **THEN** la etiqueta se muestra en el formato A4 por defecto, con el campo "Fecha de elaboración / Lote" en blanco para completar a mano, igual que antes de este cambio

#### Scenario: Misma etiqueta desde producción
- **WHEN** el usuario imprime la etiqueta de un producto desde una orden de producción en el mismo formato que desde la ficha
- **THEN** el contenido y la diagramación son idénticos, salvo que "Fecha de elaboración / Lote" viene completo

### Requirement: Acción de etiquetas en órdenes finalizadas
La lista de órdenes de producción SHALL ofrecer una acción "Etiquetas" solo para las órdenes en estado `FINALIZADA`.

#### Scenario: Orden finalizada
- **WHEN** el usuario ve una orden en estado `FINALIZADA` en `/admin/produccion`
- **THEN** junto a la acción de imprimir la hoja de producción aparece la acción "Etiquetas"

#### Scenario: Orden no finalizada
- **WHEN** la orden está en estado `PLANIFICADA` o `CANCELADA`
- **THEN** la acción "Etiquetas" no aparece

### Requirement: Selección de productos y copias
Al abrir las etiquetas de una orden finalizada, el sistema SHALL listar cada producto de la orden con su cantidad producida y una cantidad de copias editable, con un valor sugerido.

#### Scenario: Sugerencia por envase
- **WHEN** el producto tiene porciones por envase definidas (por ejemplo 8) y la cantidad producida es 80
- **THEN** las copias sugeridas son 10 (cantidad producida dividida por porciones por envase, redondeado hacia arriba)

#### Scenario: Sin porciones por envase
- **WHEN** el producto no tiene porciones por envase definidas
- **THEN** las copias sugeridas son la cantidad producida, redondeada hacia arriba

#### Scenario: El usuario ajusta las copias
- **WHEN** el usuario cambia las copias de un producto a 0
- **THEN** ese producto no se incluye en la impresión

#### Scenario: Producto sin información nutricional
- **WHEN** un producto de la orden no tiene información nutricional cargada
- **THEN** aparece en la lista deshabilitado, con el aviso "sin información nutricional", y no se puede incluir en la impresión

### Requirement: Fecha de elaboración y lote automáticos
Las etiquetas impresas desde una orden de producción SHALL mostrar en "Fecha de elaboración / Lote" la fecha de finalización de la orden en formato dd/mm/aaaa y el código de lote `OP-<número de orden>`.

#### Scenario: Etiqueta de la orden 123
- **WHEN** se imprimen las etiquetas de la orden 123, finalizada el 18-11-2026
- **THEN** cada etiqueta muestra "18/11/2026 / Lote OP-123"

### Requirement: Formato de impresión
El usuario SHALL poder elegir el formato de las etiquetas de producción entre DK-11202 62×100 mm, 62×29 mm, 29×90 mm y A4; el formato por defecto es DK-11202 62×100 mm.

#### Scenario: Formato por defecto
- **WHEN** el usuario abre las etiquetas de una orden
- **THEN** el formato seleccionado es DK-11202 62×100 mm

### Requirement: PDF multipágina
La impresión desde producción SHALL generar un único documento PDF, con una página del tamaño del formato elegido por cada copia de cada producto seleccionado, que se puede descargar o mandar a imprimir.

#### Scenario: Dos productos
- **WHEN** el usuario imprime con 10 copias del producto A y 3 del producto B en formato DK-11202
- **THEN** se genera un PDF de 13 páginas de 100×62 mm: 10 con la etiqueta de A seguidas de 3 con la de B

#### Scenario: Nada seleccionado
- **WHEN** todos los productos tienen 0 copias o están deshabilitados
- **THEN** las acciones de imprimir y descargar quedan deshabilitadas
