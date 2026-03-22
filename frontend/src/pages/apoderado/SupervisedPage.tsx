import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { routinesService } from '../../services/routines.service';
import { progressService } from '../../services/progress.service';
import { usersService } from '../../services/users.service';
import { Rutina, ProgresoRutinaResponse } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';
import Modal from '../../components/common/Modal';

export default function SupervisedPage() {
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [selectedRutina, setSelectedRutina] = useState<number>(0);
  const [progresoData, setProgresoData] = useState<ProgresoRutinaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal lesiones
  const [lesionesModal, setLesionesModal] = useState<{
    isOpen: boolean; supervisadoId: number | null; nombre: string; texto: string;
  }>({ isOpen: false, supervisadoId: null, nombre: '', texto: '' });
  const [isSavingLesiones, setIsSavingLesiones] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await routinesService.listar();
        setRutinas(data);
      } catch { setError('Error al cargar información'); }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  const handleRutinaChange = async (rutinaId: number) => {
    setSelectedRutina(rutinaId);
    setProgresoData(null);
    if (!rutinaId) return;
    setIsLoadingProgress(true);
    try {
      const data = await progressService.obtenerPorRutina(rutinaId);
      setProgresoData(data);
    } catch { setError('Error al cargar progreso'); }
    finally { setIsLoadingProgress(false); }
  };

  const handleSaveLesiones = async () => {
    if (!lesionesModal.supervisadoId) return;
    setIsSavingLesiones(true);
    try {
      await usersService.actualizarLesiones(lesionesModal.supervisadoId, lesionesModal.texto);
      setSuccess('Información de lesiones actualizada');
      setLesionesModal((p) => ({ ...p, isOpen: false }));
    } catch {
      setError('Error al guardar lesiones');
    } finally {
      setIsSavingLesiones(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  // Agrupar rutinas por usuario
  const rutinasPorUsuario: Record<string, Rutina[]> = {};
  rutinas.forEach((r) => {
    const key = r.usuario ? `${r.usuario.nombre} ${r.usuario.apellido}` : `Usuario ${r.usuarioId}`;
    if (!rutinasPorUsuario[key]) rutinasPorUsuario[key] = [];
    rutinasPorUsuario[key].push(r);
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900">Supervisados</h1>
        <p className="text-dark-500 mt-0.5">Seguimiento del progreso de tus supervisados</p>
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {rutinas.length === 0 ? (
        <div className="card text-center py-12 text-dark-400">
          No tienes supervisados con rutinas asignadas
        </div>
      ) : (
        <div className="space-y-6">
          {/* Botones de lesiones por supervisado */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(rutinasPorUsuario).map(([userName, ruts]) => (
              <button
                key={userName}
                onClick={() => setLesionesModal({
                  isOpen: true,
                  supervisadoId: ruts[0].usuarioId,
                  nombre: userName,
                  texto: '',
                })}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                Lesiones de {userName}
              </button>
            ))}
          </div>

          {/* Selector rutina */}
          <div className="card">
            <label className="input-label">Seleccionar rutina del supervisado</label>
            <select value={selectedRutina} onChange={(e) => handleRutinaChange(parseInt(e.target.value))} className="input-field">
              <option value={0}>Selecciona una rutina</option>
              {Object.entries(rutinasPorUsuario).map(([userName, ruts]) => (
                <optgroup key={userName} label={userName}>
                  {ruts.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.tipoPeriodo} — {format(parseISO(r.fechaInicio), 'dd/MM/yyyy')} al {format(parseISO(r.fechaFin), 'dd/MM/yyyy')}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {isLoadingProgress && <LoadingSpinner />}

          {progresoData && !isLoadingProgress && (
            <div>
              {/* Encabezado */}
              <div className="card mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-dark-900">
                      {progresoData.rutina.usuario?.nombre} {progresoData.rutina.usuario?.apellido}
                    </h2>
                    <p className="text-sm text-dark-500 mt-0.5">
                      Rutina {progresoData.rutina.tipoPeriodo.toLowerCase()} —
                      Coach: {progresoData.rutina.coach?.nombre} {progresoData.rutina.coach?.apellido}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-primary-600">{progresoData.porcentaje}%</span>
                    <p className="text-xs text-dark-400">{progresoData.completados}/{progresoData.totalEjercicios}</p>
                  </div>
                </div>
                <div className="w-full bg-dark-100 rounded-full h-3 mt-3">
                  <div className="bg-primary-600 rounded-full h-3 transition-all" style={{ width: `${progresoData.porcentaje}%` }} />
                </div>
                {progresoData.rutina.nota !== null && progresoData.rutina.nota !== undefined && (
                  <div className="mt-3 pt-3 border-t border-dark-100 flex items-center gap-3">
                    <span className="text-sm font-medium text-dark-600">Nota del coach:</span>
                    <span className={`text-xl font-bold px-3 py-0.5 rounded-lg ${progresoData.rutina.nota >= 4 ? 'bg-green-100 text-green-700' : progresoData.rutina.nota >= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {progresoData.rutina.nota.toFixed(1)}
                    </span>
                    <span className="text-xs text-dark-400">/ 7.0</span>
                  </div>
                )}
              </div>

              {/* Días — solo lectura */}
              <div className="space-y-4">
                {progresoData.rutina.dias.map((dia) => (
                  <div key={dia.id} className="card">
                    <h3 className="font-semibold text-dark-900 mb-3 capitalize">
                      {format(parseISO(dia.fecha), "EEEE d 'de' MMMM", { locale: es })}
                    </h3>
                    <div className="space-y-2">
                      {dia.ejercicios.map((rde) => {
                        const prog = progresoData.progresosMap[rde.id];
                        return (
                          <div key={rde.id} className={`flex items-center gap-3 p-3 rounded-xl border ${prog?.completado ? 'bg-green-50 border-green-200' : 'bg-dark-50 border-dark-100'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${prog?.completado ? 'bg-green-500 text-white' : 'bg-dark-200 text-dark-500'}`}>
                              {prog?.completado ? '✓' : rde.orden}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-dark-900">{rde.ejercicio.titulo}</p>
                              <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-dark-400">
                                {rde.repeticionesObj && <span>Meta: {rde.repeticionesObj} reps</span>}
                                {rde.tiempoObjetivoSeg && <span>Meta: {rde.tiempoObjetivoSeg}s</span>}
                                {prog?.repeticionesRealizadas != null && <span className="text-green-600">{prog.repeticionesRealizadas} reps realizadas</span>}
                                {prog?.tiempoRealizadoSeg != null && <span className="text-green-600">{prog.tiempoRealizadoSeg}s realizados</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal lesiones */}
      <Modal
        isOpen={lesionesModal.isOpen}
        onClose={() => setLesionesModal((p) => ({ ...p, isOpen: false }))}
        title={`Lesiones de ${lesionesModal.nombre}`}
      >
        <div className="space-y-3 mt-2">
          <p className="text-sm text-dark-500">Registra lesiones, malformaciones o condiciones físicas relevantes para el entrenamiento.</p>
          <textarea
            value={lesionesModal.texto}
            onChange={(e) => setLesionesModal((p) => ({ ...p, texto: e.target.value }))}
            className="input-field min-h-[120px] resize-y"
            placeholder="Ej: Lesión de rodilla derecha, escoliosis leve..."
          />
          <div className="flex gap-3">
            <button onClick={handleSaveLesiones} disabled={isSavingLesiones} className="btn-primary flex-1">
              {isSavingLesiones ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setLesionesModal((p) => ({ ...p, isOpen: false }))} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
