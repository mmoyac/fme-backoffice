# Design

## Context

- `components/EtiquetaPreview.tsx` (unas 600 líneas) es un modal que concentra cuatro cosas: el selector de formato, los layouts de la etiqueta (`LayoutA4`, `Layout62x100` e inline para 62×29 y 29×90, todos con estilos inline), un render oculto a tamaño real (`pdfRef`) y la generación de PDF con `html2canvas` + `jsPDF`, de una sola página. La impresión manda ese PDF a un iframe oculto.
- Los layouts A4 y 62×100 tienen el texto fijo "Fecha de elaboración / Lote: ____" (A4, ~línea 255) y "Fecha / Lote: ____" (62×100, ~línea 365). Los formatos 62×29 y 29×90 no muestran lote.
- `TabEtiquetas` (la ficha del producto) abre `EtiquetaPreview` con un `EtiquetaCompleta` obtenido de `getEtiquetaCompleta(productoId)`.
- `app/admin/produccion/page.tsx` lista las OP con `getOrdenesProduccion`, los locales y `getProductos()` (de ahí sale `productosMap` id→nombre). Las acciones por fila están en `acciones(orden)`. `DetalleOrden` trae `producto_id` y `cantidad_producida`; `OrdenProduccion` trae `fecha_finalizacion` y `estado`.
- El backend ya expone `GET /api/etiquetas/producto/{id}/completa`, protegido por el módulo `etiquetado`. En el frontend, `tieneModulo(user, 'etiquetado')` (`lib/modulos.ts`) permite condicionar la UI.

## Goals / Non-Goals

**Goals:**
- Un solo componente de etiqueta, compartido por la ficha del producto y por producción.
- Generar un PDF multipágina con N copias por producto en una sola acción.
- Que la preview del producto no cambie (A4 por defecto, lote en blanco).

**Non-Goals:**
- Crear o registrar lotes (`lotes`) ni vencimientos. El código `OP-<id>` es solo texto impreso.
- Cambios de backend.
- Rediseñar la gráfica de los layouts.
- Agregar fecha o lote a los formatos 62×29 y 29×90, que hoy no lo muestran; se mantienen igual.

## Decisions

1. **Extraer `components/etiquetas/EtiquetaNutricional.tsx`** (presentacional y puro): recibe `{ etiqueta: EtiquetaCompleta, tamano: TamanoEtiqueta, lote?: { fecha: string; codigo: string } }` y renderiza el layout a tamaño real en mm. `configs`, `SelloHexagonal` y los layouts se mueven ahí tal cual (también `TamanoEtiqueta` y `CONFIGS_ETIQUETA`, exportados). Si viene `lote`, la línea en blanco se reemplaza por `"{fecha} / Lote {codigo}"`; si no, queda la línea `____`.
   - Alternativa descartada: pasarle a `EtiquetaPreview` una prop `lote` y reusarlo como modal en producción. Es un modal de un solo producto y una sola página, así que no sirve para N productos × M copias.

2. **Extraer `lib/etiquetas/pdf.ts`** con `generarPdfEtiquetas(nodos: HTMLElement[], tamano): Promise<jsPDF>`: hace `html2canvas` de cada nodo y `pdf.addPage()` por cada copia, más los helpers `descargarPdf` e `imprimirPdf` (el iframe actual). Así `EtiquetaPreview` y producción comparten la generación.
   - **Optimización:** se rasteriza **una vez por producto** y se reutiliza la imagen (`addImage`) en cada copia, en vez de capturar el DOM N veces. Con 10 productos × 20 copias son 10 capturas en lugar de 200.

3. **`EtiquetaPreview` queda como wrapper**: el modal, el selector y la vista escalada usan `<EtiquetaNutricional>`, y el PDF usa `generarPdfEtiquetas` con un nodo y 1 copia. El comportamiento visible no cambia.

4. **Producción: modal `components/produccion/EtiquetasOrdenModal.tsx`** abierto desde la acción 🏷️ (modal en vez de página nueva, por consistencia con Finalizar y Editar de la misma pantalla):
   - Al abrir, llama `getEtiquetaCompleta(producto_id)` en paralelo (`Promise.allSettled`) por cada detalle. Si la etiqueta no trae `informacion_nutricional` o la llamada da 404, la fila queda deshabilitada con el aviso.
   - Copias sugeridas: `Math.ceil(cantidad_producida / porciones_por_envase)` si `porciones_por_envase > 0`; si no, `Math.ceil(cantidad_producida)`. Con producida en 0 o nula, la sugerencia es 0.
   - El lote es `{ fecha: formato dd/mm/aaaa de fecha_finalizacion en hora local (es-CL), codigo: 'OP-' + orden.id }`.
   - Render oculto fuera de pantalla: un `<EtiquetaNutricional>` por producto seleccionado, a tamaño real, para la captura.
   - El formato por defecto es `'62x100'`.

5. **Visibilidad de la acción:** `orden.estado === 'FINALIZADA' && tieneModulo(user, 'etiquetado')`.

## Risks / Trade-offs

- [Refactor de un componente grande con estilos inline puede alterar la preview existente] → mover el código sin reescribirlo y comparar a ojo la preview y el PDF de los 4 formatos con el SKU 10037 en dev, antes y después.
- [PDFs grandes con muchas copias (PNG escala 3 por página)] → reutilizar la misma imagen por producto. jsPDF igual incrusta cada `addImage`, pero con el mismo alias de imagen se deduplica. Para tiradas muy grandes, avisar si el total pasa de ~300 páginas.
- [`fecha_finalizacion` viene en UTC] → formatear en la zona del navegador (Chile) para no correr el día en finalizaciones de la noche.
- [`html2canvas` necesita que el nodo esté renderizado y visible para medir] → mantener el patrón actual: contenedor `position: fixed; left: -10000px`, no `display: none`.

## Migration Plan

Solo frontend: se despliega con el push habitual del backoffice. Para rollback, revertir el commit. No hay datos que migrar.
