// Estado de carga al navegar entre pantallas de /admin (change improve-backoffice-responsive-performance, D3).
// Se muestra al instante dentro del shell (menú y barra superior quedan visibles).
export default function AdminLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-56 max-w-full rounded-lg bg-slate-800" />
      <div className="h-4 w-80 max-w-full rounded bg-slate-800/70" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-800" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-slate-800" />
    </div>
  );
}
