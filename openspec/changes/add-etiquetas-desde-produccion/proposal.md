# Proposal

## Why

Hoy las etiquetas nutricionales solo se pueden ver e imprimir desde la ficha del producto, y siempre salen con "Fecha de elaboración / Lote" en blanco para completar a mano. Cuando se termina una orden de producción, el equipo necesita imprimir de inmediato las etiquetas de lo que se produjo, con la fecha y el lote ya puestos y en la cantidad que corresponde.

## What Changes

- Nueva acción **🏷️ Etiquetas** en `/admin/produccion`, junto al botón 🖨️ de la hoja de producción, visible solo en órdenes en estado `FINALIZADA`.
- Nueva pantalla o modal de impresión de etiquetas de una OP:
  - Lista los productos de la orden con la cantidad producida.
  - Las copias por producto son editables, con un valor sugerido de `ceil(cantidad_producida / porciones_por_envase)`; si el producto no tiene porciones por envase, se sugiere la cantidad producida.
  - El formato es elegible (DK-11202 62×100, 62×29, 29×90, A4) y por defecto es DK-11202 62×100.
  - Los productos sin información nutricional aparecen deshabilitados con el aviso "sin información nutricional".
  - Genera un único PDF multipágina (una página por etiqueta) para descargar o imprimir.
- El campo **Fecha de elaboración / Lote** se llena automáticamente con la fecha de finalización de la OP (dd/mm/aaaa) y un código de lote derivado de la OP (`OP-<id>`). No se crean tablas ni lotes nuevos.
- **Refactor:** el cuerpo de la etiqueta (layouts A4, 62×100, 62×29 y 29×90) sale de `components/EtiquetaPreview.tsx` a un componente reutilizable que recibe datos de lote opcionales. La preview del producto (`TabEtiquetas` → `EtiquetaPreview`) usa ese mismo componente y mantiene su comportamiento actual (lote en blanco, A4 por defecto).

## Capabilities

### New Capabilities
- `etiquetas-nutricionales`: preview e impresión de la etiqueta nutricional de un producto (formatos, PDF e impresión) y su impresión en lote desde una orden de producción finalizada, con fecha de elaboración y lote.

### Modified Capabilities
<!-- No hay specs existentes en openspec/specs/ de fme-backoffice. -->

## Impact

- **Frontend (fme-backoffice):**
  - `components/EtiquetaPreview.tsx`: refactor; se extrae el componente de etiqueta y la generación de PDF.
  - `components/TabEtiquetas.tsx`: solo verificar que no cambie su comportamiento.
  - `app/admin/produccion/page.tsx`: nueva acción 🏷️ y nuevo modal o página de impresión de etiquetas de la OP.
- **Backend:** sin cambios. Se usan los endpoints existentes `GET /api/etiquetas/producto/{id}/completa` y el listado y detalle de órdenes de producción.
- **Dependencias:** ninguna nueva (se reutilizan `jspdf`, `html2canvas` y `react-barcode`, ya instalados).
- **Permisos:** la etiqueta requiere el módulo `etiquetado` en el backend. Si el tenant no lo tiene, la acción 🏷️ no se muestra.
- **Capacitación:** sin lecciones afectadas; `fme-backend/capacitacion/` no tiene lecciones de producción ni de etiquetado (solo `general` e `inventario`).
