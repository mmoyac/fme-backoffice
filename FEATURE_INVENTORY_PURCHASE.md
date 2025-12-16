# Documentación: Sistema de Inventario y Compras (v1.0)

## 1. Visión General
Esta implementación (Diciembre 2025) introduce un control de inventario transaccional y un flujo de compras con estados para evitar modificaciones accidentales de stock.

## 2. Inventario
El inventario ya no es editable directamente en la grilla principal. Se controla mediante movimientos explícitos.

### Estructura UI (`/admin/inventario`)
Se unificaron las funcionalidades en una sola página con pestañas:
*   **Existencias**: Vista de solo lectura. Muestra el stock por local y resalta alertas (Amarillo < Stock Mínimo, Rojo < Stock Crítico).
*   **Transferencias**: Formulario para mover mercancía entre bodegas/locales. Valida stock origen.
*   **Historial**: Bitácora completa de movimientos.

### Cálculo de Stock
*   **Stock Físico**: Almacenado en tabla `inventario` (producto_id, local_id).
*   **Stock Web/Global**: Calculado dinámicamente sumando stocks físicos (no se almacena, es virtual).

## 3. Compras
Se ha cambiado el flujo de "registro directo" a "orden de compra".

### Estados de Compra
1.  **PENDIENTE** (Default al crear):
    *   La compra se guarda pero **NO afecta el inventario**.
    *   Es totalmente editable y eliminable.
    *   Botones disponibles: `Editar`, `Eliminar`, `Recibir`.
    *   Color en tabla: Amarillo/Naranja.

2.  **RECIBIDA**:
    *   Se activa manualente con el botón `Recibir` (POST `/api/compras/{id}/recibir`).
    *   **Impacto**: Suma cantidades al inventario del local destino y actualiza el `precio_compra` del producto.
    *   Es inmutable (no se puede editar ni borrar).
    *   Color en tabla: Verde.

### Endpoints Clave
*   `GET /api/compras/`: Lista inversa por ID (nuevas primero).
*   `POST /api/compras/`: Crea en estado PENDIENTE. Payload acepta formato `date` (YYYY-MM-DD).
*   `PUT /api/compras/{id}`: Actualiza cabecera y reemplaza detalles. Solo si PENDIENTE.
*   `DELETE /api/compras/{id}`: Elimina compra. Solo si PENDIENTE.
*   `POST /api/compras/{id}/recibir`: Transiciona a RECIBIDA y ejecuta movimiento de stock.

## 4. Tipos de Datos (Cambios Recientes)
*   **Tipo Documento**: Ahora es una entidad en base de datos (`tipos_documento_tributario`), referenciada por ID en compras.
*   **Fechas**: Se permite formato `YYYY-MM-DD` simple desde frontend para `fecha_compra`.

## 5. Instrucciones para Desarrollo Futuro
*   Si se agrega un nuevo movimiento de inventario (ej. "Mermas"), usar el servicio `movimientos` para mantener el historial.
*   Para reabrir una compra recibida, se necesitaría implementar lógica de reversión de stock (restar). Actualmente no implementado por seguridad.
