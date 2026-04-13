import { useState, useEffect } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { routinesService } from '../../services/routines.service';
import { progressService } from '../../services/progress.service';
import { Rutina, ProgresoRutinaResponse, RutinaDiaEjercicio } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';
import Modal from '../../components/common/Modal';
import VideoModal from '../../components/common/VideoModal';

interface ProgressForm {
  repeticionesRealizadas: string;
  tiempoRealizadoSeg: string;
  completado: boolean;
}

export default function UserRoutinePage() {
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [selectedRutina, setSelectedRutina] = useState<Rutina | null>(null);
  const [progresoData, setProgresoData] = useState<ProgresoRutinaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal de ingreso de progreso
  const [progressModal, setProgressModal] = useState<{ open: boolean; rde: RutinaDiaEjercicio | null; fecha: string }>({ open: false, rde: null, fecha: '' });
  const [progressForm, setProgressForm] = useState<ProgressForm>({ repeticionesRealizadas: '', tiempoRealizadoSeg: '', completado: false });
  const [isSavingProgress, setIsSavingProgress] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const ruts = await routinesService.listar();
        setRutinas(ruts);
        if (ruts.length > 0) {
          await loadProgreso(ruts[0]);
        }
      } catch { setError('Error al cargar tus rutinas'); }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  const loadProgreso = async (rutina: Rutina) => {
    setSelectedRutina(rutina);
    try {
      const data = await progressService.obtenerPorRutina(rutina.id);
      setProgresoData(data);
    } catch { setError('Error al cargar el progreso'); }
  };

  const openProgressModal = (rde: RutinaDiaEjercicio, fecha: string) => {
    const existing = progresoData?.progresosMap[rde.id];
    setProgressForm({
      repeticionesRealizadas: existing?.repeticionesRealizadas?.toString() || '',
      tiempoRealizadoSeg: existing?.tiempoRealizadoSeg?.toString() || '',
      completado: existing?.completado || false,
    });
    setProgressModal({ open: true, rde, fecha });
  };

  const handleSaveProgress = async () => {
    if (!progressModal.rde) return;
    setIsSavingProgress(true);
    try {
      await progressService.registrar({
        rutinaDiaEjercicioId: progressModal.rde.id,
        fecha: progressModal.fecha.slice(0, 10),
        repeticionesRealizadas: progressForm.repeticionesRealizadas ? parseInt(progressForm.repeticionesRealizadas) : undefined,
        tiempoRealizadoSeg: progressForm.tiempoRealizadoSeg ? parseInt(progressForm.tiempoRealizadoSeg) : undefined,
        completado: progressForm.completado,
      });
      setProgressModal({ open: false, rde: null, fecha: '' });
      setSuccess('Progreso guardado');
      if (selectedRutina) await loadProgreso(selectedRutina);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Error al guardar progreso');
    } finally {
      setIsSavingProgress(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900">Mi Rutina</h1>
        <p className="text-dark-500 mt-0.5">Registra tu progreso día a día</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {rutinas.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🏋️</div>
          <p className="text-dark-500">Aún no tienes una rutina asignada.</p>
          <p className="text-dark-400 text-sm mt-1">Tu coach te asignará una pronto.</p>
        </div>
      ) : (
        <>
          {/* Selector de rutina */}
          {rutinas.length > 1 && (
            <div className="card mb-4">
              <label className="input-label">Seleccionar rutina</label>
              <select
                value={selectedRutina?.id}
                onChange={(e) => {
                  const r = rutinas.find((x) => x.id === parseInt(e.target.value));
                  if (r) loadProgreso(r);
                }}
                className="input-field"
              >
                {rutinas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.tipoPeriodo} — {format(parseISO(r.fechaInicio), 'dd/MM/yyyy')} al {format(parseISO(r.fechaFin), 'dd/MM/yyyy')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Barra de progreso */}
          {progresoData && (() => {
            const esRutinaAntigua = new Date() > addDays(parseISO(progresoData.rutina.fechaFin), 7);
            return (
              <div className="card mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-dark-900">Progreso de la rutina</h2>
                      {esRutinaAntigua && (
                        <span className="text-xs bg-dark-100 text-dark-500 px-2 py-0.5 rounded-full">Solo lectura</span>
                      )}
                    </div>
                    <p className="text-sm text-dark-500 mt-0.5">
                      {progresoData.completados} de {progresoData.totalEjercicios} ejercicios completados
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-bold text-primary-600">{progresoData.porcentaje}%</span>
                  </div>
                </div>
                <div className="w-full bg-dark-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-4 rounded-full transition-all duration-500"
                    style={{ width: `${progresoData.porcentaje}%`, background: `linear-gradient(90deg, #3b82f6, #f97316)` }}
                  />
                </div>
                {progresoData.rutina.nota !== null && progresoData.rutina.nota !== undefined && (
                  <div className="mt-4 pt-3 border-t border-dark-100 flex items-center gap-3">
                    <span className="text-sm font-medium text-dark-600">Nota del coach:</span>
                    <span className={`text-2xl font-bold px-3 py-0.5 rounded-lg ${progresoData.rutina.nota >= 4 ? 'bg-green-100 text-green-700' : progresoData.rutina.nota >= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {progresoData.rutina.nota.toFixed(1)}
                    </span>
                    <span className="text-xs text-dark-400">/ 7.0</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Días */}
          {progresoData && (
            <div className="space-y-4">
              {(() => {
                const esRutinaAntigua = new Date() > addDays(parseISO(progresoData.rutina.fechaFin), 7);
                return progresoData.rutina.dias.map((dia) => {
                const diaDate = parseISO(dia.fecha);
                const completadosDia = dia.ejercicios.filter((e) => progresoData.progresosMap[e.id]?.completado).length;
                const today = new Date();
                const isToday = format(diaDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

                return (
                  <div key={dia.id} className={`card ${isToday ? 'ring-2 ring-primary-400' : ''}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-dark-900 capitalize">
                            {format(diaDate, "EEEE d 'de' MMMM", { locale: es })}
                          </h3>
                          {isToday && (
                            <span className="text-xs bg-accent-500 text-white px-2 py-0.5 rounded-full font-medium">Hoy</span>
                          )}
                        </div>
                        <p className="text-xs text-dark-400 mt-0.5">{completadosDia}/{dia.ejercicios.length} completados</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 relative">
                          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" strokeWidth="3"
                              strokeDasharray={`${dia.ejercicios.length > 0 ? (completadosDia / dia.ejercicios.length) * 100 : 0} 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary-600">
                            {dia.ejercicios.length > 0 ? Math.round((completadosDia / dia.ejercicios.length) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {dia.ejercicios.map((rde) => {
                        const prog = progresoData.progresosMap[rde.id];
                        const isCompleted = prog?.completado;

                        return (
                          <div key={rde.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-dark-50 border-dark-100'}`}>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${isCompleted ? 'bg-green-500 text-white' : 'bg-white border-2 border-dark-200 text-dark-500'}`}>
                              {isCompleted ? '✓' : rde.orden}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-dark-900">{rde.ejercicio.titulo}</p>
                              {rde.ejercicio.descripcion && (
                                <p className="text-xs text-dark-400 mt-0.5 line-clamp-1">{rde.ejercicio.descripcion}</p>
                              )}
                              <div className="flex flex-wrap gap-3 mt-1 text-xs">
                                {rde.repeticionesObj && <span className="text-dark-500">Meta: {rde.repeticionesObj} reps</span>}
                                {rde.tiempoObjetivoSeg && <span className="text-dark-500">Meta: {rde.tiempoObjetivoSeg}s</span>}
                                {prog?.repeticionesRealizadas != null && (
                                  <span className="text-green-600 font-medium">✓ {prog.repeticionesRealizadas} reps</span>
                                )}
                                {prog?.tiempoRealizadoSeg != null && (
                                  <span className="text-green-600 font-medium">✓ {prog.tiempoRealizadoSeg}s</span>
                                )}
                              </div>
                              {rde.comentarioCoach && (
                                <p className="text-xs text-accent-600 mt-1 italic">💬 {rde.comentarioCoach}</p>
                              )}

                              {/* Video */}
                              {rde.ejercicio.videoUrl && (
                                <div className="mt-2">
                                  <VideoModal
                                    url={rde.ejercicio.videoUrl}
                                    title={rde.ejercicio.titulo}
                                  />
                                </div>
                              )}
                            </div>

                            {!esRutinaAntigua && (
                              <button
                                onClick={() => openProgressModal(rde, dia.fecha)}
                                className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                  isCompleted
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                                }`}
                              >
                                {isCompleted ? 'Editar' : 'Registrar'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
              })()}
            </div>
          )}
        </>
      )}

      {/* Modal de registro de progreso */}
      <Modal
        isOpen={progressModal.open}
        onClose={() => setProgressModal({ open: false, rde: null, fecha: '' })}
        title={`Registrar progreso — ${progressModal.rde?.ejercicio.titulo}`}
        size="sm"
      >
        <div className="space-y-4 mt-2">
          <div>
            <label className="input-label">Repeticiones realizadas</label>
            <input
              type="number"
              min={0}
              value={progressForm.repeticionesRealizadas}
              onChange={(e) => setProgressForm({ ...progressForm, repeticionesRealizadas: e.target.value })}
              className="input-field"
              placeholder="Ej: 12"
            />
          </div>
          <div>
            <label className="input-label">Tiempo realizado (segundos)</label>
            <input
              type="number"
              min={0}
              value={progressForm.tiempoRealizadoSeg}
              onChange={(e) => setProgressForm({ ...progressForm, tiempoRealizadoSeg: e.target.value })}
              className="input-field"
              placeholder="Ej: 45"
            />
          </div>
          <div className="flex items-center gap-3 p-3 bg-dark-50 rounded-xl">
            <input
              type="checkbox"
              id="completado"
              checked={progressForm.completado}
              onChange={(e) => setProgressForm({ ...progressForm, completado: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <label htmlFor="completado" className="text-sm font-medium text-dark-700 cursor-pointer">
              Marcar como completado
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSaveProgress} disabled={isSavingProgress} className="btn-primary flex-1">
              {isSavingProgress ? 'Guardando...' : 'Guardar progreso'}
            </button>
            <button onClick={() => setProgressModal({ open: false, rde: null, fecha: '' })} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
