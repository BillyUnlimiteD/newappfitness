import { useState, useEffect, useCallback } from 'react';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { coursesService } from '../../services/courses.service';
import {
  Curso,
  RutinaCurso,
  RutinaCursoDiaEjercicio,
  ProgresoEjercicioCurso,
} from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';
import Modal from '../../components/common/Modal';

const DIAS_SEMANA_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Calcula la fecha real de un día dado el inicio del curso y el número de semana/día.
// Ancla al lunes de la semana que contiene fechaInicio para que diaSemana=1 siempre
// sea lunes, independientemente del día en que arranque el curso.
function calcFecha(fechaInicio: string, semana: number, diaSemana: number): Date {
  const base = new Date(fechaInicio);
  // getDay(): 0=Dom, 1=Lun, ..., 6=Sáb → convertimos a 1=Lun...7=Dom
  const diaSemanaBase = base.getDay();
  const offsetAlLunes = diaSemanaBase === 0 ? -6 : 1 - diaSemanaBase; // retroceder al lunes
  const lunesSemana1 = addDays(base, offsetAlLunes);
  return addDays(lunesSemana1, (semana - 1) * 7 + (diaSemana - 1));
}

interface ProgressForm {
  repeticionesRealizadas: string;
  tiempoRealizadoSeg: string;
  completado: boolean;
}

