'use client';

// Gráfico mensual de facturación. Separado de la página para cargar recharts solo cuando se
// muestra (next/dynamic en page.tsx) — change improve-backoffice-responsive-performance.
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface DatoMes {
  mes: string;
  facturado: number;
  cobrado: number;
  porCobrar: number;
}

export default function GraficoFacturacionMensual({ datos }: { datos: DatoMes[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={datos} margin={{ top: 4, right: 8, left: 10, bottom: 0 }} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis
          dataKey="mes"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: '#475569' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => v === 0 ? '0' : `$${(v / 1000000).toFixed(1)}M`}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={58}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
          labelStyle={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}
          itemStyle={{ color: '#cbd5e1' }}
          formatter={(value, name) => [
            `$${Math.round(Number(value ?? 0)).toLocaleString('es-CL')}`,
            name === 'facturado' ? 'Facturado' : name === 'cobrado' ? 'Cobrado' : 'Por cobrar'
          ] as [string, string]}
        />
        <Bar dataKey="facturado" fill="#06b6d4" radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="cobrado"   fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="porCobrar" fill="#eab308" radius={[3, 3, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
