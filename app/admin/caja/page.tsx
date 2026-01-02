'use client';
import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';
import type { User } from '@/lib/auth';

interface MedioPago {
  id: number;
  codigo: string;
  nombre: string;
}

interface Local {
  id: number;
  nombre: string;
}

interface TurnoCaja {
  id: number;
  vendedor_id: number;
  local_id: number;
  fecha_apertura: string;
  fecha_cierre?: string;
  estado: 'ABIERTO' | 'CERRADO';
  monto_inicial: number;
  efectivo_esperado?: number;
  efectivo_real?: number;
  diferencia?: number;
  observaciones_apertura?: string;
  observaciones_cierre?: string;
  vendedor_nombre?: string;
  local_nombre?: string;
}

interface EstadoCaja {
  vendedor_id: number;
  vendedor_nombre: string;
  tiene_caja_abierta: boolean;
  turno_activo?: TurnoCaja;
  total_ventas: number;
  total_ingresos: number;
  total_egresos: number;
  efectivo_esperado: number;
}

interface OperacionCaja {
  id: number;
  tipo_operacion: 'APERTURA' | 'VENTA' | 'INGRESO' | 'EGRESO' | 'DEVOLUCION' | 'CIERRE';
  monto: number;
  descripcion: string;
  observaciones?: string;
  fecha_operacion: string;
  medio_pago_codigo?: string;
  medio_pago_nombre?: string;
}

interface TurnoCajaConOperaciones extends TurnoCaja {
  operaciones: OperacionCaja[];
}