export default function UserCoursePage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Curso seleccionado
  const [cursoActivo, setCursoActivo] = useState<Curso | null>(null);
  const [semanaActiva, setSemanaActiva] = useState<RutinaCurso | null>(null);
  const [progresos, setProgresos] = useState<ProgresoEjercicioCurso[]>([]);

  // Modal de progreso
  const [progressModal, setProgressModal] = useState<{
    open: boolean;
    ejercicio: RutinaCursoDiaEjercicio | null;
    fecha: string;
  }>({ open: false, ejercicio: null, fecha: '' });
  const [progressForm, setProgressForm] = useState<ProgressForm>({
    repeticionesRealizadas: '',
    tiempoRealizadoSeg: '',
    completado: false,
  });
  const [savingProgress, setSavingProgress] = useState(false);

  useEffect(() => {
    coursesService
      .listar()
      .then(async (cs) => {
        setCursos(cs);
        if (cs.length === 1) {
          await cargarCurso(cs[0]);
        }
      })
      .catch(() => setError('Error al cargar tus cursos'))
      .finally(() => setLoading(false));
  }, []);

  const cargarCurso = useCallback(async (curso: Curso) => {
    try {
      const [detalle, progresosData] = await Promise.all([
        coursesService.obtener(curso.id),
        coursesService.obtenerMiProgreso(curso.id),
      ]);
      setCursoActivo(detalle);
      setProgresos(progresosData);

      // Seleccionar la semana actual (más cercana a hoy)
      if (detalle.rutinas && detalle.rutinas.length > 0) {
        const hoy = new Date();
        const inicio = new Date(detalle.fechaInicio);
        const diasDesdeInicio = Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
        const semanaHoy = Math.floor(diasDesdeInicio / 7) + 1;
        const semanaEnCurso = detalle.rutinas.find((s) => s.semana === semanaHoy)
          ?? detalle.rutinas[0];
        setSemanaActiva(semanaEnCurso);
      }
    } catch {
      setError('Error al cargar el curso');
    }
  }, []);

  const progresoMap = progresos.reduce<Record<number, ProgresoEjercicioCurso>>((acc, p) => {
    acc[p.rutinaCursoDiaEjercicioId] = p;
    return acc;
  }, {});

  const abrirModalProgreso = (ej: RutinaCursoDiaEjercicio, fecha: Date) => {
    const existing = progresoMap[ej.id];
    setProgressForm({
      repeticionesRealizadas: existing?.repeticionesRealizadas?.toString() ?? '',
      tiempoRealizadoSeg: existing?.tiempoRealizadoSeg?.toString() ?? '',
      completado: existing?.completado ?? false,
    });
    setProgressModal({
      open: true,
      ejercicio: ej,
      fecha: format(fecha, 'yyyy-MM-dd'),
    });
  };

  const guardarProgreso = async () => {
    if (!cursoActivo || !progressModal.ejercicio) return;
    try {
      setSavingProgress(true);
      const saved = await coursesService.guardarProgreso(cursoActivo.id, {
        rutinaCursoDiaEjercicioId: progressModal.ejercicio.id,
        fecha: progressModal.fecha,
        repeticionesRealizadas: progressForm.repeticionesRealizadas
          ? Number(progressForm.repeticionesRealizadas)
          : undefined,
        tiempoRealizadoSeg: progressForm.tiempoRealizadoSeg
          ? Number(progressForm.tiempoRealizadoSeg)
          : undefined,
        completado: progressForm.completado,
      });

      setProgresos((prev) => {
        const filtered = prev.filter((p) => p.rutinaCursoDiaEjercicioId !== saved.rutinaCursoDiaEjercicioId);
        return [...filtered, saved];
      });

      setSuccess(progressForm.completado ? '¡Ejercicio completado!' : 'Progreso guardado');
      setProgressModal({ open: false, ejercicio: null, fecha: '' });
    } catch {
      setError('Error al guardar el progreso');
    } finally {
      setSavingProgress(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  // ── Selección de curso ─────────────────────────────────────────────────────
  if (!cursoActivo) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Mis Cursos</h1>
          <p className="text-dark-500 text-sm mt-1">Selecciona un curso para ver tu rutina</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {cursos.length === 0 ? (
          <div className="card text-center py-12">
            <svg className="w-12 h-12 text-dark-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-dark-400">No estás inscrito en ningún curso</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {cursos.map((c) => (
              <button
                key={c.id}
                onClick={() => cargarCurso(c)}
                className="card text-left hover:border-primary-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-dark-900">{c.nombre}</h3>
                    <p className="text-sm text-dark-500 mt-0.5">
                      Coach: {c.coach.nombre} {c.coach.apellido}
                      &nbsp;·&nbsp;{c.fechaInicio.slice(0, 10)} → {c.fechaFin.slice(0, 10)}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Vista del curso ────────────────────────────────────────────────────────
  const semanas = cursoActivo.rutinas ?? [];
  const totalEjercicios = semanas.reduce(
    (s, sem) => s + sem.dias.reduce((d, dia) => d + dia.ejercicios.length, 0),
    0
  );
  const completados = Object.values(progresoMap).filter((p) => p.completado).length;
  const porcentaje = totalEjercicios > 0 ? Math.round((completados / totalEjercicios) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {cursos.length > 1 && (
          <button
            onClick={() => { setCursoActivo(null); setSemanaActiva(null); }}
            className="p-2 rounded-lg hover:bg-dark-100 transition-colors"
          >
            <svg className="w-5 h-5 text-dark-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-dark-900">{cursoActivo.nombre}</h1>
          <p className="text-dark-500 text-sm">
            Coach: {cursoActivo.coach.nombre} {cursoActivo.coach.apellido}
            &nbsp;·&nbsp;{cursoActivo.fechaInicio.slice(0, 10)} → {cursoActivo.fechaFin.slice(0, 10)}
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Progreso general */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-dark-700">Mi progreso en el curso</span>
          <span className="text-lg font-bold text-primary-600">{porcentaje}%</span>
        </div>
        <div className="w-full bg-dark-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              porcentaje >= 80 ? 'bg-green-500' : porcentaje >= 50 ? 'bg-yellow-400' : 'bg-primary-500'
            }`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <p className="text-xs text-dark-400 mt-2">{completados} de {totalEjercicios} ejercicios completados</p>
      </div>

      {/* Selector de semanas */}
      {semanas.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-dark-400">El coach aún no ha cargado rutinas para este curso.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {semanas.map((s) => (
              <button
                key={s.id}
                onClick={() => setSemanaActiva(s)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  semanaActiva?.id === s.id
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-dark-600 border-dark-200 hover:border-primary-300'
                }`}
              >
                Semana {s.semana}
              </button>
            ))}
          </div>

          {/* Días de la semana activa */}
          {semanaActiva && (
            <div className="space-y-4">
              {semanaActiva.dias.map((dia) => {
                const fechaDia = calcFecha(cursoActivo.fechaInicio, semanaActiva.semana, dia.diaSemana);
                const fechaStr = format(fechaDia, 'yyyy-MM-dd');
                const esHoy = format(new Date(), 'yyyy-MM-dd') === fechaStr;
                const esPasado = fechaDia < new Date();

                const completadosDia = dia.ejercicios.filter(
                  (e) => progresoMap[e.id]?.completado
                ).length;

                return (
                  <div
                    key={dia.id}
                    className={`card ${esHoy ? 'border-primary-300 shadow-md' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-dark-900">
                          {DIAS_SEMANA_FULL[dia.diaSemana - 1]}
                          {esHoy && (
                            <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                              Hoy
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-dark-400">
                          {format(fechaDia, "d 'de' MMMM yyyy", { locale: es })}
                        </p>
                      </div>
                      <span className="text-sm text-dark-500">
                        {completadosDia}/{dia.ejercicios.length}
                        <svg className="inline ml-1 w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    </div>

                    <div className="space-y-2">
                      {dia.ejercicios.map((ej) => {
                        const prog = progresoMap[ej.id];
                        const hecho = prog?.completado ?? false;

                        return (
                          <div
                            key={ej.id}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                              hecho
                                ? 'bg-green-50 border border-green-100'
                                : 'bg-dark-50 border border-dark-100'
                            }`}
                          >
                            {/* Checkbox visual */}
                            <button
                              onClick={() => abrirModalProgreso(ej, fechaDia)}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                hecho
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-dark-300 hover:border-primary-400'
                              }`}
                            >
                              {hecho && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm ${hecho ? 'line-through text-dark-400' : 'text-dark-800'}`}>
                                {ej.ejercicio.titulo}
                              </p>
                              <div className="flex gap-3 text-xs text-dark-400 mt-0.5">
                                {ej.repeticionesObj && <span>{ej.repeticionesObj} reps</span>}
                                {ej.tiempoObjetivoSeg && <span>{ej.tiempoObjetivoSeg}s</span>}
                                {prog?.repeticionesRealizadas && (
                                  <span className="text-green-600">✓ {prog.repeticionesRealizadas} reps</span>
                                )}
                                {prog?.tiempoRealizadoSeg && (
                                  <span className="text-green-600">✓ {prog.tiempoRealizadoSeg}s</span>
                                )}
                              </div>
                              {ej.comentarioCoach && (
                                <p className="text-xs text-dark-400 italic mt-1">
                                  Coach: {ej.comentarioCoach}
                                </p>
                              )}
                            </div>

                            <button
                              onClick={() => abrirModalProgreso(ej, fechaDia)}
                              className="text-dark-400 hover:text-primary-600 p-1 rounded transition-colors flex-shrink-0"
                              title="Registrar progreso"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal de progreso */}
      <Modal
        isOpen={progressModal.open}
        onClose={() => setProgressModal({ open: false, ejercicio: null, fecha: '' })}
        title={progressModal.ejercicio?.ejercicio.titulo ?? 'Registrar Progreso'}
      >
        {progressModal.ejercicio && (
          <div className="space-y-4">
            {progressModal.ejercicio.repeticionesObj && (
              <p className="text-sm text-dark-500">
                Objetivo: <strong>{progressModal.ejercicio.repeticionesObj} repeticiones</strong>
              </p>
            )}
            {progressModal.ejercicio.tiempoObjetivoSeg && (
              <p className="text-sm text-dark-500">
                Objetivo: <strong>{progressModal.ejercicio.tiempoObjetivoSeg} segundos</strong>
              </p>
            )}
            {progressModal.ejercicio.comentarioCoach && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">Nota del coach</p>
                <p className="text-sm text-blue-800">{progressModal.ejercicio.comentarioCoach}</p>
              </div>
            )}

            <div>
              <label className="label">Repeticiones realizadas</label>
              <input
                type="number"
                min={0}
                max={9999}
                className="input"
                placeholder="Ej: 15"
                value={progressForm.repeticionesRealizadas}
                onChange={(e) => setProgressForm({ ...progressForm, repeticionesRealizadas: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Tiempo realizado (segundos)</label>
              <input
                type="number"
                min={0}
                max={7200}
                className="input"
                placeholder="Ej: 60"
                value={progressForm.tiempoRealizadoSeg}
                onChange={(e) => setProgressForm({ ...progressForm, tiempoRealizadoSeg: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={progressForm.completado}
                onChange={(e) => setProgressForm({ ...progressForm, completado: e.target.checked })}
                className="w-5 h-5 rounded accent-green-600"
              />
              <span className="font-medium text-dark-700">Marcar como completado</span>
            </label>

            <div className="flex justify-end gap-3">
              <button
                className="btn-secondary"
                onClick={() => setProgressModal({ open: false, ejercicio: null, fecha: '' })}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={guardarProgreso}
                disabled={savingProgress}
              >
                {savingProgress ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
