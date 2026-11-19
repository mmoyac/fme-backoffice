# Tasks

## 1. Componente de etiqueta reutilizable

- [x] 1.1 Crear `components/etiquetas/EtiquetaNutricional.tsx` moviendo desde `EtiquetaPreview.tsx` los `configs`, `TamanoEtiqueta`, `SelloHexagonal` y los layouts A4, 62×100, 62×29 y 29×90, sin cambios visuales. Verificar: `npx tsc --noEmit` sin errores nuevos.
- [x] 1.2 Agregar la prop opcional `lote?: { fecha: string; codigo: string }` y reemplazar las líneas "Fecha de elaboración / Lote: ____" (A4) y "Fecha / Lote: ____" (62×100) por `"{fecha} / Lote {codigo}"` cuando viene; sin `lote`, queda la línea en blanco. Verificar renderizando con y sin `lote`.

## 2. Generación de PDF compartida

- [x] 2.1 Crear `lib/etiquetas/pdf.ts` con `generarPdfEtiquetas(items: { nodo: HTMLElement; copias: number }[], tamano)` (una captura `html2canvas` por nodo, `addPage` + `addImage` por copia, con el mismo alias de imagen), `descargarPdf(pdf, nombre)` e `imprimirPdf(pdf)` (iframe oculto actual). Verificar: `tsc` sin errores.
- [ ] 2.2 Refactorizar `components/EtiquetaPreview.tsx` para que use `<EtiquetaNutricional>` (vista escalada y render oculto) y `lib/etiquetas/pdf.ts`. Verificar en `localhost:3001/admin/productos/1534` → pestaña Etiquetas → preview: los 4 formatos se ven igual que antes, A4 por defecto, lote en blanco, y Descargar e Imprimir generan un PDF de 1 página.

## 3. Etiquetas desde producción

- [x] 3.1 Crear `components/produccion/EtiquetasOrdenModal.tsx`: carga `getEtiquetaCompleta` por detalle con `Promise.allSettled`; muestra una fila por producto con nombre, cantidad producida y copias editables (sugeridas `ceil(producida / porciones_por_envase)` o `ceil(producida)`); deshabilita con el aviso "sin información nutricional" los productos sin etiqueta; selector de formato con `62x100` por defecto; lote `{ fecha: dd/mm/aaaa local de fecha_finalizacion, codigo: 'OP-<id>' }`. Verificar: `tsc` sin errores.
- [x] 3.2 En el modal, render oculto fuera de pantalla de un `<EtiquetaNutricional lote=…>` por producto con copias > 0, y botones Descargar PDF e Imprimir que usan `lib/etiquetas/pdf.ts`; ambos deshabilitados si el total de copias es 0. Mostrar el total de páginas.
- [x] 3.3 En `app/admin/produccion/page.tsx`, agregar el botón 🏷️ junto al 🖨️ en `acciones(orden)`, visible solo si `orden.estado === 'FINALIZADA'` y `tieneModulo(user, 'etiquetado')`, que abre el modal. Verificar: aparece en finalizadas y no en planificadas.

## 4. Verificación end-to-end en local

- [ ] 4.1 En dev, crear una OP del SKU 10037 (más un producto sin información nutricional), finalizarla con cantidad producida 80 y abrir 🏷️. Verificar: 10037 sugiere 10 copias (80 ÷ 8); el otro producto aparece deshabilitado; formato por defecto DK-11202.
- [ ] 4.2 Descargar el PDF. Verificar: 10 páginas de 100×62 mm con "dd/mm/aaaa / Lote OP-<id>" correctos y sellos, código de barras y tabla nutricional iguales a la preview del producto; repetir en A4 y comprobar el lote en la página A4.
- [ ] 4.3 Imprimir en la Brother QL-800 (o "Guardar como PDF" del diálogo de impresión) una tirada corta para confirmar el tamaño físico.

## Workflow follow-up

- El usuario prueba en local y da OK antes de hacer push a `main` (prod).
- Archivar el change solo con OK del usuario.
