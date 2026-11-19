# Proposal

## Why

La empresa imprime hoy sus etiquetas en P-touch Editor con un diseño propio de 75 × 62 mm (Brother QL-820NWB, rollo continuo de 62 mm). Ese diseño es el que deben tener ahora las etiquetas del sistema (referencia: `fme-backend/docs/etiquetado/etiqueta.jpeg` y `empanadas queso sellos.lbx.zip`). Ninguno de los formatos actuales (62×100, 62×29, 29×90, A4) lo reproduce, así que siguen diseñando a mano en P-touch.

## What Changes

- Nuevo formato de etiqueta **75 × 62 mm horizontal** que se **agrega** a los existentes (62×100 sigue disponible y sigue siendo el valor por defecto donde lo es hoy).
- El formato **DK-11202 (100 × 62 mm)** también adopta el diseño de la empresa, adaptado a ese ancho (decisión del usuario del 2026-11-18): reemplaza su diagramación anterior. A4, 62×29 y 29×90 no cambian.
- Diagramación según el ejemplo:
  - Marco negro alrededor de la etiqueta.
  - Columna izquierda: nombre del producto grande en mayúsculas con logo al lado; contenido neto; ingredientes; preparación y conservación en negrita; alérgenos en negrita cursiva; dirección y origen ("Producto Chileno"); resolución sanitaria; "Lote N°" (con el código si viene de una OP); "ELABORACIÓN / VENCIMIENTO" en blanco para completar a mano; código de barras abajo.
  - Columna derecha: sellos "ALTO EN" apilados y tabla nutricional con borde redondeado, columnas "100 g" y "1 porción".
  - Pie: "Elaborado por <razón social> · Fono <teléfono> · <comuna>".
- La tabla nutricional de este formato muestra **siempre** las filas obligatorias según el Manual de Etiquetado (3ª ed. 2022, pág. 19), aunque el ejemplo no las traiga: energía, proteínas, grasas totales, H. de C. disponibles, **azúcares totales** y sodio; y, si las grasas totales por porción son ≥ 3 g, saturadas, monoinsaturadas, poliinsaturadas, **trans** y colesterol.
- La fecha de vencimiento NO se calcula: queda en blanco para escribirla a mano, igual que en el ejemplo.
- Nuevos datos de empresa por tenant (backend `fme-backend`, tabla `configuracion_landing`), editables en Configuración → Landing y expuestos en la etiqueta completa:
  - `etiqueta_origen` (ej. "Producto Chileno"),
  - `etiqueta_comuna` (ej. "Santiago, Lampa"),
  - `etiqueta_logo_url` opcional (logo blanco y negro para impresora térmica; si está vacío se usa `logo_url`).

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `etiquetas-nutricionales`: se agrega el formato 75×62 con su diagramación, la regla de filas obligatorias de la tabla nutricional y los datos de empresa por tenant (origen, comuna, logo de etiqueta). La capability se introduce en el change aún no archivado `add-etiquetas-desde-produccion`; este change le agrega requisitos.

## Impact

- **Backoffice**: `components/etiquetas/EtiquetaNutricional.tsx` (nuevo `TamanoEtiqueta` `'75x62'` y su layout), `lib/etiquetas/pdf.ts` (sin cambios esperados: ya usa ancho/alto del formato), `components/EtiquetaPreview.tsx` y `components/produccion/EtiquetasOrdenModal.tsx` (el formato aparece en el selector), `lib/api/etiquetas.ts`, `lib/api/configuracion-landing.ts`, `app/admin/configuracion/landing/page.tsx` (3 campos nuevos).
- **Backend (`fme-backend`)**: `database/models.py` (`ConfiguracionLanding`), migración Alembic, `schemas/configuracion_landing.py`, `schemas/etiquetas.py` y `routers/etiquetas.py` (GET etiqueta completa devuelve `empresa_origen`, `empresa_comuna`, `empresa_logo_url`).
- **Datos**: el tenant 1 (Masas Estación) debe cargar origen, comuna y, de preferencia, un logo B/N; sin ellos esas partes de la etiqueta quedan vacías.
- **Capacitación**: no hay lecciones de etiquetado ni de configuración en `fme-backend/capacitacion/`; no hay lecciones afectadas.
