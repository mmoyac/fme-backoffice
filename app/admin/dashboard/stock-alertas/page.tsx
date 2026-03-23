'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getInventarios, Inventario } from '@/lib/api/inventario';
import { getProductos, Producto } from '@/lib/api/productos';
import { getLocales, Local } from '@/lib/api/locales';

type NivelAlerta = 'critico' | 'minimo' | 'ok';

interface AlertaStock {
  producto: Producto;
  local: Local;
  stockActual: number;
  nivel: NivelAlerta;
  faltaParaMinimo: number;
}

export default function StockAlertasPage() {
  const router = useRouter();
  const [alertas, setAlertas] = useState<AlertaStock[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroLocal, setFiltroLocal] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('alerta');
  const [pdfModalUrl, setPdfModalUrl] = useState<string | null>(null);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const [inventarios, productos, localesData] = await Promise.all([
        getInventarios(),
        getProductos(),
        getLocales(),
      ]);

      const productosMap: Record<number, Producto> = {};
      productos.forEach((p) => { productosMap[p.id] = p; });

      const localesMap: Record<number, Local> = {};
      localesData.forEach((l) => { localesMap[l.id] = l; });

      const resultado: AlertaStock[] = [];
      for (const inv of inventarios) {
        const prod = productosMap[inv.producto_id];
        const local = localesMap[inv.local_id];
        if (!prod || !local) continue;
        if (!prod.activo) continue;
        // Solo considerar productos con umbrales configurados
        if (prod.stock_minimo === 0 && prod.stock_critico === 0) continue;

        let nivel: NivelAlerta;
        if (inv.cantidad_stock <= prod.stock_critico) {
          nivel = 'critico';
        } else if (inv.cantidad_stock <= prod.stock_minimo) {
          nivel = 'minimo';
        } else {
          nivel = 'ok';
        }

        resultado.push({
          producto: prod,
          local,
          stockActual: inv.cantidad_stock,
          nivel,
          faltaParaMinimo: Math.max(0, prod.stock_minimo - inv.cantidad_stock),
        });
      }

      // Ordenar: críticos primero, luego mínimos, luego ok; dentro de cada nivel por falta desc
      resultado.sort((a, b) => {
        const order: Record<NivelAlerta, number> = { critico: 0, minimo: 1, ok: 2 };
        if (order[a.nivel] !== order[b.nivel]) return order[a.nivel] - order[b.nivel];
        return b.faltaParaMinimo - a.faltaParaMinimo;
      });

      setAlertas(resultado);
      setLocales(localesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // KPIs
  const criticos = alertas.filter((a) => a.nivel === 'critico');
  const minimos = alertas.filter((a) => a.nivel === 'minimo');
  const okCount = alertas.filter((a) => a.nivel === 'ok').length;

  // Filtrar
  let filtradas = alertas;
  if (filtroNivel === 'alerta') filtradas = filtradas.filter((a) => a.nivel !== 'ok');
  else if (filtroNivel === 'critico') filtradas = filtradas.filter((a) => a.nivel === 'critico');
  else if (filtroNivel === 'minimo') filtradas = filtradas.filter((a) => a.nivel === 'minimo');
  if (filtroLocal) filtradas = filtradas.filter((a) => a.local.id === Number(filtroLocal));

  const getBadge = (nivel: NivelAlerta) => {
    switch (nivel) {
      case 'critico': return { cls: 'bg-red-900 text-red-300 border border-red-700', label: 'Critico' };
      case 'minimo': return { cls: 'bg-yellow-900 text-yellow-300 border border-yellow-700', label: 'Minimo' };
      case 'ok': return { cls: 'bg-green-900 text-green-300 border border-green-700', label: 'OK' };
    }
  };

  const exportarPDF = () => {
    const paraComprar = alertas.filter((a) => a.nivel !== 'ok');
    const lista = filtroLocal
      ? paraComprar.filter((a) => a.local.id === Number(filtroLocal))
      : paraComprar;

    const fecha = new Date().toLocaleDateString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const localNombre = filtroLocal
      ? locales.find((l) => l.id === Number(filtroLocal))?.nombre || 'Todos'
      : 'Todos los locales';

    const rows = lista
      .map(
        (a) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 10px;">${a.producto.nombre}</td>
        <td style="padding:8px 10px;font-family:monospace;">${a.producto.sku}</td>
        <td style="padding:8px 10px;">${a.local.nombre}</td>
        <td style="padding:8px 10px;text-align:center;">${a.stockActual}</td>
        <td style="padding:8px 10px;text-align:center;">${a.producto.stock_minimo}</td>
        <td style="padding:8px 10px;text-align:center;font-weight:700;color:#16a34a;">${a.faltaParaMinimo}</td>
        <td style="padding:8px 10px;text-align:center;font-weight:700;color:${a.nivel === 'critico' ? '#dc2626' : '#ca8a04'};">
          ${a.nivel === 'critico' ? 'CRITICO' : 'MINIMO'}
        </td>
      </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Lista de Reposicion - ${fecha}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:28px 32px;color:#111;margin:0;}
    h1{font-size:22px;margin:0 0 4px;}
    .sub{color:#555;font-size:13px;margin-bottom:24px;}
    table{width:100%;border-collapse:collapse;font-size:13px;}
    thead{background:#f3f4f6;}
    th{padding:10px;text-align:left;font-weight:600;border-bottom:2px solid #d1d5db;}
    .footer{margin-top:18px;font-size:12px;color:#6b7280;}
    @media print{body{padding:16px;}}
  </style>
</head>
<body>
  <h1>Lista de Reposicion de Stock</h1>
  <p class="sub">Fecha: ${fecha} &nbsp;·&nbsp; Local: ${localNombre} &nbsp;·&nbsp; Total items a reponer: ${lista.length}</p>
  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th>SKU</th>
        <th>Local</th>
        <th style="text-align:center;">Stock Actual</th>
        <th style="text-align:center;">Stock Minimo</th>
        <th style="text-align:center;">A Reponer</th>
        <th style="text-align:center;">Nivel</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">* "A Reponer" indica la cantidad necesaria para alcanzar el stock minimo configurado.</p>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setPdfModalUrl(url);
  };

  const cerrarPdfModal = () => {
    if (pdfModalUrl) URL.revokeObjectURL(pdfModalUrl);
    setPdfModalUrl(null);
  };

  const imprimirPdf = () => {
    const iframe = document.getElementById('pdf-preview-iframe') as HTMLIFrameElement | null;
    iframe?.contentWindow?.print();
  };

  const descargarPdf = async () => {
    const paraComprar = alertas.filter((a) => a.nivel !== 'ok');
    const lista = filtroLocal ? paraComprar.filter((a) => a.local.id === Number(filtroLocal)) : paraComprar;
    if (lista.length === 0) return;

    const fecha = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const localNombre = filtroLocal ? locales.find((l) => l.id === Number(filtroLocal))?.nombre || 'Todos' : 'Todos los locales';

    const rows = lista.map((a) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:7px 10px;">${a.producto.nombre}</td>
        <td style="padding:7px 10px;font-family:monospace;font-size:12px;">${a.producto.sku}</td>
        <td style="padding:7px 10px;">${a.local.nombre}</td>
        <td style="padding:7px 10px;text-align:center;">${a.stockActual}</td>
        <td style="padding:7px 10px;text-align:center;">${a.producto.stock_minimo}</td>
        <td style="padding:7px 10px;text-align:center;font-weight:700;color:#16a34a;">${a.faltaParaMinimo}</td>
        <td style="padding:7px 10px;text-align:center;font-weight:700;color:${a.nivel === 'critico' ? '#dc2626' : '#ca8a04'};">
          ${a.nivel === 'critico' ? 'CRITICO' : 'MINIMO'}
        </td>
      </tr>`).join('');

    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;left:-9999px;top:0;background:#fff;width:794px;padding:32px;z-index:99999;font-family:Arial,sans-serif;color:#111;';
    div.innerHTML = `
      <h1 style="font-size:20px;margin:0 0 4px;">Lista de Reposicion de Stock</h1>
      <p style="color:#555;font-size:13px;margin-bottom:20px;">Fecha: ${fecha} &nbsp;·&nbsp; Local: ${localNombre} &nbsp;·&nbsp; Items a reponer: ${lista.length}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:9px 10px;text-align:left;border-bottom:2px solid #d1d5db;">Producto</th>
            <th style="padding:9px 10px;text-align:left;border-bottom:2px solid #d1d5db;">SKU</th>
            <th style="padding:9px 10px;text-align:left;border-bottom:2px solid #d1d5db;">Local</th>
            <th style="padding:9px 10px;text-align:center;border-bottom:2px solid #d1d5db;">Stock actual</th>
            <th style="padding:9px 10px;text-align:center;border-bottom:2px solid #d1d5db;">Minimo</th>
            <th style="padding:9px 10px;text-align:center;border-bottom:2px solid #d1d5db;">A reponer</th>
            <th style="padding:9px 10px;text-align:center;border-bottom:2px solid #d1d5db;">Nivel</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:16px;font-size:12px;color:#6b7280;">* "A Reponer" indica la cantidad necesaria para alcanzar el stock minimo configurado.</p>`;
    document.body.appendChild(div);

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(div, { scale: 2, backgroundColor: '#fff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      let posY = margin;
      let heightLeft = imgH;
      pdf.addImage(imgData, 'PNG', margin, posY, imgW, imgH);
      heightLeft -= (pageH - margin * 2);
      while (heightLeft > 0) {
        posY = heightLeft - imgH + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, posY, imgW, imgH);
        heightLeft -= (pageH - margin * 2);
      }
      pdf.save(`reposicion-stock-${fecha.replace(/\//g, '-')}.pdf`);
    } finally {
      document.body.removeChild(div);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">
          ← Volver
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Alertas de Stock</h1>
          <p className="text-gray-400">Productos bajo niveles minimos y criticos en todos los locales</p>
        </div>
        <button
          onClick={exportarPDF}
          className="ml-auto flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
        >
          Exportar PDF (lista de compras)
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 border border-red-900 rounded-xl p-5">
          <div className="text-2xl mb-2">🔴</div>
          <div className="text-3xl font-bold text-red-400">{loading ? '—' : criticos.length}</div>
          <div className="text-gray-400 text-sm mt-1">En nivel critico</div>
        </div>
        <div className="bg-slate-800 border border-yellow-900 rounded-xl p-5">
          <div className="text-2xl mb-2">🟡</div>
          <div className="text-3xl font-bold text-yellow-400">{loading ? '—' : minimos.length}</div>
          <div className="text-gray-400 text-sm mt-1">En nivel minimo</div>
        </div>
        <div className="bg-slate-800 border border-green-900 rounded-xl p-5">
          <div className="text-2xl mb-2">🟢</div>
          <div className="text-3xl font-bold text-green-400">{loading ? '—' : okCount}</div>
          <div className="text-gray-400 text-sm mt-1">Sin alerta</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filtroNivel}
          onChange={(e) => setFiltroNivel(e.target.value)}
          className="bg-slate-700 text-gray-300 border border-slate-600 rounded-lg px-3 py-2 text-sm"
        >
          <option value="alerta">Con alerta (critico + minimo)</option>
          <option value="critico">Solo criticos</option>
          <option value="minimo">Solo minimos</option>
          <option value="">Todos (incluye OK)</option>
        </select>
        <select
          value={filtroLocal}
          onChange={(e) => setFiltroLocal(e.target.value)}
          className="bg-slate-700 text-gray-300 border border-slate-600 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todos los locales</option>
          {locales.map((l) => (
            <option key={l.id} value={l.id}>{l.nombre}</option>
          ))}
        </select>
      </div>

      {/* Leyenda de niveles */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Como se determina el nivel</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 h-3 w-3 rounded-full bg-red-500 shrink-0" />
            <div>
              <span className="text-red-300 font-semibold text-sm">Critico</span>
              <p className="text-gray-400 text-xs mt-0.5">
                Stock actual <span className="text-white">menor o igual</span> al nivel critico configurado en el producto. Requiere reposicion urgente.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 h-3 w-3 rounded-full bg-yellow-500 shrink-0" />
            <div>
              <span className="text-yellow-300 font-semibold text-sm">Minimo</span>
              <p className="text-gray-400 text-xs mt-0.5">
                Stock actual <span className="text-white">sobre el critico pero igual o bajo el minimo</span>. Conviene reponer pronto.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 h-3 w-3 rounded-full bg-green-500 shrink-0" />
            <div>
              <span className="text-green-300 font-semibold text-sm">OK</span>
              <p className="text-gray-400 text-xs mt-0.5">
                Stock actual <span className="text-white">por encima del minimo</span>. No requiere accion inmediata.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-slate-800 rounded-xl">
          {filtroNivel === 'alerta'
            ? 'No hay productos con alertas de stock'
            : 'No hay productos con los filtros aplicados'}
        </div>
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="lg:hidden space-y-3">
            {filtradas.map((a, i) => {
              const colorBorde = a.nivel === 'critico' ? 'border-red-700' : a.nivel === 'minimo' ? 'border-yellow-700' : 'border-green-700';
              const colorBarra = a.nivel === 'critico' ? 'bg-red-500' : a.nivel === 'minimo' ? 'bg-yellow-500' : 'bg-green-500';
              const colorTexto = a.nivel === 'critico' ? 'text-red-300' : a.nivel === 'minimo' ? 'text-yellow-300' : 'text-green-300';
              const colorNum   = a.nivel === 'critico' ? 'text-red-400' : a.nivel === 'minimo' ? 'text-yellow-400' : 'text-green-400';

              const mensajeNivel =
                a.nivel === 'critico'
                  ? `Quedan solo ${a.stockActual} unid. — se necesitan ${a.faltaParaMinimo} para llegar al minimo.`
                  : a.nivel === 'minimo'
                  ? `Quedan ${a.stockActual} unid. — faltan ${a.faltaParaMinimo} para el minimo.`
                  : `Stock dentro del rango normal.`;

              // Barra de progreso visual
              const max = Math.max(a.producto.stock_minimo * 1.6, a.stockActual + 1);
              const pctCritico = Math.min((a.producto.stock_critico / max) * 100, 100);
              const pctMinimo  = Math.min((a.producto.stock_minimo  / max) * 100, 100);
              const pctActual  = Math.min((a.stockActual / max) * 100, 100);

              return (
                <div key={i} className={`bg-slate-800 rounded-xl border ${colorBorde} overflow-hidden`}>
                  {/* Franja de color superior */}
                  <div className={`h-1 ${colorBarra}`} />

                  <div className="p-4">
                    {/* Nombre + local */}
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-white leading-snug">{a.producto.nombre}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-3">{a.local.nombre}</div>

                    {/* Mensaje legible */}
                    <p className={`text-sm font-medium mb-4 ${colorTexto}`}>
                      {mensajeNivel}
                    </p>

                    {/* Barra visual de stock */}
                    <div className="mb-1">
                      <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
                        {/* Zona critica (fondo) */}
                        {a.producto.stock_critico > 0 && (
                          <div className="absolute left-0 top-0 h-full bg-red-900/60" style={{ width: `${pctCritico}%` }} />
                        )}
                        {/* Zona minima (fondo) */}
                        <div
                          className="absolute top-0 h-full bg-yellow-900/40"
                          style={{ left: `${pctCritico}%`, width: `${Math.max(0, pctMinimo - pctCritico)}%` }}
                        />
                        {/* Nivel actual */}
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full transition-all ${colorBarra}`}
                          style={{ width: `${pctActual}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 mt-1">
                        <span>0</span>
                        {a.producto.stock_critico > 0 && <span>Critico: {a.producto.stock_critico}</span>}
                        <span>Min: {a.producto.stock_minimo}</span>
                      </div>
                    </div>

                    {/* Cifras */}
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      <div className="bg-slate-700 rounded-lg py-2">
                        <div className="text-gray-400 text-xs mb-0.5">Stock hoy</div>
                        <div className={`text-lg font-bold ${colorNum}`}>{a.stockActual}</div>
                      </div>
                      <div className="bg-slate-700 rounded-lg py-2">
                        <div className="text-gray-400 text-xs mb-0.5">Minimo</div>
                        <div className="text-lg font-bold text-white">{a.producto.stock_minimo}</div>
                      </div>
                      <div className="bg-slate-700 rounded-lg py-2">
                        <div className="text-gray-400 text-xs mb-0.5">A pedir</div>
                        <div className="text-lg font-bold text-primary">{a.faltaParaMinimo > 0 ? a.faltaParaMinimo : '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: Tabla */}
          <div className="hidden lg:block overflow-x-auto bg-slate-800 rounded-xl">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Producto</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">SKU</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Local</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Stock actual</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Minimo</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Critico</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">A reponer</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Nivel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtradas.map((a, i) => {
                  const badge = getBadge(a.nivel);
                  return (
                    <tr key={i} className="hover:bg-slate-700/50">
                      <td className="px-5 py-3 text-sm text-white font-medium">{a.producto.nombre}</td>
                      <td className="px-5 py-3 text-sm font-mono text-gray-400">{a.producto.sku}</td>
                      <td className="px-5 py-3 text-sm text-gray-300">{a.local.nombre}</td>
                      <td className={`px-5 py-3 text-sm text-center font-bold ${
                        a.nivel === 'critico' ? 'text-red-400' : a.nivel === 'minimo' ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {a.stockActual}
                      </td>
                      <td className="px-5 py-3 text-sm text-center text-gray-300">{a.producto.stock_minimo}</td>
                      <td className="px-5 py-3 text-sm text-center text-gray-300">{a.producto.stock_critico}</td>
                      <td className="px-5 py-3 text-sm text-center font-bold text-primary">
                        {a.faltaParaMinimo > 0 ? a.faltaParaMinimo : '—'}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {a.nivel === 'critico' && `${a.stockActual} ≤ ${a.producto.stock_critico} (critico)`}
                            {a.nivel === 'minimo'  && `${a.stockActual} ≤ ${a.producto.stock_minimo} (minimo)`}
                            {a.nivel === 'ok'      && `${a.stockActual} > ${a.producto.stock_minimo} (minimo)`}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal PDF */}
      {pdfModalUrl && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-5 py-3 border-b border-slate-700">
              <span className="text-white font-semibold">Lista de Reposicion de Stock</span>
              <div className="flex gap-2">
                <button
                  onClick={descargarPdf}
                  className="bg-slate-600 hover:bg-slate-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
                >
                  Descargar
                </button>
                <button
                  onClick={imprimirPdf}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
                >
                  Imprimir
                </button>
                <button
                  onClick={cerrarPdfModal}
                  className="text-gray-400 hover:text-white text-xl leading-none px-2"
                >
                  ✕
                </button>
              </div>
            </div>
            <iframe
              id="pdf-preview-iframe"
              src={pdfModalUrl}
              className="flex-1 w-full rounded-b-xl bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
