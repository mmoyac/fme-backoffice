# Tasks

## 1. Backend (fme-backend): datos de empresa para etiquetas

- [x] 1.1 Agregar `etiqueta_origen` String(100), `etiqueta_comuna` String(100) y `etiqueta_logo_url` String(255), nullable, a `ConfiguracionLanding` en `database/models.py` + migración Alembic sobre el head actual; verificar `alembic upgrade head`, `downgrade -1` y `upgrade head` en el contenedor `fme-backend`
- [x] 1.2 Agregar los 3 campos a los schemas de lectura y actualización en `schemas/configuracion_landing.py`; verificar con curl (PUT y luego GET de la configuración del tenant 1) que se guardan y devuelven
- [x] 1.3 En `schemas/etiquetas.py` y `routers/etiquetas.py` (GET etiqueta completa) devolver `empresa_origen`, `empresa_comuna` y `empresa_logo_url` (= `etiqueta_logo_url` o, si falta, `logo_url`); verificar con curl sobre un producto del tenant 1 y que otro tenant no ve esos valores

## 2. Backoffice: configuración del tenant

- [x] 2.1 Agregar los 3 campos a los tipos de `lib/api/configuracion-landing.ts` y `lib/api/etiquetas.ts`; verificar con `npx tsc --noEmit`
- [x] 2.2 En `app/admin/configuracion/landing/page.tsx`, junto a Razón Social y Resolución Sanitaria: inputs "Origen (etiqueta)" y "Comuna (pie de etiqueta)" y subida de "Logo para etiquetas (blanco y negro)" con ayuda; verificar guardando y recargando la página en local

## 3. Backoffice: formato 75 × 62 mm

- [x] 3.1 Agregar `'75x62'` a `TamanoEtiqueta` y su entrada en `CONFIGS_ETIQUETA` (ancho 75mm, alto 62mm, nombre "75 × 62 mm (Brother QL-820NWB, rollo 62 mm)"); verificar que aparece en el selector de la ficha y del modal de OP y que el valor por defecto de cada pantalla no cambió
- [x] 3.2 Cargar el logo como data URL (fetch → blob → data URL; rutas relativas contra la API) con fallback sin logo; verificar con un logo de otro origen que el PDF se genera sin error y con un logo inválido que se genera sin logo
- [x] 3.3 Implementar la tabla nutricional compacta del formato: columnas 100 g / porción, filas obligatorias siempre (con "—" si falta el valor), desglose de grasas + trans + colesterol cuando grasas por porción ≥ 3 g; verificar con un producto con 6,4 g y otro con < 3 g de grasa por porción, y con uno sin azúcares cargados — _verificado con datos reales ≥3 g (4,8 y 8,9 g) y sin azúcares; el caso <3 g no se probó (no hay producto así en local)_
- [x] 3.4 Implementar `Layout75x62` según `fme-backend/docs/etiquetado/etiqueta.jpeg`: marco, nombre + logo, contenido neto, ingredientes, preparación/conservación, alérgenos, dirección + origen, resolución sanitaria, Lote N° (código OP si viene), ELABORACIÓN / VENCIMIENTO en blanco, código de barras, sellos apilados, tabla, pie "Elaborado por … · Fono … · comuna" omitiendo rótulos sin dato; verificar visualmente en la preview contra el jpeg
- [x] 3.5 Aviso en la preview si el texto de la columna izquierda se desborda ("Texto demasiado largo para este formato"); verificar con un producto de ingredientes muy largos

## 4. Verificación integrada

- [x] 4.1 Generar el PDF 75 × 62 desde la ficha del producto y desde una OP finalizada; verificar que cada página mide 75 × 62 mm, que desde la OP salen elaboración y lote OP-<id> y que el vencimiento queda en blanco
- [ ] 4.2 Prueba de impresión del usuario en la QL-820NWB: comparar con la etiqueta de P-touch, ajustar fuentes y márgenes y comprobar que el código de barras se lee con lector
- [x] 4.3 `npx tsc --noEmit` sin errores nuevos en el backoffice

## 6. Diseño de la empresa también en 100 × 62 mm (DK-11202)

- [x] 6.1 Parametrizar el layout por ancho (75 / 100 mm) y usarlo en el formato `62x100`, eliminando la diagramación anterior; sellos en una fila en 100 mm; verificado con capturas de OP 33 (2 sellos) y OP 34 (4 sellos) sin desborde y 75 × 62 sin regresión
- [x] 6.2 `npx tsc --noEmit` sin errores en los archivos de etiquetas
- [x] 6.3 Ajustes tras la revisión del usuario (2026-11-19): 3–4 sellos siempre en grilla 2 × 2 (también en 100 mm, con tabla compacta); holgura para el desplazamiento de texto de html2canvas (la línea del encabezado tachaba el texto y Sodio tocaba el borde); aviso de desborde también en 100 × 62; verificado extrayendo la imagen de los PDF reales de OP 33 y OP 34 en ambos formatos, sin desborde
- [x] 6.4 Logo de etiqueta de Masas Estación en B/N generado desde el .lbx (`fme-backend/docs/etiquetado/logo-etiqueta-masas-estacion.png`) y cargado en el tenant 1 local

## 7. Tamaño legal y ubicación de los sellos (Manual MINSAL pág. 30)

- [x] 7.1 Lado del sello según el área de la etiqueta (`selloLegalMm`): 15 mm en 75 × 62 y 20 mm en 100 × 62; verificado midiendo los sellos en el DOM (15,0 / 20,0 mm)
- [x] 7.2 Sellos de a 2 por fila, pegados a la derecha (regla del usuario, como en etiqueta.jpeg); con 2 filas la tabla pasa a letra compacta; sin padding vertical por celda; verificado en el PDF real de OP 34 (4 sellos, 75 × 62) y OP 33 (2 sellos, ambos formatos), sin desborde
- [x] 7.3 Bloqueo de Descargar/Imprimir cuando los sellos no caben a tamaño legal (3–4 sellos en 100 × 62), con mensaje que indica usar 75 × 62; verificado con OP 34
- [x] 7.4 Sello "GRASAS SATURADAS": texto reacomodado para no montarse sobre "Ministerio de salud"
- [x] 7.5 Se descartó el formato 62 × 96 con sellos en fila horizontal (no aceptado por el usuario)

## 5. Capacitación

- [x] 5.1 Confirmar que sigue sin haber lecciones de etiquetado ni de configuración en `fme-backend/capacitacion/`; si se crearon entre tanto, actualizarlas con el formato nuevo y los campos de configuración

## Workflow follow-up

- Cargar en el tenant 1 (prod): origen "Producto Chileno", comuna "Santiago, Lampa" y el logo `fme-backend/docs/etiquetado/logo-etiqueta-masas-estacion.png` en "Logo para etiquetas", después del deploy.
- No hacer push ni archivar sin la prueba local y el OK del usuario.
