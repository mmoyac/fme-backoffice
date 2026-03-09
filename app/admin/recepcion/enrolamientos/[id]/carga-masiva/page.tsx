'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getEnrolamientoById,
  getUbicaciones,
  getProductosCarnes,
  createLotesBulk,
  type EnrolamientoResponse,
  type Ubicacion,
  type LoteBulkItem,
  type LoteBulkResultItem,
} from '@/lib/api/recepcion';

interface FilaPreview {
  id: string;
  sku_producto: string;
  qr_original: string;
  peso_neto_kg: string;
  peso_bruto_kg: string;
  fecha_vencimiento: string;
  lote_proveedor: string;
  fecha_fabricacion: string;
  // validación
  errorSku?: string;
  errorQr?: string;
  errorPesoNeto?: string;
  errorPesoBruto?: string;
  errorFecha?: string;
}

interface ProductoSimple {
  id: number;
  nombre: string;
  sku: string;
}

export default function CargaMasivaPage() {
  const params = useParams();
  const router = useRouter();
  const enrolamientoId = Number(params.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [enrolamiento, setEnrolamiento] = useState<EnrolamientoResponse | null>(null);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [productos, setProductos] = useState<ProductoSimple[]>([]);
  const [loading, setLoading] = useState(true);

  const [ubicacionId, setUbicacionId] = useState<number>(0);
  const [filas, setFilas] = useState<FilaPreview[]>([]);
  const [saving, setSaving] = useState(false);
  const [resultado, setResultado] = useState<LoteBulkResultItem[] | null>(null);
  const [resumen, setResumen] = useState<{ total: number; creados: number; errores: number } | null>(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [enr, ubics, prods] = await Promise.all([
          getEnrolamientoById(enrolamientoId),
          getUbicaciones(),
          getProductosCarnes().catch(() => []),
        ]);
        setEnrolamiento(enr);
        setUbicaciones(ubics.filter((u: Ubicacion) => u.activo !== false));
        setProductos(prods);
      } catch (e) {
        alert('Error al cargar datos: ' + (e instanceof Error ? e.message : 'Error'));
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [enrolamientoId]);

  // ── Descargar template CSV ──────────────────────────────────
  const descargarTemplate = () => {
    const header = 'sku_producto,qr_original,peso_neto_kg,peso_bruto_kg,fecha_vencimiento,lote_proveedor,fecha_fabricacion';
    const ejemploSku = productos.length > 0 ? productos[0].sku : 'LOMO-001';
    const comentario = `# EJEMPLO (NO CARGAR): ${ejemploSku},7891234560001,23.80,25.50,31/12/2026,LP-001-2026,01/01/2026`;
    const csv = [header, comentario].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template_carga_cajas_enrolamiento_${enrolamientoId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── Parsear CSV ─────────────────────────────────────────────
  const parsearCSV = (texto: string): FilaPreview[] => {
    const lineas = texto.trim().split('\n').filter(l => l.trim());
    if (lineas.length < 2) return [];

    // Detectar encabezado y filtrar comentarios (#)
    const primeraLinea = lineas[0].toLowerCase().replace(/\r/g, '');
    const esEncabezado = primeraLinea.includes('sku') || primeraLinea.includes('peso');
    const datosLineas = (esEncabezado ? lineas.slice(1) : lineas)
      .filter(l => !l.trim().startsWith('#'));

    return datosLineas.map((linea, i) => {
      const cols = linea.replace(/\r/g, '').split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      return {
        id: `fila_${i}_${Date.now()}`,
        sku_producto: cols[0] || '',
        qr_original: cols[1] || '',
        peso_neto_kg: cols[2] || '',
        peso_bruto_kg: cols[3] || '',
        fecha_vencimiento: cols[4] || '',
        lote_proveedor: cols[5] || '',
        fecha_fabricacion: cols[6] || '',
      };
    });
  };

  const validarFila = (fila: FilaPreview, skusValidos: Set<string>): FilaPreview => {
    const errorSku = fila.sku_producto.trim() === ''
      ? 'SKU requerido'
      : (skusValidos.size > 0 && !skusValidos.has(fila.sku_producto.trim()))
        ? `SKU '${fila.sku_producto}' no existe`
        : undefined;

    const errorQr = fila.qr_original.trim() === '' ? 'Cód. barras requerido' : undefined;

    const pesoNetoNum = parseFloat(fila.peso_neto_kg.replace(',', '.'));
    const errorPesoNeto = fila.peso_neto_kg.trim() === ''
      ? 'Peso neto requerido'
      : isNaN(pesoNetoNum) || pesoNetoNum <= 0
        ? 'Peso neto inválido'
        : undefined;

    const pesoBrutoNum = parseFloat(fila.peso_bruto_kg.replace(',', '.'));
    const errorPesoBruto = fila.peso_bruto_kg.trim() === ''
      ? 'Peso bruto requerido'
      : isNaN(pesoBrutoNum) || pesoBrutoNum <= 0
        ? 'Peso bruto inválido'
        : (!isNaN(pesoNetoNum) && pesoBrutoNum < pesoNetoNum)
          ? 'Bruto < Neto'
          : undefined;

    const fechaRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    const errorFecha = fila.fecha_vencimiento.trim() === ''
      ? 'Fecha requerida'
      : !fechaRegex.test(fila.fecha_vencimiento.trim())
        ? 'Formato: DD/MM/AAAA'
        : undefined;

    return { ...fila, errorSku, errorQr, errorPesoNeto, errorPesoBruto, errorFecha };
  };

  const cargarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const texto = ev.target?.result as string;
      const filasRaw = parsearCSV(texto);
      const skusValidos = new Set(productos.map(p => p.sku));
      setFilas(filasRaw.map(f => validarFila(f, skusValidos)));
      setResultado(null);
      setResumen(null);
    };
    reader.readAsText(archivo, 'UTF-8');
    // Reset input to allow re-upload same file
    e.target.value = '';
  };

  const actualizarFila = (id: string, campo: keyof FilaPreview, valor: string) => {
    const skusValidos = new Set(productos.map(p => p.sku));
    setFilas(prev =>
      prev.map(f => {
        if (f.id !== id) return f;
        const actualizada = { ...f, [campo]: valor };
        return validarFila(actualizada, skusValidos);
      })
    );
  };

  const eliminarFila = (id: string) => {
    setFilas(prev => prev.filter(f => f.id !== id));
  };

  const agregarFila = () => {
    setFilas(prev => [
      ...prev,
      { id: `fila_manual_${Date.now()}`, sku_producto: '', qr_original: '', peso_neto_kg: '', peso_bruto_kg: '', fecha_vencimiento: '', lote_proveedor: '', fecha_fabricacion: '' }
    ]);
  };

  const hayErrores = filas.some(f => f.errorSku || f.errorQr || f.errorPesoNeto || f.errorPesoBruto || f.errorFecha);
  const cantErrores = filas.filter(f => f.errorSku || f.errorQr || f.errorPesoNeto || f.errorPesoBruto || f.errorFecha).length;
  const filasValidas = filas.filter(f => !f.errorSku && !f.errorQr && !f.errorPesoNeto && !f.errorPesoBruto && !f.errorFecha && f.sku_producto.trim());
  const totalNetoValidos = filasValidas.reduce((sum, f) => sum + parseFloat(f.peso_neto_kg.replace(',', '.') || '0'), 0);
  const totalBrutoValidos = filasValidas.reduce((sum, f) => sum + parseFloat(f.peso_bruto_kg.replace(',', '.') || '0'), 0);

  // ── Confirmar carga ─────────────────────────────────────────
  const confirmarCarga = async () => {
    if (hayErrores) { alert(`Corrija los ${cantErrores} error(es) en la tabla antes de continuar`); return; }
    if (ubicacionId === 0) { alert('Seleccione una ubicación de bodega'); return; }
    if (filasValidas.length === 0) { alert('No hay filas para cargar'); return; }
    if (!confirm(`¿Confirmar carga de ${filasValidas.length} caja(s)?`)) return;

    setSaving(true);
    try {
      const lotes: LoteBulkItem[] = filasValidas.map(f => ({
        sku_producto: f.sku_producto.trim(),
        qr_original: f.qr_original.trim(),
        peso_neto_kg: parseFloat(f.peso_neto_kg.replace(',', '.')),
        peso_bruto_kg: parseFloat(f.peso_bruto_kg.replace(',', '.')),
        fecha_vencimiento: f.fecha_vencimiento.trim(),
        lote_proveedor: f.lote_proveedor.trim() || undefined,
        fecha_fabricacion: f.fecha_fabricacion.trim() || undefined,
      }));

      const resp = await createLotesBulk(enrolamientoId, ubicacionId, lotes);
      setResultado(resp.resultados);
      setResumen({ total: resp.total, creados: resp.creados, errores: resp.errores });

      if (resp.errores === 0) {
        // Todo OK → limpiar filas
        setFilas([]);
      }
    } catch (e) {
      alert('Error al cargar: ' + (e instanceof Error ? e.message : 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const esFinalizado = enrolamiento?.estado?.codigo === 'FINALIZADO';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (esFinalizado) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white">📦 Carga Masiva de Cajas</h1>
            <p className="text-gray-400 mt-1">
              Enrolamiento #{enrolamientoId}
              {enrolamiento && ` · ${enrolamiento.proveedor?.nombre || ''} · ${enrolamiento.patente || ''}`}
            </p>
          </div>
          <Link
            href={`/admin/recepcion/enrolamientos/${enrolamientoId}`}
            className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-slate-700 transition-colors"
          >
            ← Volver al Enrolamiento
          </Link>
        </div>
        <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-8 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Enrolamiento Finalizado</h2>
          <p className="text-gray-400">No se pueden agregar cajas a un enrolamiento en estado <strong className="text-white">FINALIZADO</strong>.</p>
          <p className="text-gray-500 text-sm mt-2">Si necesita agregar más cajas, cambie el estado del enrolamiento primero.</p>
          <Link
            href={`/admin/recepcion/enrolamientos/${enrolamientoId}`}
            className="inline-block mt-6 bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            ← Volver al Enrolamiento
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">📦 Carga Masiva de Cajas</h1>
          <p className="text-gray-400 mt-1">
            Enrolamiento #{enrolamientoId}
            {enrolamiento && ` · ${enrolamiento.proveedor?.nombre || ''} · ${enrolamiento.patente || ''}`}
          </p>
        </div>
        <Link
          href={`/admin/recepcion/enrolamientos/${enrolamientoId}`}
          className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-slate-700 transition-colors"
        >
          ← Volver al Enrolamiento
        </Link>
      </div>

      {/* Paso 1: Descargar template */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-3">1. Descargue el template</h2>
        <p className="text-gray-400 text-sm mb-4">
          Use este archivo CSV para ingresar los datos de cada caja. Las columnas obligatorias son
          <strong className="text-white"> sku_producto</strong>,
          <strong className="text-white"> qr_original</strong> (código de barras de la etiqueta del frigorífico),
          <strong className="text-white"> peso_neto_kg</strong> (el que se vende),
          <strong className="text-white"> peso_bruto_kg</strong> (para carga de camión) y
          <strong className="text-white"> fecha_vencimiento</strong> (DD/MM/AAAA).
          Las demás son opcionales.
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={descargarTemplate}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-medium transition-colors"
          >
            ⬇ Descargar Template CSV
          </button>
          <span className="text-gray-500 text-sm">
            Columnas: <code className="text-primary text-xs">sku_producto, qr_original, peso_neto_kg, peso_bruto_kg, fecha_vencimiento, lote_proveedor, fecha_fabricacion</code>
          </span>
        </div>

        {/* SKUs disponibles */}
        {productos.length > 0 && (
          <div className="mt-4 bg-slate-700 rounded p-3">
            <p className="text-xs text-gray-400 mb-2 font-medium">SKUs disponibles en el sistema:</p>
            <div className="flex flex-wrap gap-2">
              {productos.map(p => (
                <span key={p.id} className="bg-slate-600 text-primary text-xs px-2 py-1 rounded font-mono">
                  {p.sku} <span className="text-gray-400">— {p.nombre}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Paso 2: Subir archivo */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-3">2. Suba el archivo completado</h2>
        <div
          className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-4xl mb-3">📄</div>
          <p className="text-white font-medium">Haga clic para seleccionar el archivo CSV</p>
          <p className="text-gray-400 text-sm mt-1">Solo archivos .csv</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={cargarArchivo}
          className="hidden"
        />
      </div>

      {/* Paso 3: Ubicación + Vista previa */}
      {filas.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">3. Revisión y ubicación en bodega</h2>

          {/* Ubicación */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ubicación en bodega para todas las cajas *
            </label>
            <select
              value={ubicacionId}
              onChange={e => setUbicacionId(Number(e.target.value))}
              className="w-full max-w-sm bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
            >
              <option value={0}>Seleccionar ubicación...</option>
              {ubicaciones.map(u => (
                <option key={u.id} value={u.id}>{u.codigo} — {u.nombre}</option>
              ))}
            </select>
          </div>

          {/* Resumen */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-sm items-center">
            <span className="text-white">{filas.length} filas cargadas</span>
            <span className="text-emerald-400">{filasValidas.length} válidas</span>
            {hayErrores && (
              <span className="text-red-400">{cantErrores} con errores</span>
            )}
            <span className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-white font-semibold">
              ⚖ Neto: {totalNetoValidos.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
            </span>
            <span className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-cyan-300 font-semibold">
              🚚 Bruto: {totalBrutoValidos.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
            </span>
          </div>

          {/* Tabla de preview */}
          <div className="overflow-x-auto rounded-lg border border-slate-600">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-300 w-8">#</th>
                  <th className="px-3 py-2 text-left text-gray-300">SKU Producto *</th>
                  <th className="px-3 py-2 text-left text-gray-300">Cód. Barras Original *</th>
                  <th className="px-3 py-2 text-left text-gray-300">Peso Neto (kg) * —️Ventas</th>
                  <th className="px-3 py-2 text-left text-gray-300">Peso Bruto (kg) * —️Camión</th>
                  <th className="px-3 py-2 text-left text-gray-300">Vencimiento * (DD/MM/AAAA)</th>
                  <th className="px-3 py-2 text-left text-gray-300">Lote Proveedor</th>
                  <th className="px-3 py-2 text-left text-gray-300">Fabricación (DD/MM/AAAA)</th>
                  <th className="px-3 py-2 text-center text-gray-300">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filas.map((fila, idx) => {
                  const tieneError = fila.errorSku || fila.errorQr || fila.errorPesoNeto || fila.errorPesoBruto || fila.errorFecha;
                  return (
                    <tr key={fila.id} className={tieneError ? 'bg-red-900/10' : 'bg-slate-800'}>
                      <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          value={fila.sku_producto}
                          onChange={e => actualizarFila(fila.id, 'sku_producto', e.target.value)}
                          className={`w-full bg-slate-700 border rounded px-2 py-1 text-white text-sm focus:ring-1 focus:ring-primary ${fila.errorSku ? 'border-red-500' : 'border-slate-600'}`}
                        />
                        {fila.errorSku && <p className="text-red-400 text-xs mt-0.5">{fila.errorSku}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={fila.qr_original}
                          onChange={e => actualizarFila(fila.id, 'qr_original', e.target.value)}
                          placeholder="Cód. barras"
                          className={`w-36 bg-slate-700 border rounded px-2 py-1 text-white text-sm font-mono focus:ring-1 focus:ring-primary ${fila.errorQr ? 'border-red-500' : 'border-slate-600'}`}
                        />
                        {fila.errorQr && <p className="text-red-400 text-xs mt-0.5">{fila.errorQr}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={fila.peso_neto_kg}
                          onChange={e => actualizarFila(fila.id, 'peso_neto_kg', e.target.value)}
                          placeholder="neto"
                          className={`w-24 bg-slate-700 border rounded px-2 py-1 text-white text-sm focus:ring-1 focus:ring-primary ${fila.errorPesoNeto ? 'border-red-500' : 'border-slate-600'}`}
                        />
                        {fila.errorPesoNeto && <p className="text-red-400 text-xs mt-0.5">{fila.errorPesoNeto}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={fila.peso_bruto_kg}
                          onChange={e => actualizarFila(fila.id, 'peso_bruto_kg', e.target.value)}
                          placeholder="bruto"
                          className={`w-24 bg-slate-700 border rounded px-2 py-1 text-white text-sm focus:ring-1 focus:ring-primary ${fila.errorPesoBruto ? 'border-red-500' : 'border-slate-600'}`}
                        />
                        {fila.errorPesoBruto && <p className="text-red-400 text-xs mt-0.5">{fila.errorPesoBruto}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={fila.fecha_vencimiento}
                          onChange={e => actualizarFila(fila.id, 'fecha_vencimiento', e.target.value)}
                          placeholder="DD/MM/AAAA"
                          className={`w-32 bg-slate-700 border rounded px-2 py-1 text-white text-sm focus:ring-1 focus:ring-primary ${fila.errorFecha ? 'border-red-500' : 'border-slate-600'}`}
                        />
                        {fila.errorFecha && <p className="text-red-400 text-xs mt-0.5">{fila.errorFecha}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={fila.lote_proveedor}
                          onChange={e => actualizarFila(fila.id, 'lote_proveedor', e.target.value)}
                          className="w-28 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:ring-1 focus:ring-primary"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={fila.fecha_fabricacion}
                          onChange={e => actualizarFila(fila.id, 'fecha_fabricacion', e.target.value)}
                          placeholder="DD/MM/AAAA"
                          className="w-32 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:ring-1 focus:ring-primary"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => eliminarFila(fila.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Eliminar fila"
                        >🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <button
              onClick={agregarFila}
              className="text-primary hover:text-primary/80 text-sm transition-colors"
            >
              + Agregar fila manual
            </button>
            <div className="flex flex-col items-end gap-1">
              {hayErrores && (
                <p className="text-red-400 text-xs font-medium">⛔ Corrija los {cantErrores} error(es) antes de continuar</p>
              )}
              {!hayErrores && ubicacionId === 0 && (
                <p className="text-yellow-400 text-xs">⚠ Seleccione una ubicación de bodega para continuar</p>
              )}
              {!hayErrores && filas.length === 0 && (
                <p className="text-gray-500 text-xs">Suba un archivo CSV para habilitar la carga</p>
              )}
              <button
                onClick={confirmarCarga}
                disabled={saving || hayErrores || filasValidas.length === 0 || ubicacionId === 0}
                className="bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold px-8 py-3 rounded-lg transition-colors"
              >
                {saving ? 'Cargando...' : hayErrores ? `⛔ ${cantErrores} error(es) sin resolver` : `✅ Confirmar ${filasValidas.length} caja(s) · ${totalNetoValidos.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg neto`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultado */}
      {resumen && resultado && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Resultado de la carga</h2>
          <div className="flex gap-6 mb-5">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{resumen.total}</div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">{resumen.creados}</div>
              <div className="text-xs text-gray-400">Creadas</div>
            </div>
            {resumen.errores > 0 && (
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400">{resumen.errores}</div>
                <div className="text-xs text-gray-400">Errores</div>
              </div>
            )}
          </div>

          {resumen.errores === 0 ? (
            <div className="flex gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded px-4 py-3 text-sm flex-1">
                ✅ Todas las cajas fueron registradas exitosamente.
              </div>
              <Link
                href={`/admin/recepcion/enrolamientos/${enrolamientoId}`}
                className="bg-primary hover:bg-primary/80 text-slate-900 font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                Ver Enrolamiento
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-600">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-300">Fila</th>
                    <th className="px-3 py-2 text-left text-gray-300">SKU</th>
                    <th className="px-3 py-2 text-left text-gray-300">Estado</th>
                    <th className="px-3 py-2 text-left text-gray-300">Código / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-800">
                  {resultado.map(r => (
                    <tr key={r.fila} className={r.ok ? '' : 'bg-red-900/10'}>
                      <td className="px-3 py-2 text-gray-400">{r.fila}</td>
                      <td className="px-3 py-2 text-white font-mono">{r.sku_producto}</td>
                      <td className="px-3 py-2">
                        {r.ok
                          ? <span className="text-emerald-400">✅ OK</span>
                          : <span className="text-red-400">❌ Error</span>
                        }
                      </td>
                      <td className="px-3 py-2">
                        {r.ok
                          ? <span className="text-gray-300 font-mono text-xs">{r.codigo_lote}</span>
                          : <span className="text-red-300 text-xs">{r.error}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
