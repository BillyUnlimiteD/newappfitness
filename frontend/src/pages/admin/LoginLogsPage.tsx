import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { ApiResponse } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';

interface LoginLog {
  id: number;
  correo: string;
  ip: string;
  motivo: string;
  intentos: number | null;
  creadoEn: string;
}

interface LogsResponse {
  logs: LoginLog[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

const MOTIVO_LABELS: Record<string, { label: string; color: string }> = {
  USUARIO_NO_EXISTE:      { label: 'Usuario no existe',        color: 'bg-gray-100 text-gray-700' },
  CONTRASENA_INCORRECTA:  { label: 'Contraseña incorrecta',    color: 'bg-yellow-100 text-yellow-800' },
  CUENTA_BLOQUEADA:       { label: 'Cuenta bloqueada',         color: 'bg-red-100 text-red-700' },
  BLOQUEADO_POR_INTENTOS: { label: 'Bloqueado por intentos',   color: 'bg-red-200 text-red-900' },
};

export default function LoginLogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroCorreo, setFiltroCorreo] = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState('');
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { pagina };
      if (filtroCorreo) params.correo = filtroCorreo;
      if (filtroMotivo) params.motivo = filtroMotivo;
      const { data: res } = await api.get<ApiResponse<LogsResponse>>('/admin/login-logs', { params });
      setData(res.data!);
    } catch {
      setError('Error al cargar los logs');
    } finally {
      setIsLoading(false);
    }
  }, [filtroCorreo, filtroMotivo, pagina]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    cargar();
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900">Logs de Intentos de Login</h1>
        <p className="text-dark-500 mt-0.5">Últimos 30 días · {data?.total ?? 0} registros</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Filtros */}
      <div className="card mb-4">
        <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={filtroCorreo}
            onChange={(e) => setFiltroCorreo(e.target.value)}
            placeholder="Filtrar por correo..."
            className="input-field flex-1"
          />
          <select
            value={filtroMotivo}
            onChange={(e) => setFiltroMotivo(e.target.value)}
            className="input-field sm:w-56"
          >
            <option value="">Todos los motivos</option>
            {Object.entries(MOTIVO_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary sm:w-32">Buscar</button>
        </form>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dark-50 border-b border-dark-100">
                    <th className="text-left px-4 py-3 font-semibold text-dark-600">Fecha y hora</th>
                    <th className="text-left px-4 py-3 font-semibold text-dark-600">Correo ingresado</th>
                    <th className="text-left px-4 py-3 font-semibold text-dark-600">IP</th>
                    <th className="text-left px-4 py-3 font-semibold text-dark-600">Motivo</th>
                    <th className="text-left px-4 py-3 font-semibold text-dark-600">Intentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-50">
                  {data?.logs.map((log) => {
                    const motivo = MOTIVO_LABELS[log.motivo] ?? { label: log.motivo, color: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={log.id} className="hover:bg-dark-50/50 transition-colors">
                        <td className="px-4 py-3 text-dark-600 whitespace-nowrap">
                          {new Date(log.creadoEn).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'medium' })}
                        </td>
                        <td className="px-4 py-3 font-medium text-dark-900">{log.correo}</td>
                        <td className="px-4 py-3 font-mono text-dark-500">{log.ip}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${motivo.color}`}>
                            {motivo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-dark-500">
                          {log.intentos != null ? (
                            <span className={`font-semibold ${log.intentos >= 8 ? 'text-red-600' : log.intentos >= 5 ? 'text-yellow-600' : 'text-dark-500'}`}>
                              {log.intentos} / 10
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {data?.logs.length === 0 && (
                <div className="text-center py-12 text-dark-400">No se encontraron registros</div>
              )}
            </div>
          </div>

          {/* Paginación */}
          {data && data.totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-dark-500">
                Página {data.pagina} de {data.totalPaginas}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagina((p) => Math.min(data.totalPaginas, p + 1))}
                  disabled={pagina === data.totalPaginas}
                  className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
