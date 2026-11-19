'use client';

import { forwardRef } from 'react';
import Barcode from 'react-barcode';
import type { EtiquetaCompleta } from '@/lib/api/etiquetas';
import NutritionalLabel from '../NutritionalLabel';
import SelloOctogonal from './SelloOctogonal';
import Etiqueta75x62, { disposicionSellos, selloLegalMm, type AnchoDiseno } from './Etiqueta75x62';

export type TamanoEtiqueta = '62x100' | '75x62' | '62x29' | '29x90' | 'A4';

export interface ConfigEtiqueta {
  nombre: string;
  ancho: string;
  alto: string;
  fontSize: { titulo: string; normal: string; small: string };
  barcodeHeight: number;
  barcodeWidth: number;
}

export const CONFIGS_ETIQUETA: Record<TamanoEtiqueta, ConfigEtiqueta> = {
  '62x100': {
    nombre: 'DK-11202 — 100 × 62 mm (Brother QL-800)',
    ancho: '100mm',
    alto: '62mm',
    fontSize: { titulo: '11px', normal: '7px', small: '6px' },
    barcodeHeight: 22,
    barcodeWidth: 1.6,
  },
  '75x62': {
    nombre: '75 × 62 mm (Brother QL-820NWB, rollo 62 mm)',
    ancho: '75mm',
    alto: '62mm',
    fontSize: { titulo: '13px', normal: '5.6px', small: '5px' },
    barcodeHeight: 24,
    barcodeWidth: 1,
  },
  '62x29': {
    nombre: '62mm x 29mm (Brother QL - Etiqueta Compacta)',
    ancho: '62mm',
    alto: '29mm',
    fontSize: { titulo: '10px', normal: '7px', small: '6px' },
    barcodeHeight: 20,
    barcodeWidth: 1,
  },
  '29x90': {
    nombre: '29mm x 90mm (Brother QL - Etiqueta Vertical)',
    ancho: '29mm',
    alto: '90mm',
    fontSize: { titulo: '8px', normal: '6px', small: '5px' },
    barcodeHeight: 35,
    barcodeWidth: 0.8,
  },
  'A4': {
    nombre: 'A4 Landscape (Etiqueta Nutricional Completa)',
    ancho: '297mm',
    alto: '210mm',
    fontSize: { titulo: '18px', normal: '11px', small: '9px' },
    barcodeHeight: 50,
    barcodeWidth: 1.5,
  },
};

/** Ancho en mm de los formatos con el diseño de la empresa (null para los demás). */
const ANCHO_DISENO: Partial<Record<TamanoEtiqueta, AnchoDiseno>> = { '75x62': 75, '62x100': 100 };

/** Formatos con el diseño de la empresa (sellos a tamaño legal, aviso de desborde). */
export function esFormatoEmpresa(tamano: TamanoEtiqueta): boolean {
  return tamano in ANCHO_DISENO;
}

/**
 * Si los sellos del producto NO caben a tamaño legal en el formato, devuelve el mensaje para bloquear la
 * impresión; si caben (o el formato no es del diseño de la empresa), null.
 */
export function problemaSellos(tamano: TamanoEtiqueta, nSellos: number): string | null {
  const ancho = ANCHO_DISENO[tamano];
  if (!ancho || disposicionSellos(ancho, nSellos) !== 'no-cumple') return null;
  return `${nSellos} sellos no caben a su tamaño legal (${(selloLegalMm(ancho) / 10).toLocaleString('es-CL')} cm) en este formato: usa 75 × 62 mm`;
}

/** Datos de lote impresos en "Fecha de elaboración / Lote" (formatos A4 y 62×100). */
export interface LoteEtiqueta {
  fecha: string;   // dd/mm/aaaa
  codigo: string;  // ej. OP-123
}

interface EtiquetaNutricionalProps {
  etiqueta: EtiquetaCompleta;
  tamano: TamanoEtiqueta;
  /** Sin lote, el campo queda en blanco para completar a mano. */
  lote?: LoteEtiqueta;
  className?: string;
  /** Formatos 75×62 y 62×100 (diseño de la empresa): avisa si el contenido no cabe en la etiqueta. */
  onDesborde?: (desborda: boolean) => void;
}

