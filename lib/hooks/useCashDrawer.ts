'use client'

// Comando ESC/POS estándar para abrir gaveta (pin 2 y pin 5)
const DRAWER_COMMAND = new Uint8Array([0x10, 0x14, 0x01, 0x00, 0x05])

let cachedPort: SerialPort | null = null

export function useCashDrawer() {
  const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator

  // Verificación silenciosa — solo mira puertos ya autorizados, sin diálogo
  const checkDrawer = async (): Promise<boolean> => {
    if (!isSupported) return false
    try {
      const ports = await navigator.serial.getPorts()
      cachedPort = ports[0] ?? null
      return !!cachedPort
    } catch {
      return false
    }
  }

  // Configuración explícita — abre el selector de puertos
  const configureDrawer = async (): Promise<boolean> => {
    if (!isSupported) return false
    try {
      cachedPort = await navigator.serial.requestPort()
      return true
    } catch {
      return false
    }
  }

  const openDrawer = async (): Promise<void> => {
    if (!isSupported || !cachedPort) return

    try {
      if (cachedPort.readable) {
        const writer = cachedPort.writable?.getWriter()
        if (writer) {
          await writer.write(DRAWER_COMMAND)
          writer.releaseLock()
        }
        return
      }

      await cachedPort.open({ baudRate: 9600 })
      const writer = cachedPort.writable!.getWriter()
      await writer.write(DRAWER_COMMAND)
      writer.releaseLock()
      await cachedPort.close()
    } catch (err) {
      console.warn('No se pudo abrir la gaveta:', err)
      cachedPort = null
    }
  }

  return { checkDrawer, configureDrawer, openDrawer, isSupported }
}
