# Configuración de Impresora Térmica

## Impresora Detectada
**SPRT SP-POS892IIEd**
- Tipo: Impresora térmica POS
- Protocolo: ESC/POS
- Conexiones: USB, Ethernet

## Configuración para Android

### Opción 1: USB (Recomendado para tablet/móvil)
1. Conectar impresora vía cable USB OTG
2. La app detectará automáticamente la impresora
3. Aceptar permisos USB cuando se solicite

### Opción 2: Ethernet/WiFi
1. Conectar impresora a la red local
2. Obtener dirección IP de la impresora (ver manual o imprimir configuración)
3. Configurar en la app:
   - IP: `192.168.x.x` (ejemplo)
   - Puerto: `9100` (estándar)

## Configuración en el Código

Para configurar la impresora al iniciar la app, editar `app/admin/pedidos/pos/page.tsx`:

```typescript
// Configuración USB (automática)
await PrinterService.initialize({
  type: 'usb'
});

// O configuración Ethernet
await PrinterService.initialize({
  type: 'ethernet',
  ipAddress: '192.168.1.100',  // IP de tu impresora
  port: 9100
});
```

## Prueba de Impresión

Una vez configurada, puedes probar la impresión con:

```typescript
await PrinterService.printTest();
```

Esto imprimirá una boleta de prueba.
