'use client';

// Etiqueta con el diseño de la empresa (fme-backend/docs/etiquetado/etiqueta.jpeg), change add-formato-etiqueta-75x62.
// Alto fijo de 62 mm y dos anchos: 75 mm (rollo continuo QL-820NWB) y 100 mm (DK-11202).
// Sellos a su tamaño legal según el área, de a 2 por fila y pegados a la derecha (como en el ejemplo); tabla debajo.
import { useLayoutEffect, useRef } from 'react';
import Barcode from 'react-barcode';
import type { EtiquetaCompleta, InformacionNutricional } from '@/lib/api/etiquetas';
import type { LoteEtiqueta } from './EtiquetaNutricional';
import SelloOctogonal from './SelloOctogonal';
import { useLogoDataUrl } from '@/lib/etiquetas/logo';

const FUENTE = 'Arial, Helvetica, sans-serif';
const ALTO_MM = 62;
const GAP_SELLOS_MM = 0.6;

export type AnchoDiseno = 75 | 100;

interface Dims {
  txt: string; txtTabla: string; titulo: string; tituloTabla: string; pie: string;
  colDerecha: number; logoAlto: string; logoAncho: string; barraAncho: number; barraAlto: number;
}

const DIMS: Record<AnchoDiseno, Dims> = {
  75: { txt: '5.6px', txtTabla: '5px', titulo: '13px', tituloTabla: '6.5px', pie: '6px',
        colDerecha: 33, logoAlto: '9mm', logoAncho: '13mm', barraAncho: 1, barraAlto: 19 },
  100: { txt: '6.4px', txtTabla: '5px', titulo: '16px', tituloTabla: '6.8px', pie: '6.8px',
         colDerecha: 42, logoAlto: '10mm', logoAncho: '18mm', barraAncho: 1.2, barraAlto: 20 },
};

/**
 * Lado mínimo del sello "ALTO EN" (mm) según el área de la cara principal de la etiqueta.
 * Manual de Etiquetado Nutricional MINSAL 3ª ed. 2022, pág. 30 (Imagen N°13).
 */
export function selloLegalMm(anchoMm: number, altoMm: number = ALTO_MM): number {
  const areaCm2 = (anchoMm / 10) * (altoMm / 10);
  if (areaCm2 < 60) return 15;   // < 30 cm²: va en el envase mayor; se usa el mínimo de 1,5 cm
  if (areaCm2 < 100) return 20;
  if (areaCm2 < 200) return 25;
  if (areaCm2 < 300) return 30;
  return 35;
}

/**
 * Sellos a tamaño legal, máximo 2 por fila, pegados a la derecha, con la tabla debajo:
 * - 'normal': 1–2 sellos (una fila).
 * - 'compacta': 3–4 sellos (dos filas); la tabla usa letra compacta, como en el ejemplo, para caber debajo.
 * - 'no-cumple': las dos filas de sellos no dejan espacio para la tabla (100 × 62: sellos de 20 mm). Se bloquea la impresión.
 */
export function disposicionSellos(ancho: AnchoDiseno, n: number): 'normal' | 'compacta' | 'no-cumple' {
  if (n <= 2) return 'normal';
  return selloLegalMm(ancho) <= 15 ? 'compacta' : 'no-cumple';
}

