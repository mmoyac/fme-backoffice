Las instrucciones están en Agent.md

## Reglas de eficiencia (minimizar tokens)

- Antes de leer un archivo, usar Grep para ubicar exactamente las líneas relevantes.
- Leer archivos siempre con offset/limit. Nunca leer un archivo completo si supera 150 líneas.
- Para buscar dónde está algo, usar Grep o Glob en lugar de leer directorios completos.
- No leer un archivo solo para confirmar algo que ya está en el contexto de la conversación.
- Hacer múltiples búsquedas en paralelo cuando no hay dependencias entre ellas.

## Regla: el Centro de Capacitación sigue al módulo

- El contenido de capacitación vive en `fme-backend/capacitacion/<modulo>/` (manifest.json + lecciones HTML).
- **Todo cambio que modifique el comportamiento, los flujos o las pantallas de un módulo (ej. inventario) DEBE actualizar en el mismo change/PR las lecciones de ese módulo**: editar las afectadas, crear las nuevas, quitar las obsoletas y actualizar la fecha de última revisión.
- Si el módulo todavía no tiene lecciones, dejarlo anotado en el change como pendiente.
- Un change de OpenSpec que toca un módulo con lecciones no está terminado sin su grupo de tareas "Actualizar capacitación".

## Regla: pantallas distintas en escritorio y móvil

- Listas con `components/ui/DataList.tsx` (tabla desde `lg`/1024 px, tarjetas debajo) y encabezados con `components/ui/PageHeader.tsx`. Nunca alternar tabla/tarjetas con `md:` (ver `AGENTS.md` §7.3).
- Toda pantalla nueva se agrega a `e2e/ancho.spec.ts`; no puede haber scroll horizontal de página en 320–1280 px (`AGENTS.md` §8.1).
- Productos, inventario, locales y categorías se leen con los hooks SWR de `lib/hooks/catalogos.ts`; navegación interna siempre con `<Link>`/`router.push`. Contexto: `docs/RESPONSIVE_Y_RENDIMIENTO.md`.