/**
 * Etiqueta nutricional a tamaño real (mm). Componente presentacional compartido por la
 * preview del producto (EtiquetaPreview) y la impresión desde producción.
 */
const EtiquetaNutricional = forwardRef<HTMLDivElement, EtiquetaNutricionalProps>(function EtiquetaNutricional(
  { etiqueta, tamano, lote, className, onDesborde },
  ref,
) {
  const config = CONFIGS_ETIQUETA[tamano];
  const textoLote = lote ? `${lote.fecha} / Lote ${lote.codigo}` : null;

  // Sello hexagonal (octágono negro estilo Ministerio de Salud Chile)
  // Sello octagonal oficial Ministerio de Salud Chile
  const SelloHexagonal = ({ nombre }: { nombre: string }) => (
    <SelloOctogonal nombre={nombre} size={tamano === 'A4' ? 72 : tamano === '62x100' ? 54 : 32} />
  );

  // ── LAYOUT A4 LANDSCAPE ──────────────────────────────────────────
  const LayoutA4 = () => {
    const info = etiqueta.informacion_nutricional;

    return (
      <div style={{
        width: '297mm',
        height: '210mm',
        fontFamily: 'Arial, sans-serif',
        color: '#000',
        background: '#fff',
        padding: '8mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── ENCABEZADO ── */}
        <div style={{ marginBottom: '3mm' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 2mm 0', lineHeight: 1.2 }}>
            {etiqueta.producto_nombre}
          </h1>
          {info?.ingredientes && (
            <p style={{ fontSize: '9px', margin: '0', lineHeight: 1.4 }}>
              <strong>Ingredientes:</strong> {info.ingredientes}
              {info.alergenos && (
                <span> <strong>{info.alergenos}</strong></span>
              )}
            </p>
          )}
        </div>

        <div style={{ borderTop: '1.5px solid #000', marginBottom: '3mm' }} />

        {/* ── CUERPO 3 COLUMNAS ── */}
        <div style={{ display: 'flex', gap: '6mm', flex: 1, minHeight: 0 }}>

          {/* COLUMNA IZQUIERDA */}
          <div style={{ width: '72mm', flexShrink: 0, fontSize: '8.5px', lineHeight: 1.5 }}>
            {info?.modo_uso && (
              <div style={{ marginBottom: '3mm' }}>
                <div style={{ fontWeight: 'bold', fontSize: '9px' }}>Modo de uso / Preparación:</div>
                <div style={{ whiteSpace: 'pre-line' }}>{info.modo_uso}</div>
              </div>
            )}
            {info?.condiciones_almacenamiento && (
              <div style={{ marginBottom: '3mm' }}>
                <div style={{ fontWeight: 'bold', fontSize: '9px' }}>Condiciones de almacenamiento:</div>
                <div style={{ whiteSpace: 'pre-line' }}>{info.condiciones_almacenamiento}</div>
              </div>
            )}
            {info?.plazo_duracion && (
              <div style={{ marginBottom: '3mm' }}>
                <div style={{ fontWeight: 'bold', fontSize: '9px' }}>Plazo de duración:</div>
                <div style={{ whiteSpace: 'pre-line' }}>{info.plazo_duracion}</div>
              </div>
            )}
            <div style={{ marginBottom: '2mm' }}>
              <span style={{ fontWeight: 'bold', fontSize: '9px' }}>Fecha de elaboración / Lote:</span>
              <div style={{ marginTop: '1mm' }}>{textoLote ?? '_____________________'}</div>
            </div>
            <div style={{ marginBottom: '2mm' }}>
              <span style={{ fontWeight: 'bold', fontSize: '9px' }}>Producido en -</span>
            </div>
            {info?.contenido_neto && (
              <div style={{ marginTop: '2mm' }}>
                <div style={{ fontSize: '8px' }}>Cont. neto</div>
                <div style={{ fontSize: '26px', fontWeight: 'bold', lineHeight: 1 }}>{info.contenido_neto}</div>
              </div>
            )}
            {(etiqueta.empresa_razon_social || etiqueta.empresa_direccion) && (
              <div style={{ marginTop: '3mm', fontSize: '8px', lineHeight: 1.4 }}>
                <div style={{ fontWeight: 'bold' }}>Elaborado por</div>
                <div>{etiqueta.empresa_razon_social}</div>
                <div>{etiqueta.empresa_direccion}</div>
                {etiqueta.empresa_resolucion_sanitaria && (
                  <div>{etiqueta.empresa_resolucion_sanitaria}</div>
                )}
              </div>
            )}
          </div>

          {/* COLUMNA CENTRAL - Tabla nutricional */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {info && <NutritionalLabel info={info} />}
          </div>

          {/* COLUMNA DERECHA - Sellos + código */}
          <div style={{ width: '52mm', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4mm' }}>
            {etiqueta.sellos?.map((sello) => (
              <SelloHexagonal key={sello.codigo} nombre={sello.nombre} />
            ))}
            {etiqueta.codigo_barra && (
              <div style={{ marginTop: 'auto' }}>
                <Barcode
                  value={etiqueta.codigo_barra}
                  format="CODE128"
                  width={1.2}
                  height={35}
                  fontSize={8}
                  background="#ffffff"
                  lineColor="#000000"
                  displayValue={true}
                  margin={0}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: '1px solid #000', marginTop: '2mm', paddingTop: '1.5mm', display: 'flex', justifyContent: 'space-between', fontSize: '8px' }}>
          <span>{etiqueta.empresa_email}</span>
          <span>{etiqueta.empresa_telefono}</span>
        </div>
      </div>
    );
  };

  // ── LAYOUT 62×29 (compacta) ──────────────────────────────────────
  const Layout62x29 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2mm' }}>
      <div style={{ fontSize: config.fontSize.titulo, fontWeight: 'bold', textAlign: 'center', marginBottom: '1mm', lineHeight: 1.1, color: '#000' }}>
        {etiqueta.producto_nombre}
      </div>
      {etiqueta.codigo_barra && (
        <Barcode value={etiqueta.codigo_barra} format="CODE128" width={config.barcodeWidth} height={config.barcodeHeight} fontSize={7} background="#ffffff" lineColor="#000000" displayValue={true} margin={0} />
      )}
    </div>
  );

  // ── LAYOUT 29×90 (vertical) ──────────────────────────────────────
  const Layout29x90 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%', justifyContent: 'space-between', padding: '1.5mm' }}>
      <div style={{ fontSize: config.fontSize.titulo, fontWeight: 'bold', lineHeight: 1.1, color: '#000' }}>
        {etiqueta.producto_nombre.length > 25 ? etiqueta.producto_nombre.substring(0, 25) + '...' : etiqueta.producto_nombre}
      </div>
      {etiqueta.codigo_barra && (
        <Barcode value={etiqueta.codigo_barra} format="CODE128" width={config.barcodeWidth} height={config.barcodeHeight} fontSize={6} background="#ffffff" lineColor="#000000" displayValue={true} margin={0} />
      )}
      <div style={{ fontSize: config.fontSize.small, color: '#000' }}>{etiqueta.producto_sku}</div>
    </div>
  );

  return (
    <div
      ref={ref}
      className={className}
      style={{
        width: config.ancho,
        height: config.alto,
        background: '#ffffff',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {tamano === '62x29' && <Layout62x29 />}
      {tamano === '29x90' && <Layout29x90 />}
      {tamano === '62x100' && <Etiqueta75x62 etiqueta={etiqueta} lote={lote} onDesborde={onDesborde} ancho={100} />}
      {tamano === '75x62' && <Etiqueta75x62 etiqueta={etiqueta} lote={lote} onDesborde={onDesborde} />}
      {tamano === 'A4' && <LayoutA4 />}
    </div>
  );
});

export default EtiquetaNutricional;