export default function CajaPage() {
  const [estadoCaja, setEstadoCaja] = useState<EstadoCaja | null>(null);
  const [locales, setLocales] = useState<Local[]>([]);
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  const [historialTurnos, setHistorialTurnos] = useState<TurnoCaja[]>([]);
  const [turnoDetalle, setTurnoDetalle] = useState<TurnoCajaConOperaciones | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'abrir' | 'cerrar' | 'operacion' | 'detalle'>('abrir');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLocal, setUserLocal] = useState<Local | null>(null);

  // Estados para formularios
  const [formApertura, setFormApertura] = useState({
    local_id: 0,
    monto_inicial: 0,
    observaciones_apertura: ''
  });

  const [formCierre, setFormCierre] = useState({
    efectivo_real: 0,
    observaciones_cierre: ''
  });

  const [formOperacion, setFormOperacion] = useState({
    tipo_operacion: 'INGRESO' as 'INGRESO' | 'EGRESO' | 'DEVOLUCION',
    monto: 0,
    descripcion: '',
    observaciones: '',
    medio_pago_id: 0
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const getHeaders = () => ({
    'Authorization': `Bearer ${AuthService.getToken()}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    fetchUserInfo();
    fetchEstadoCaja();
    fetchLocales();
    fetchMediosPago();
    fetchHistorialTurnos();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      setCurrentUser(user);
      
      // Si el usuario tiene un local asignado, cargarlo
      if (user.local_defecto_id) {
        const res = await fetch(`${API_URL}/api/locales/${user.local_defecto_id}`, { 
          headers: getHeaders() 
        });
        if (res.ok) {
          const local = await res.json();
          setUserLocal(local);
          // Pre-seleccionar el local en el formulario
          setFormApertura(prev => ({ ...prev, local_id: local.id }));
        }
      }
    } catch (e) {
      console.error('Error obteniendo información del usuario:', e);
    }
  };

  const fetchEstadoCaja = async () => {
    try {
      const res = await fetch(`${API_URL}/api/caja/estado`, { headers: getHeaders() });
      if (res.ok) {
        const estado = await res.json();
        setEstadoCaja(estado);
      }
    } catch (e) {
      console.error('Error obteniendo estado de caja:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocales = async () => {
    try {
      const res = await fetch(`${API_URL}/api/locales/`, { headers: getHeaders() });
      if (res.ok) setLocales(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchMediosPago = async () => {
    try {
      const res = await fetch(`${API_URL}/api/maestras/medios-pago`, { headers: getHeaders() });
      if (res.ok) setMediosPago(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchHistorialTurnos = async () => {
    try {
      const res = await fetch(`${API_URL}/api/caja/turnos/historial?limit=10`, { headers: getHeaders() });
      if (res.ok) setHistorialTurnos(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que tiene local asignado
    if (!currentUser?.local_defecto_id) {
      alert('No tienes un local asignado. Contacta al administrador.');
      return;
    }
    
    if (formApertura.local_id === 0) {
      alert('Error: Local no seleccionado');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/caja/turno/abrir`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(formApertura)
      });
      
      if (res.ok) {
        alert('Caja abierta exitosamente');
        setShowModal(false);
        setFormApertura({ 
          local_id: currentUser.local_defecto_id, 
          monto_inicial: 0, 
          observaciones_apertura: '' 
        });
        await fetchEstadoCaja();
        await fetchHistorialTurnos();
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (e) {
      alert('Error abriendo caja');
    }
  };

  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estadoCaja?.turno_activo) return;
    
    try {
      const res = await fetch(`${API_URL}/api/caja/turno/${estadoCaja.turno_activo.id}/cerrar`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(formCierre)
      });
      
      if (res.ok) {
        alert('Caja cerrada exitosamente');
        setShowModal(false);
        setFormCierre({ efectivo_real: 0, observaciones_cierre: '' });
        await fetchEstadoCaja();
        await fetchHistorialTurnos();
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (e) {
      alert('Error cerrando caja');
    }
  };

  const handleRegistrarOperacion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const operacionData: any = { ...formOperacion };
      if (operacionData.medio_pago_id === 0) {
        delete operacionData.medio_pago_id;
      }
      
      const res = await fetch(`${API_URL}/api/caja/operacion`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(operacionData)
      });
      
      if (res.ok) {
        alert('Operación registrada exitosamente');
        setShowModal(false);
        setFormOperacion({
          tipo_operacion: 'INGRESO',
          monto: 0,
          descripcion: '',
          observaciones: '',
          medio_pago_id: 0
        });
        await fetchEstadoCaja();
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (e) {
      alert('Error registrando operación');
    }
  };

  const verDetalleTurno = async (turnoId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/caja/turno/${turnoId}`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const detalle = await res.json();
        setTurnoDetalle(detalle);
        setModalType('detalle');
        setShowModal(true);
      } else {
        alert('Error al cargar detalle del turno');
      }
    } catch (e) {
      console.error(e);
      alert('Error al cargar detalle del turno');
    }
  };

  const descargarPdfCierre = async (turnoId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/caja/turno/${turnoId}/pdf`, {
        headers: getHeaders()
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Extraer nombre del archivo del header Content-Disposition si existe
        const contentDisposition = res.headers.get('Content-Disposition');
        let filename = `cierre_caja_turno_${turnoId}.pdf`;
        if (contentDisposition) {
          const matches = contentDisposition.match(/filename="?([^"]+)"?/);
          if (matches) {
            filename = matches[1];
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (e) {
      console.error('Error descargando PDF:', e);
      alert('Error al descargar el PDF del cierre');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white">Cargando estado de caja...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Advertencia si no tiene local asignado */}
      {currentUser && !userLocal && (
        <div className="bg-red-900 border border-red-600 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-200">
            <span>⚠️</span>
            <div>
              <h3 className="font-semibold">Sin Local Asignado</h3>
              <p className="text-sm">
                No tienes un local asignado. Contacta al administrador para configurar tu local de trabajo.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Control de Caja</h1>
          {userLocal && (
            <p className="text-slate-300 mt-1">
              🏪 Local asignado: <span className="text-cyan-400 font-semibold">{userLocal.nombre}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {!estadoCaja?.tiene_caja_abierta ? (
            <button
              onClick={() => { setModalType('abrir'); setShowModal(true); }}
              disabled={!userLocal}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold"
            >
              🔓 Abrir Caja
            </button>
          ) : (
            <>
              <button
                onClick={() => { setModalType('operacion'); setShowModal(true); }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
              >
                💰 Registrar Operación
              </button>
              <button
                onClick={() => { 
                  setFormCierre({ 
                    efectivo_real: estadoCaja.efectivo_esperado, 
                    observaciones_cierre: '' 
                  });
                  setModalType('cerrar'); 
                  setShowModal(true); 
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold"
              >
                🔒 Cerrar Caja
              </button>
            </>
          )}
        </div>
      </div>

      {/* Estado Actual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de Estado */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Estado Actual</h2>
          
          {estadoCaja?.tiene_caja_abierta ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Estado:</span>
                <span className="text-green-400 font-semibold">🔓 CAJA ABIERTA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Local:</span>
                <span className="text-white">{estadoCaja.turno_activo?.local_nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Apertura:</span>
                <span className="text-white">
                  {estadoCaja.turno_activo?.fecha_apertura ? 
                    formatDateTime(estadoCaja.turno_activo.fecha_apertura) : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Monto Inicial:</span>
                <span className="text-white">
                  {formatCurrency(estadoCaja.turno_activo?.monto_inicial || 0)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🔒</div>
              <p className="text-gray-400">No hay caja abierta</p>
              <p className="text-sm text-gray-500">Haz clic en "Abrir Caja" para comenzar</p>
            </div>
          )}
        </div>

        {/* Panel de Totales */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Totales del Día</h2>
          
          {estadoCaja?.tiene_caja_abierta ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {formatCurrency(estadoCaja.total_ventas)}
                </div>
                <div className="text-sm text-gray-400">Ventas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {formatCurrency(estadoCaja.total_ingresos)}
                </div>
                <div className="text-sm text-gray-400">Ingresos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {formatCurrency(estadoCaja.total_egresos)}
                </div>
                <div className="text-sm text-gray-400">Egresos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(estadoCaja.efectivo_esperado)}
                </div>
                <div className="text-sm text-gray-400">Efectivo Esperado</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              Sin datos - Caja cerrada
            </div>
          )}
        </div>
      </div>

      {/* Historial de Turnos */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Historial Reciente</h2>
        
        {historialTurnos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Monto Inicial</th>
                  <th className="px-4 py-3">Efectivo Real</th>
                  <th className="px-4 py-3">Diferencia</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {historialTurnos.map((turno) => (
                  <tr key={turno.id} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      {formatDateTime(turno.fecha_apertura)}
                    </td>
                    <td className="px-4 py-3">{turno.local_nombre}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        turno.estado === 'ABIERTO' ? 'bg-green-600' : 'bg-gray-600'
                      }`}>
                        {turno.estado === 'ABIERTO' ? '🔓 ABIERTO' : '🔒 CERRADO'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatCurrency(turno.monto_inicial)}</td>
                    <td className="px-4 py-3">
                      {turno.efectivo_real ? formatCurrency(turno.efectivo_real) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {turno.diferencia !== undefined ? (
                        <span className={turno.diferencia === 0 ? 'text-green-400' : 
                                       turno.diferencia > 0 ? 'text-blue-400' : 'text-red-400'}>
                          {formatCurrency(turno.diferencia)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => verDetalleTurno(turno.id)}
                          className="text-primary hover:text-amber-300 text-sm"
                        >
                          👁️ Ver Detalle
                        </button>
                        {turno.estado === 'CERRADO' && (
                          <button
                            onClick={() => descargarPdfCierre(turno.id)}
                            className="text-blue-400 hover:text-blue-300 text-sm ml-2"
                            title="Descargar PDF del cierre"
                          >
                            📝 PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No hay turnos registrados</p>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {modalType === 'abrir' && '🔓 Abrir Caja'}
                {modalType === 'cerrar' && '🔒 Cerrar Caja'}
                {modalType === 'operacion' && '💰 Registrar Operación'}
                {modalType === 'detalle' && '📊 Detalle del Turno'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Formulario Abrir Caja */}
            {modalType === 'abrir' && (
              <form onSubmit={handleAbrirCaja} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Local Asignado</label>
                  {userLocal ? (
                    <div className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white bg-opacity-50">
                      <span className="text-cyan-400 font-semibold">🏪 {userLocal.nombre}</span>
                      <span className="text-slate-400 text-sm ml-2">(asignado automáticamente)</span>
                    </div>
                  ) : (
                    <div className="w-full px-3 py-2 bg-red-900 border border-red-600 rounded-lg text-red-200">
                      ⚠️ No tienes un local asignado. Contacta al administrador.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Monto Inicial</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formApertura.monto_inicial}
                    onChange={(e) => setFormApertura({ ...formApertura, monto_inicial: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Observaciones</label>
                  <textarea
                    value={formApertura.observaciones_apertura}
                    onChange={(e) => setFormApertura({ ...formApertura, observaciones_apertura: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    rows={3}
                    placeholder="Observaciones opcionales..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={!userLocal}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-semibold"
                  >
                    Abrir Caja
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Formulario Cerrar Caja */}
            {modalType === 'cerrar' && (
              <form onSubmit={handleCerrarCaja} className="space-y-4">
                <div className="bg-slate-700 p-4 rounded-lg mb-4">
                  <h4 className="text-white font-semibold mb-2">Resumen del Turno</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Efectivo Esperado:</span>
                      <span className="text-white font-semibold">
                        {formatCurrency(estadoCaja?.efectivo_esperado || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Efectivo Real Contado *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formCierre.efectivo_real}
                    onChange={(e) => setFormCierre({ ...formCierre, efectivo_real: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                    placeholder="Monto contado físicamente"
                  />
                  {formCierre.efectivo_real > 0 && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-400">Diferencia: </span>
                      <span className={
                        formCierre.efectivo_real - (estadoCaja?.efectivo_esperado || 0) === 0 ? 'text-green-400' :
                        formCierre.efectivo_real - (estadoCaja?.efectivo_esperado || 0) > 0 ? 'text-blue-400' : 'text-red-400'
                      }>
                        {formatCurrency(formCierre.efectivo_real - (estadoCaja?.efectivo_esperado || 0))}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Observaciones de Cierre</label>
                  <textarea
                    value={formCierre.observaciones_cierre}
                    onChange={(e) => setFormCierre({ ...formCierre, observaciones_cierre: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    rows={3}
                    placeholder="Explicar diferencias o incidencias..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-semibold"
                  >
                    Cerrar Caja
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Formulario Operación */}
            {modalType === 'operacion' && (
              <form onSubmit={handleRegistrarOperacion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Operación *</label>
                  <select
                    value={formOperacion.tipo_operacion}
                    onChange={(e) => setFormOperacion({ ...formOperacion, tipo_operacion: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  >
                    <option value="INGRESO">💵 INGRESO - Dinero que entra</option>
                    <option value="EGRESO">💸 EGRESO - Dinero que sale</option>
                    <option value="DEVOLUCION">🔄 DEVOLUCIÓN - Devolución a cliente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Monto *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formOperacion.monto}
                    onChange={(e) => setFormOperacion({ ...formOperacion, monto: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Descripción *</label>
                  <input
                    type="text"
                    value={formOperacion.descripcion}
                    onChange={(e) => setFormOperacion({ ...formOperacion, descripcion: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                    placeholder="Ej: Pago de proveedores, vuelto, etc."
                    maxLength={255}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Medio de Pago</label>
                  <select
                    value={formOperacion.medio_pago_id}
                    onChange={(e) => setFormOperacion({ ...formOperacion, medio_pago_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value={0}>Sin especificar</option>
                    {mediosPago.map(medio => (
                      <option key={medio.id} value={medio.id}>{medio.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Observaciones</label>
                  <textarea
                    value={formOperacion.observaciones}
                    onChange={(e) => setFormOperacion({ ...formOperacion, observaciones: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    rows={3}
                    placeholder="Detalles adicionales..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold"
                  >
                    Registrar Operación
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Detalle del Turno */}
            {modalType === 'detalle' && turnoDetalle && (
              <div className="space-y-4">
                <div className="bg-slate-700 p-4 rounded-lg">
                  <h4 className="text-white font-semibold mb-3">Información del Turno</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Local:</span>
                      <div className="text-white">{turnoDetalle.local_nombre}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Estado:</span>
                      <div className="text-white">{turnoDetalle.estado}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Apertura:</span>
                      <div className="text-white">{formatDateTime(turnoDetalle.fecha_apertura)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Cierre:</span>
                      <div className="text-white">
                        {turnoDetalle.fecha_cierre ? formatDateTime(turnoDetalle.fecha_cierre) : 'Aún abierto'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-700 p-4 rounded-lg">
                  <h4 className="text-white font-semibold mb-3">Resumen Financiero</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Monto Inicial:</span>
                      <div className="text-white">{formatCurrency(turnoDetalle.monto_inicial)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Efectivo Esperado:</span>
                      <div className="text-white">
                        {turnoDetalle.efectivo_esperado ? formatCurrency(turnoDetalle.efectivo_esperado) : '-'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Efectivo Real:</span>
                      <div className="text-white">
                        {turnoDetalle.efectivo_real ? formatCurrency(turnoDetalle.efectivo_real) : '-'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Diferencia:</span>
                      <div className={`${
                        turnoDetalle.diferencia === 0 ? 'text-green-400' : 
                        turnoDetalle.diferencia && turnoDetalle.diferencia > 0 ? 'text-blue-400' : 'text-red-400'
                      }`}>
                        {turnoDetalle.diferencia !== undefined ? formatCurrency(turnoDetalle.diferencia) : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-semibold mb-3">Operaciones ({turnoDetalle.operaciones?.length || 0})</h4>
                  {turnoDetalle.operaciones && turnoDetalle.operaciones.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto bg-slate-700 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-800">
                          <tr className="text-gray-400">
                            <th className="px-3 py-2 text-left">Hora</th>
                            <th className="px-3 py-2 text-left">Tipo</th>
                            <th className="px-3 py-2 text-left">Monto</th>
                            <th className="px-3 py-2 text-left">Medio Pago</th>
                            <th className="px-3 py-2 text-left">Descripción</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-300">
                          {turnoDetalle.operaciones.map((op) => (
                            <tr key={op.id} className="border-t border-slate-600">
                              <td className="px-3 py-2">
                                {new Date(op.fecha_operacion).toLocaleTimeString('es-CL', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  op.tipo_operacion === 'VENTA' ? 'bg-green-600' :
                                  op.tipo_operacion === 'INGRESO' ? 'bg-blue-600' :
                                  op.tipo_operacion === 'EGRESO' ? 'bg-red-600' :
                                  op.tipo_operacion === 'DEVOLUCION' ? 'bg-orange-600' :
                                  'bg-gray-600'
                                }`}>
                                  {op.tipo_operacion}
                                </span>
                              </td>
                              <td className="px-3 py-2">{formatCurrency(op.monto)}</td>
                              <td className="px-3 py-2">
                                {op.medio_pago_nombre ? (
                                  <span className="text-xs bg-slate-600 px-2 py-1 rounded">
                                    {op.medio_pago_nombre}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2">{op.descripcion}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">No hay operaciones registradas</p>
                  )}
                </div>

                <div className="flex justify-between">
                  {/* Botón de PDF solo para turnos cerrados */}
                  {turnoDetalle.estado === 'CERRADO' && (
                    <button
                      onClick={() => descargarPdfCierre(turnoDetalle.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center space-x-2"
                    >
                      <span>📝</span>
                      <span>Descargar PDF</span>
                    </button>
                  )}
                  <div className="flex-1"></div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-6 rounded-lg"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}