/** Formato chileno: coma decimal, máx. 1 decimal (274,4 · 6 · 0). */
function num(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

/** EAN-13 válido (dígito verificador correcto). */
function esEan13(codigo: string): boolean {
  if (!/^\d{13}$/.test(codigo)) return false;
  const d = codigo.split('').map(Number);
  const suma = d.slice(0, 12).reduce((s, n, i) => s + n * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (suma % 10)) % 10 === d[12];
}

interface FilaTabla { label: string; val: number | null | undefined; indent?: boolean }

/**
 * Filas de la tabla según el Manual de Etiquetado Nutricional (pág. 19): obligatorias siempre
 * (con "—" si faltan); desglose de grasas + trans + colesterol si grasas por porción ≥ 3 g.
 */
export function filasTabla75x62(info: InformacionNutricional): FilaTabla[] {
  const p = info.porcion_peso_g ? Number(info.porcion_peso_g) : null;
  const grasasPorcion = info.grasas_totales_g != null && p != null ? (Number(info.grasas_totales_g) * p) / 100 : null;
  // Sin peso de porción no se puede evaluar la regla: se muestra el desglose (opción más segura).
  const desgloseObligatorio = grasasPorcion == null || grasasPorcion >= 3;
  const desglose: FilaTabla[] = [
    { label: 'Grasas Saturadas (g)', val: info.grasas_saturadas_g, indent: true },
    { label: 'Grasas Monoinsat. (g)', val: info.grasas_monoinsaturadas_g, indent: true },
    { label: 'Grasas Poliinsat. (g)', val: info.grasas_poliinsaturadas_g, indent: true },
    { label: 'Grasas Trans (g)', val: info.grasas_trans_g, indent: true },
    { label: 'Colesterol (mg)', val: info.colesterol_mg, indent: true },
  ].filter(f => desgloseObligatorio || f.val != null);
  return [
    { label: 'Energía (kcal)', val: info.energia_kcal },
    { label: 'Proteínas (g)', val: info.proteinas_g },
    { label: 'Grasas Totales (g)', val: info.grasas_totales_g },
    ...desglose,
    { label: 'H. de C. disp. (g)', val: info.carbohidratos_g },
    { label: 'Azúcares Totales (g)', val: info.azucares_g, indent: true },
    { label: 'Sodio (mg)', val: info.sodio_mg },
  ];
}

function TablaNutricional({ info, d, compacta = false }: { info: InformacionNutricional; d: Dims; compacta?: boolean }) {
  const p = info.porcion_peso_g ? Number(info.porcion_peso_g) : null;
  const porcion = (v: number | null | undefined) => (v == null || p == null ? '—' : num((Number(v) * p) / 100));
  // padding vertical 0: el navegador pone 1px arriba y abajo por celda (12 filas = 2 mm perdidos)
  const celda: React.CSSProperties = { padding: '0 0.4mm', textAlign: 'right', whiteSpace: 'nowrap' };
  // html2canvas dibuja el texto ~0,5 mm más abajo que el navegador: holgura bajo el encabezado y al pie de la tabla
  const encabezado: React.CSSProperties = { fontWeight: 'normal', borderBottom: '0.2mm solid #000', paddingTop: 0, paddingBottom: compacta ? '1mm' : '1.2mm' };
  return (
    <div style={{
      border: '0.35mm solid #000', borderRadius: '1.6mm', padding: compacta ? '0.4mm 0.8mm 1.3mm' : '0.6mm 0.9mm 1.7mm',
      fontSize: compacta ? '4.8px' : d.txtTabla, lineHeight: compacta ? 1.06 : 1.28,
    }}>
      <div style={{ fontSize: compacta ? '6px' : d.tituloTabla, lineHeight: 1.1, marginBottom: '0.3mm' }}>INFORMACIÓN NUTRICIONAL</div>
      {(info.porcion_referencia || info.porciones_por_envase) && (
        <div style={{ marginBottom: '0.3mm' }}>
          {info.porcion_referencia && <>Porción: {info.porcion_referencia}{p ? ` (${num(p)} g)` : ''}</>}
          {info.porcion_referencia && info.porciones_por_envase ? ' · ' : ''}
          {info.porciones_por_envase ? <>Porciones por envase: {num(info.porciones_por_envase)}</> : null}
        </div>
      )}
      {/* borde en cada th (no en el tr): html2canvas dibuja mal el borde del tr y tacha el texto */}
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 'inherit', lineHeight: 'inherit' }}>
        <thead>
          <tr>
            <th style={{ ...encabezado, textAlign: 'left', paddingLeft: 0, paddingTop: 0 }}>Determinación por</th>
            <th style={{ ...celda, ...encabezado }}>100 g</th>
            <th style={{ ...celda, ...encabezado }}>1 Porción{p ? ` (${num(p)}g)` : ''}</th>
          </tr>
        </thead>
        <tbody>
          {filasTabla75x62(info).map(f => (
            <tr key={f.label}>
              <td style={{ padding: 0, paddingLeft: f.indent ? '1.2mm' : 0, whiteSpace: 'nowrap' }}>{f.indent ? '-' : ''}{f.label}</td>
              <td style={celda}>{num(f.val)}</td>
              <td style={celda}>{porcion(f.val)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Linea = ({ largo = '14mm' }: { largo?: string }) => (
  <span style={{ display: 'inline-block', width: largo, borderBottom: '0.2mm solid #000', marginLeft: '0.6mm' }} />
);

export default function Etiqueta75x62({
  etiqueta, lote, onDesborde, ancho = 75,
}: {
  etiqueta: EtiquetaCompleta;
  lote?: LoteEtiqueta;
  onDesborde?: (desborda: boolean) => void;
  /** Ancho en mm (alto fijo 62 mm). */
  ancho?: AnchoDiseno;
}) {
  const d = DIMS[ancho];
  const info = etiqueta.informacion_nutricional;
  const logo = useLogoDataUrl(etiqueta.empresa_logo_url);
  const izqRef = useRef<HTMLDivElement>(null);
  const derRef = useRef<HTMLDivElement>(null);

  const sellos = etiqueta.sellos ?? [];
  const lado = selloLegalMm(ancho);
  const disposicion = disposicionSellos(ancho, sellos.length);

  // Detecta si el contenido no cabe (la etiqueta recorta con overflow: hidden)
  useLayoutEffect(() => {
    if (!onDesborde) return;
    const excede = (el: HTMLDivElement | null) => !!el && el.scrollHeight > el.clientHeight + 1;
    onDesborde(excede(izqRef.current) || excede(derRef.current));
  });

  const alergenos = info?.alergenos?.trim();
  const codigo = etiqueta.codigo_barra?.trim();
  const pie = [
    etiqueta.empresa_razon_social ? `Elaborado por ${etiqueta.empresa_razon_social}` : null,
    etiqueta.empresa_telefono ? `Fono ${etiqueta.empresa_telefono}` : null,
    etiqueta.empresa_comuna || null,
  ].filter(Boolean) as string[];

  // Sellos a tamaño legal, máximo 2 por fila, pegados a la derecha (como en el ejemplo)
  const bloqueSellos = sellos.length > 0 && (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${Math.min(sellos.length, 2)}, ${lado}mm)`,
      justifyContent: 'end', gap: `${GAP_SELLOS_MM}mm`,
    }}>
      {sellos.map(s => <SelloOctogonal key={s.codigo} nombre={s.nombre} size={`${lado}mm`} />)}
    </div>
  );

  const logoImg = logo && (
    <img src={logo} alt="" style={{ height: d.logoAlto, maxWidth: d.logoAncho, objectFit: 'contain', flexShrink: 0 }} />
  );

  const titulo = (
    <div style={{ flex: 1, minWidth: 0, fontSize: d.titulo, fontWeight: 'bold', lineHeight: 1.05, textTransform: 'uppercase', overflowWrap: 'anywhere' }}>
      {etiqueta.producto_nombre}
    </div>
  );
  const contenidoNeto = info?.contenido_neto && <div style={{ fontSize: '7px', marginTop: '0.5mm' }}>{info.contenido_neto}</div>;

  // Textos de la columna izquierda (después del nombre)
  const cuerpo = (
    <>
      {info?.ingredientes && <div style={{ marginTop: '0.6mm' }}>Ingredientes: {info.ingredientes}</div>}
      {info?.modo_uso && (
        <div style={{ marginTop: '0.6mm', fontWeight: 'bold', whiteSpace: 'pre-line' }}>Preparación: {info.modo_uso}</div>
      )}
      {info?.condiciones_almacenamiento && (
        <div style={{ fontWeight: info?.modo_uso ? 'normal' : 'bold', whiteSpace: 'pre-line', marginTop: info?.modo_uso ? 0 : '0.6mm' }}>
          {info.condiciones_almacenamiento}
        </div>
      )}
      {alergenos && (
        <div style={{ marginTop: '0.6mm', fontWeight: 'bold', fontStyle: 'italic' }}>
          {/^al[eé]rgenos/i.test(alergenos) ? alergenos : `Alérgenos: ${alergenos}`}
        </div>
      )}
      {(etiqueta.empresa_direccion || etiqueta.empresa_origen) && (
        <div style={{ marginTop: '0.6mm', fontWeight: 'bold' }}>
          {etiqueta.empresa_direccion && <div>Dirección: {etiqueta.empresa_direccion}</div>}
          {etiqueta.empresa_origen && <div>{etiqueta.empresa_origen}</div>}
        </div>
      )}
      {etiqueta.empresa_resolucion_sanitaria && <div>{etiqueta.empresa_resolucion_sanitaria}</div>}

      <div style={{ marginTop: '0.6mm', fontWeight: 'bold' }}>
        Lote N° {lote ? lote.codigo : <Linea largo="18mm" />}
      </div>
      <div style={{ marginTop: '0.4mm', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
        ELABORACIÓN {lote ? lote.fecha : <Linea largo="10mm" />}
        <span style={{ marginLeft: '1.5mm' }}>VENCIMIENTO</span> <Linea largo="10mm" />
      </div>

      {codigo && (
        <div style={{ marginTop: 'auto', paddingTop: '0.8mm' }}>
          <Barcode
            value={codigo}
            format={esEan13(codigo) ? 'EAN13' : 'CODE128'}
            width={d.barraAncho}
            height={d.barraAlto}
            fontSize={9}
            textMargin={0}
            background="#ffffff"
            lineColor="#000000"
            displayValue={true}
            margin={0}
          />
        </div>
      )}
    </>
  );

  const columnaIzq: React.CSSProperties = {
    flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontSize: d.txt, lineHeight: 1.2,
  };
  const columnaDer: React.CSSProperties = {
    width: `${d.colDerecha}mm`, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
  };

  return (
    <div style={{
      width: `${ancho}mm`, height: `${ALTO_MM}mm`, boxSizing: 'border-box', padding: '1.2mm',
      background: '#fff', color: '#000', fontFamily: FUENTE,
    }}>
      <div style={{
        width: '100%', height: '100%', boxSizing: 'border-box', border: '0.45mm solid #000',
        padding: '1.2mm 1.5mm 0.8mm', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: '1.5mm' }}>
          {/* ── COLUMNA IZQUIERDA ── */}
          <div ref={izqRef} style={columnaIzq}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1mm' }}>
              {titulo}
              {logoImg}
            </div>
            {contenidoNeto}
            {cuerpo}
          </div>
          {/* ── COLUMNA DERECHA: sellos (pegados a la derecha) + tabla ── */}
          <div ref={derRef} style={columnaDer}>
            {bloqueSellos && <div style={{ marginBottom: '0.1mm' }}>{bloqueSellos}</div>}
            {info && (
              <div style={{ marginTop: 'auto' }}>
                <TablaNutricional info={info} d={d} compacta={disposicion !== 'normal'} />
              </div>
            )}
          </div>
        </div>

        {/* ── PIE ── */}
        {pie.length > 0 && (
          <div style={{ marginTop: '0.8mm', display: 'flex', justifyContent: 'space-between', gap: '1.5mm', fontSize: d.pie, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            {pie.map(t => <span key={t}>{t}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}
