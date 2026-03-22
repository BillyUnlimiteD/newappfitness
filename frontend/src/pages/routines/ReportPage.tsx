import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { usersService } from '../../services/users.service';
import { routinesService } from '../../services/routines.service';
import { progressService } from '../../services/progress.service';
import { Usuario, Rutina } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';

export default function ReportPage() {
  const [myUsers, setMyUsers] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Selección multi-usuario
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  // Rutinas por usuario
  const [rutinasPorUsuario, setRutinasPorUsuario] = useState<Record<number, Rutina[]>>({});
  // Rutinas seleccionadas por usuario
  const [selectedRutinas, setSelectedRutinas] = useState<Record<number, Set<number>>>({});
  const [loadingRutinas, setLoadingRutinas] = useState<Set<number>>(new Set());

  useEffect(() => {
    usersService.misUsuarios()
      .then(setMyUsers)
      .catch(() => setError('Error al cargar usuarios'))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleUser = async (userId: number) => {
    const next = new Set(selectedUserIds);
    if (next.has(userId)) {
      next.delete(userId);
      setSelectedUserIds(next);
      return;
    }
    next.add(userId);
    setSelectedUserIds(next);

    if (!rutinasPorUsuario[userId]) {
      setLoadingRutinas((p) => new Set(p).add(userId));
      try {
        const ruts = await routinesService.listar(userId);
        setRutinasPorUsuario((p) => ({ ...p, [userId]: ruts }));
        // Seleccionar todas por defecto
        setSelectedRutinas((p) => ({ ...p, [userId]: new Set(ruts.map((r) => r.id)) }));
      } catch { setError('Error al cargar rutinas'); }
      finally {
        setLoadingRutinas((p) => { const s = new Set(p); s.delete(userId); return s; });
      }
    }
  };

  const toggleRutina = (userId: number, rutinaId: number) => {
    setSelectedRutinas((prev) => {
      const set = new Set(prev[userId] || []);
      if (set.has(rutinaId)) set.delete(rutinaId); else set.add(rutinaId);
      return { ...prev, [userId]: set };
    });
  };

  const handleExport = async () => {
    if (selectedUserIds.size === 0) { setError('Selecciona al menos un usuario'); return; }
    setIsGenerating(true);
    setError('');

    try {
      const wb = XLSX.utils.book_new();

      for (const userId of selectedUserIds) {
        const user = myUsers.find((u) => u.id === userId);
        if (!user) continue;
        const rutinas = rutinasPorUsuario[userId] || [];
        const selRuts = selectedRutinas[userId] || new Set();
        const rutinasSeleccionadas = rutinas.filter((r) => selRuts.has(r.id));
        if (rutinasSeleccionadas.length === 0) continue;

        const rows: Record<string, string | number>[] = [];

        for (const rutina of rutinasSeleccionadas) {
          const progreso = await progressService.obtenerPorRutina(rutina.id);

          for (const dia of progreso.rutina.dias) {
            for (const rde of dia.ejercicios) {
              const prog = progreso.progresosMap[rde.id];
              rows.push({
                'Usuario': `${user.nombre || ''} ${user.apellido || ''}`.trim(),
                'Correo': user.correo,
                'Período': rutina.tipoPeriodo,
                'Rutina Inicio': format(parseISO(rutina.fechaInicio), 'dd/MM/yyyy'),
                'Rutina Fin': format(parseISO(rutina.fechaFin), 'dd/MM/yyyy'),
                'Nota Coach': rutina.nota != null ? rutina.nota : 'Sin calificar',
                '% Progreso Rutina': `${progreso.porcentaje}%`,
                'Día': format(parseISO(dia.fecha), "EEEE d 'de' MMMM yyyy", { locale: es }),
                'Orden': rde.orden,
                'Ejercicio': rde.ejercicio.titulo,
                'Meta Repeticiones': rde.repeticionesObj ?? '',
                'Meta Tiempo (seg)': rde.tiempoObjetivoSeg ?? '',
                'Reps Realizadas': prog?.repeticionesRealizadas ?? '',
                'Tiempo Realizado (seg)': prog?.tiempoRealizadoSeg ?? '',
                'Completado': prog?.completado ? 'Sí' : 'No',
                'Comentario Coach': rde.comentarioCoach ?? '',
              });
            }
          }
        }

        if (rows.length === 0) continue;

        const sheetName = (`${user.nombre || ''} ${user.apellido || ''}`.trim() || user.correo).slice(0, 31);
        const ws = XLSX.utils.json_to_sheet(rows);

        // Ancho de columnas
        ws['!cols'] = [
          { wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
          { wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 6 }, { wch: 25 },
          { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 22 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      if (wb.SheetNames.length === 0) {
        setError('No hay datos para exportar con las rutinas seleccionadas');
        return;
      }

      const fecha = format(new Date(), 'yyyy-MM-dd');
      XLSX.writeFile(wb, `reporte_rutinas_${fecha}.xlsx`);
    } catch {
      setError('Error al generar el reporte');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const totalRutinasSeleccionadas = Array.from(selectedUserIds).reduce(
    (acc, uid) => acc + (selectedRutinas[uid]?.size || 0), 0
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900">Reporte de Progreso</h1>
        <p className="text-dark-500 mt-0.5">Exporta el avance de tus usuarios en formato Excel</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Listado de usuarios */}
        <div className="lg:col-span-2 space-y-3">
          {myUsers.length === 0 ? (
            <div className="card text-center py-12 text-dark-400">No tienes usuarios asignados</div>
          ) : (
            myUsers.map((u) => {
              const isSelected = selectedUserIds.has(u.id);
              const rutinas = rutinasPorUsuario[u.id] || [];
              const isLoadingRuts = loadingRutinas.has(u.id);

              return (
                <div key={u.id} className={`card transition-all ${isSelected ? 'ring-2 ring-primary-400' : ''}`}>
                  {/* Cabecera usuario */}
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleUser(u.id)}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-dark-300'}`}>
                      {isSelected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-dark-900">{u.nombre} {u.apellido}</p>
                      <p className="text-sm text-dark-400">{u.correo}</p>
                    </div>
                    {isLoadingRuts && <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />}
                  </div>

                  {/* Rutinas del usuario */}
                  {isSelected && !isLoadingRuts && (
                    <div className="mt-3 pt-3 border-t border-dark-100 space-y-2">
                      {rutinas.length === 0 ? (
                        <p className="text-sm text-dark-400 italic">Sin rutinas asignadas</p>
                      ) : (
                        <>
                          <p className="text-xs font-medium text-dark-500 uppercase tracking-wide">Rutinas a incluir:</p>
                          {rutinas.map((r) => {
                            const checked = selectedRutinas[u.id]?.has(r.id) ?? false;
                            return (
                              <label key={r.id} className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleRutina(u.id, r.id)}
                                  className="w-4 h-4 text-primary-600 rounded"
                                />
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.tipoPeriodo === 'SEMANAL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                  {r.tipoPeriodo}
                                </span>
                                <span className="text-dark-700">
                                  {format(parseISO(r.fechaInicio), 'dd/MM/yyyy')} — {format(parseISO(r.fechaFin), 'dd/MM/yyyy')}
                                </span>
                                {r.nota != null && (
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${r.nota >= 4 ? 'bg-green-100 text-green-700' : r.nota >= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                    {r.nota.toFixed(1)}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Panel de exportación */}
        <div>
          <div className="card sticky top-6">
            <h2 className="font-semibold text-dark-900 mb-4">Exportar</h2>
            <div className="space-y-2 text-sm text-dark-600 mb-6">
              <div className="flex justify-between">
                <span>Usuarios seleccionados</span>
                <span className="font-bold text-dark-900">{selectedUserIds.size}</span>
              </div>
              <div className="flex justify-between">
                <span>Rutinas incluidas</span>
                <span className="font-bold text-dark-900">{totalRutinasSeleccionadas}</span>
              </div>
            </div>
            <p className="text-xs text-dark-400 mb-4">
              Se generará un archivo Excel con una hoja por usuario, incluyendo el detalle de cada ejercicio y el progreso registrado.
            </p>
            <button
              onClick={handleExport}
              disabled={isGenerating || selectedUserIds.size === 0}
              className="btn-primary w-full"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generando...
                </span>
              ) : (
                'Descargar reporte Excel'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
