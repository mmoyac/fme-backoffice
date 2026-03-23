'use client';

import styles from './NutritionalLabel.module.css';
import type { InformacionNutricional } from '@/lib/api/etiquetas';

interface NutritionalLabelProps {
  info: InformacionNutricional;
}

export default function NutritionalLabel({ info }: NutritionalLabelProps) {
  const p = info.porcion_peso_g ? Number(info.porcion_peso_g) : null;

  // Calcula el valor por porción dado el valor por 100g
  const porcion = (val: number | null | undefined): string => {
    if (val == null || p == null) return '—';
    return ((Number(val) * p) / 100).toFixed(1);
  };

  const fmt = (val: number | null | undefined): string =>
    val != null ? Number(val).toFixed(1) : '—';

  // Filas de la tabla: [label, val100g, indent, bold]
  const filas: Array<{
    label: string;
    val: number | null | undefined;
    indent?: boolean;
    bold?: boolean;
    last?: boolean;
  }> = [
    { label: 'Calorías (kcal)',               val: info.energia_kcal,             bold: true },
    { label: 'Proteínas (g)',                  val: info.proteinas_g,              bold: true },
    { label: 'Grasa total (g)',                val: info.grasas_totales_g,         bold: true },
    { label: 'Grasas saturadas (g)',           val: info.grasas_saturadas_g,       indent: true },
    { label: 'Grasas monoinsaturadas (g)',     val: info.grasas_monoinsaturadas_g, indent: true },
    { label: 'Grasas poliinsaturadas (g)',     val: info.grasas_poliinsaturadas_g, indent: true },
    { label: 'Grasas trans (g)',               val: info.grasas_trans_g,           indent: true },
    { label: 'Colesterol (mg)',                val: info.colesterol_mg,            bold: true },
    { label: 'Carbohidratos disponibles (g)',  val: info.carbohidratos_g,          bold: true },
    { label: 'Azúcares totales (g)',           val: info.azucares_g,               indent: true },
    { label: 'Fibra total (g)',                val: info.fibra_g,                  bold: true },
    { label: 'Sodio (mg)',                     val: info.sodio_mg,                 bold: true, last: true },
  ].filter(f => f.val != null);

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerMain}>
            <th colSpan={3}>INFORMACIÓN NUTRICIONAL</th>
          </tr>
        </thead>
        <tbody>
          {/* Porción */}
          <tr className={styles.subHeader}>
            <td className={styles.labelBold}>Porción:</td>
            <td className={styles.textCenter}>{info.porcion_referencia}</td>
            <td className={styles.textRight}>
              {info.porcion_peso_g ? `( ${info.porcion_peso_g}g )` : ''}
            </td>
          </tr>

          {/* Porciones por envase */}
          {info.porciones_por_envase && (
            <tr className={styles.subHeader}>
              <td className={styles.labelBold} colSpan={2}>Porciones por envase:</td>
              <td className={styles.textRight}>{info.porciones_por_envase}</td>
            </tr>
          )}

          {/* Encabezados columnas */}
          <tr className={styles.colHeaders}>
            <td></td>
            <td className={`${styles.textCenter} ${styles.borderLeft}`}>100g</td>
            <td className={`${styles.textRight} ${styles.borderLeft}`}>Porción</td>
          </tr>

          {/* Filas de nutrientes */}
          {filas.map((fila) => (
            <tr key={fila.label} className={fila.last ? styles.rowLast : styles.row}>
              <td
                className={
                  fila.indent
                    ? styles.labelIndent
                    : fila.bold
                    ? styles.labelBold
                    : undefined
                }
              >
                {fila.label}
              </td>
              <td className={`${styles.textCenter} ${styles.borderLeft}`}>
                {fmt(fila.val)}
              </td>
              <td className={`${styles.textRight} ${styles.borderLeft}`}>
                {porcion(fila.val)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
