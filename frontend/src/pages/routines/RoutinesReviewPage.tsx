import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { usersService } from '../../services/users.service';
import { routinesService } from '../../services/routines.service';
import { progressService } from '../../services/progress.service';
import { Usuario, Rutina, ProgresoRutinaResponse } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';

export default function RoutinesReviewPage() {
  const [myUsers, setMyUsers] = useState<Usuario[]>([]);
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [selectedUser, setSelectedUser] = useState<number>(0);
  const [selectedRutina, setSelectedRutina] = useState<number>(0);
  const [progresoData, setProgresoData] = useState<ProgresoRutinaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProgreso, setIsLoadingProgreso] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Nota
  const [notaInput, setNotaInput] = useState('');
  const [isSavingNota, setIsSavingNota] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const users = await usersService.misUsuarios();
        setMyUsers(users);
      } catch { setError('Error al cargar usuarios'); }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  const handleUserChange = async (userId: number) => {
    setSelectedUser(userId);
    setSelectedRutina(0);
    setProgresoData(null);
    if (!userId) return;
    try {
      const ruts = await routinesService.listar(userId);
      setRutinas(ruts);
    } catch { setError('Error al cargar rutinas'); }
  };

  const handleRutinaChange = async (rutinaId: number) => {
    setSelectedRutina(rutinaId);
    setProgresoData(null);
    setNotaInput('');
    if (!rutinaId) return;
    setIsLoadingProgreso(true);
    try {
      const data = await progressService.obtenerPorRutina(rutinaId);
      setProgresoData(data);
      setNotaInput(data.rutina.nota?.toString() || '');
    } catch { setError('Error al cargar progreso'); }
    finally { setIsLoadingProgreso(false); }
  };

  const handleCalificar = async () => {
    if (!selectedRutina) return;
    const nota = parseFloat(notaInput);
    if (isNaN(nota) || nota < 1 || nota > 7) { setError('La nota debe estar entre 1.0 y 7.0'); return; }
    setIsSavingNota(true);
    try {
      await routinesService.calificar(selectedRutina, nota);
      setProgresoData((prev) => prev ? { ...prev, rutina: { ...prev.rutina, nota } } : prev);
      setSuccess(`Nota ${nota.toFixed(1)} guardada correctamente`);
    } catch { setError('Error al guardar la nota'); }
    finally { setIsSavingNota(false); }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900">Seguimiento de Rutinas</h1>
        <p className="text-dark-500 mt-0.5">Revisa el progreso de tus usuarios</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Seleccionar usuario</label>
            <select value={selectedUser} onChange={(e) => handleUserChange(parseInt(e.target.value))} className="input-field">
              <option value={0}>Selecciona un usuario</option>
              {myUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Seleccionar rutina</label>
            <select value={selectedRutina} onChange={(e) => handleRutinaChange(parseInt(e.target.value))} className="input-field" disabled={!selectedUser}>
              <option value={0}>Selecciona una rutina</option>
              {rutinas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.tipoPeriodo} — {format(parseISO(r.fechaInicio), 'dd/MM/yyyy')} al {format(parseISO(r.fechaFin), 'dd/MM/yyyy')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoadingProgreso && <LoadingSpinner />}

      {progresoData && !isLoadingProgreso && (
        <div>
          {/* Barra de progreso general + Nota */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-dark-900">Progreso general</h2>
              <span className="text-3xl font-bold text-primary-600">{progresoData.porcentaje}%</span>
            </div>
            <div className="w-full bg-dark-100 rounded-full h-3 mb-2">
              <div
                className="bg-primary-600 rounded-full h-3 transition-all"
                style={{ width: `${progresoData.porcentaje}%` }}
              />
            </div>
            <p className="text-sm text-dark-500">
              {progresoData.completados} de {progresoData.totalEjercicios} ejercicios completados
            </p>

            {/* Calificación */}
            <div className="flex items-center gap-3 pt-4 mt-4 border-t border-dark-100">
              <span className="text-sm font-medium text-dark-700 flex-shrink-0">Nota:</span>
              {progresoData.rutina.nota != null && (
                <span className={`text-xl font-bold px-3 py-0.5 rounded-lg ${progresoData.rutina.nota >= 4 ? 'bg-green-100 text-green-700' : progresoData.rutina.nota >= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {progresoData.rutina.nota.toFixed(1)}
                </span>
              )}
              {progresoData.rutina.nota == null && (
                <span className="text-sm text-dark-400 italic">Sin calificar</span>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="number"
                  min={1}
                  max={7}
                  step={0.5}
                  placeholder="1.0 – 7.0"
                  value={notaInput}
                  onChange={(e) => setNotaInput(e.target.value)}
                  className="input-field w-24 text-center py-1.5"
                />
                <button
                  onClick={handleCalificar}
                  disabled={isSavingNota}
                  className="btn-primary text-sm py-1.5 px-3"
                >
                  {isSavingNota ? 'Guardando...' : progresoData.rutina.nota != null ? 'Actualizar' : 'Calificar'}
                </button>
              </div>
            </div>
          </div>

          {/* Días de la rutina */}
          <div className="space-y-4">
            {progresoData.rutina.dias.map((dia) => {
              const diaDate = parseISO(dia.fecha);
              const completadosDia = dia.ejercicios.filter((e) => progresoData.progresosMap[e.id]?.completado).length;

              return (
                <div key={dia.id} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-dark-900 capitalize">
                        {format(diaDate, "EEEE d 'de' MMMM", { locale: es })}
                      </h3>
                      <p className="text-xs text-dark-400 mt-0.5">{completadosDia}/{dia.ejercicios.length} ejercicios</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-primary-600">
                        {dia.ejercicios.length > 0 ? Math.round((completadosDia / dia.ejercicios.length) * 100) : 0}%
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {dia.ejercicios.map((rde) => {
                      const prog = progresoData.progresosMap[rde.id];
                      return (
                        <div key={rde.id} className={`flex items-start gap-3 p-3 rounded-xl border ${prog?.completado ? 'bg-green-50 border-green-200' : 'bg-dark-50 border-dark-100'}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${prog?.completado ? 'bg-green-500 text-white' : 'bg-dark-200 text-dark-500'}`}>
                            {prog?.completado ? '✓' : rde.orden}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-dark-900 text-sm">{rde.ejercicio.titulo}</p>
                            <div className="flex flex-wrap gap-3 mt-1 text-xs text-dark-500">
                              {rde.repeticionesObj && <span>Objetivo: {rde.repeticionesObj} reps</span>}
                              {rde.tiempoObjetivoSeg && <span>Objetivo: {rde.tiempoObjetivoSeg}s</span>}
                              {prog?.repeticionesRealizadas != null && (
                                <span className="text-primary-600 font-medium">✓ {prog.repeticionesRealizadas} reps realizadas</span>
                              )}
                              {prog?.tiempoRealizadoSeg != null && (
                                <span className="text-primary-600 font-medium">✓ {prog.tiempoRealizadoSeg}s realizados</span>
                              )}
                            </div>
                            {rde.comentarioCoach && (
                              <p className="text-xs text-accent-600 mt-1 italic">💬 {rde.comentarioCoach}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedUser > 0 && selectedRutina === 0 && rutinas.length === 0 && (
        <div className="card text-center text-dark-400 py-8">
          Este usuario no tiene rutinas asignadas
        </div>
      )}
    </div>
  );
}
