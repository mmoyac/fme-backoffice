# Design

## Context

- `components/etiquetas/EtiquetaNutricional.tsx` es el componente único de etiqueta (ficha del producto y OP). Tiene un tipo `TamanoEtiqueta` (`'62x100' | '62x29' | '29x90' | 'A4'`), un mapa `CONFIGS_ETIQUETA` con ancho/alto/fuentes/código de barras, y un sub-layout por formato.
- `lib/etiquetas/pdf.ts` rasteriza cada etiqueta con html2canvas (`scale: 3`, `useCORS`, `allowTaint`) y arma un PDF con páginas del ancho y alto del formato. Agregar una entrada a `CONFIGS_ETIQUETA` basta para el tamaño de página.
- La tabla nutricional de los formatos actuales usa `components/NutritionalLabel.tsx`, que **omite las filas sin valor** (`filter(f => f.val != null)`), y eso choca con la regla de filas obligatorias (ver specs).
- Los datos de empresa vienen de `configuracion_landing` en `GET /api/etiquetas/producto/{id}/completa` (`routers/etiquetas.py`): razón social, dirección, resolución sanitaria (ya incluye la fecha, ej. "RS N° 2213361705 02/08/2022"), email y teléfono. `logo_url` existe pero no se expone; en el tenant 1 vale `/logo.png`, una ruta **relativa al sitio landing** que no resuelve desde el backoffice.
- Referencia del diseño: `.lbx` de P-touch, papel de 212,6 × 175,7 pt (75 × 62 mm) horizontal, márgenes de ~1,5 mm y ~3 mm; Brother QL-820NWB.

## Goals / Non-Goals

**Goals:**
- Reproducir el diseño de referencia en 75 × 62 mm con calidad de impresión térmica (B/N, texto nítido).
- Cumplir las filas obligatorias de la tabla nutricional solo en el formato nuevo.

**Non-Goals:**
- Cambiar los formatos existentes ni su tabla nutricional (siguen omitiendo filas vacías).
- Calcular el vencimiento o crear lotes reales.
- Imprimir directo a la impresora (sigue siendo PDF + diálogo del navegador).
- Editar textos de la etiqueta caso a caso.

## Decisions

1. **Layout propio `Layout75x62` dentro de `EtiquetaNutricional`**, no una variante de `Layout62x100`. La disposición (nombre + logo arriba, sellos arriba a la derecha, tabla abajo a la derecha, pie a todo el ancho) es distinta a la del 62×100 y forzarla con condicionales haría ilegible ese layout. Alternativa descartada: reescalar el 62×100.
2. **Tabla nutricional compacta propia del formato** (`TablaNutricional75x62` en el mismo archivo o en `components/etiquetas/`), no `NutritionalLabel`. Así se aplican las filas obligatorias con "—" y la regla de ≥ 3 g de grasa por porción sin cambiar la tabla de los otros formatos. Los valores por porción se calculan igual que hoy (valor por 100 g × `porcion_peso_g` / 100), con el mismo formato numérico es-CL (coma decimal).
3. **Medidas en mm y fuentes en px fijos** en la entrada `'75x62'` de `CONFIGS_ETIQUETA`, como los demás formatos. Punto de partida: título ~13 px, normal ~6,5 px, small ~5,5 px; se ajustan comparando con `etiqueta.jpeg` impresa.
4. **Datos nuevos en `configuracion_landing`** (`etiqueta_origen` String(100), `etiqueta_comuna` String(100), `etiqueta_logo_url` String(255), todos nullable) y no en `tenants`: ahí ya viven razón social, resolución sanitaria y teléfono, que la etiqueta ya usa, y ya existe su mantenedor. El GET de etiqueta completa agrega `empresa_origen`, `empresa_comuna` y `empresa_logo_url` (= `etiqueta_logo_url` o, si falta, `logo_url`).
5. **El logo se convierte a data URL antes de rasterizar.** html2canvas con `allowTaint` deja el canvas "tainted" si la imagen es de otro origen sin CORS, y `toDataURL` falla. El frontend hace `fetch` del logo (URL absoluta; las relativas se resuelven contra la API), lo pasa a data URL y se lo entrega al layout; si falla, la etiqueta se genera sin logo y sin error. Alternativa descartada: depender de los headers CORS del servidor donde viva el logo.
6. **Selector de formato:** se agrega `'75x62'` a `CONFIGS_ETIQUETA`; los selectores que iteran ese mapa (ficha y modal de OP) lo muestran sin más cambios. El valor por defecto de cada pantalla no cambia.

## Risks / Trade-offs

- [El texto largo de ingredientes o preparación no cabe en 75 × 62 mm] → la columna izquierda recorta con `overflow: hidden` y la preview muestra un aviso "Texto demasiado largo para este formato" para que el usuario lo acorte en la ficha.
- [Logo a color o con fondo se imprime gris o empastado en térmica] → campo `etiqueta_logo_url` para subir una versión B/N; el mantenedor lo indica en su ayuda.
- [`logo_url` relativo o en otro dominio] → decisión 5; sin logo, la etiqueta sigue siendo válida.
- [La resolución sanitaria del tenant 1 trae fecha en el mismo texto] → se imprime tal cual; no se separa en dos campos para no obligar a recargar el dato.
- [Rasterizar a `scale: 3` deja el código de barras un poco borroso a 300 dpi] → se verifica que se lea con lector antes de cerrar; si no, se sube la escala solo para este formato.

## Migration Plan

1. Backend: migración Alembic que agrega las 3 columnas nullable (sin backfill). Se aplica sola en el deploy (entrypoint). Rollback: `downgrade` elimina las columnas; el frontend tolera que falten.
2. Backoffice: se despliega después del backend (el frontend trata los campos nuevos como opcionales).
3. Datos: cargar en Configuración → Landing del tenant 1 origen "Producto Chileno", comuna "Santiago, Lampa" y el logo B/N.

## Open Questions

- Medidas finas de fuentes y márgenes: se ajustan imprimiendo una etiqueta de prueba en la QL-820NWB y comparándola con la de P-touch.
