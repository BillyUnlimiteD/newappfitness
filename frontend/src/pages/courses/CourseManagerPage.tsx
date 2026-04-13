import { useState, useEffect, useCallback } from 'react';
import { coursesService } from '../../services/courses.service';
import { exercisesService } from '../../services/exercises.service';
import { Curso, Ejercicio, RutinaCurso, RutinaCursoDia } from '../../types';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const DIAS_SEMANA = [
  { num: 1, label: 'Lunes' },
  { num: 2, label: 'Martes' },
  { num: 3, label: 'Miércoles' },
  { num: 4, label: 'Jueves' },
  { num: 5, label: 'Viernes' },
  { num: 6, label: 'Sábado' },
  { num: 7, label: 'Domingo' },
];

interface EjercicioForm {
  ejercicioId: number;
  orden: number;
  repeticionesObj: string;
  tiempoObjetivoSeg: string;
  comentarioCoach: string;
}

const emptyEjercicio = (orden: number): EjercicioForm => ({
  ejercicioId: 0,
  orden,
  repeticionesObj: '',
  tiempoObjetivoSeg: '',
  comentarioCoach: '',
});

export default function CourseManagerPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selección de curso
  const [cursoSeleccionado, setCursoSeleccionado] = useState<Curso | null>(null);
  const [loadingCurso, setLoadingCurso] = useState(false);

  // Modal crear semana
  const [showSemanaModal, setShowSemanaModal] = useState(false);
  const [nuevaSemana, setNuevaSemana] = useState(1);
  const [diasSemana, setDiasSemana] = useState<Record<number, EjercicioForm[]>>({});
  const [diasActivos, setDiasActivos] = useState<number[]>([]);
  const [savingSemana, setSavingSemana] = useState(false);

  // Modal editar día
  const [showDiaModal, setShowDiaModal] = useState(false);
  const [editandoDia, setEditandoDia] = useState<{ semanaId: number; dia: RutinaCursoDia } | null>(null);
  const [diaEjercicios, setDiaEjercicios] = useState<EjercicioForm[]>([]);
  const [savingDia, setSavingDia] = useState(false);

  // Modal duplicar semana
  const [showDuplicarModal, setShowDuplicarModal] = useState(false);
  const [semanaOrigen, setSemanaOrigen] = useState<RutinaCurso | null>(null);
  const [semanaDestino, setSemanaDestino] = useState(2);
  const [duplicando, setDuplicando] = useState(false);

  const cargarCursos = useCallback(async () => {
    try {
      const data = await coursesService.listar();
      setCursos(data);
    } catch {
      setError('Error al cargar cursos');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [cs, ejs] = await Promise.all([coursesService.listar(), exercisesService.listar()]);
        setCursos(cs);
        setEjercicios(ejs.filter((e) => e.activo));
      } catch {
        setError('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const seleccionarCurso = async (curso: Curso) => {
    try {
      setLoadingCurso(true);
      const detalle = await coursesService.obtener(curso.id);
      setCursoSeleccionado(detalle);
    } catch {
      setError('Error al cargar el curso');
    } finally {
      setLoadingCurso(false);
    }
  };

  const recargarCurso = async () => {
    if (!cursoSeleccionado) return;
    const detalle = await coursesService.obtener(cursoSeleccionado.id);
    setCursoSeleccionado(detalle);
  };

  // ── Crear semana ──────────────────────────────────────────────────────────
  const abrirCrearSemana = () => {
    const semanasExistentes = cursoSeleccionado?.rutinas?.map((r) => r.semana) ?? [];
    const siguiente = semanasExistentes.length > 0 ? Math.max(...semanasExistentes) + 1 : 1;
    setNuevaSemana(siguiente);
    setDiasSemana({});
    setDiasActivos([]);
    setShowSemanaModal(true);
  };

  const toggleDia = (dia: number) => {
    setDiasActivos((prev) => {
      if (prev.includes(dia)) {
        const nuevo = { ...diasSemana };
        delete nuevo[dia];
        setDiasSemana(nuevo);
        return prev.filter((d) => d !== dia);
      }
      setDiasSemana((prev2) => ({ ...prev2, [dia]: [emptyEjercicio(1)] }));
      return [...prev, dia].sort();
    });
  };

  const addEjercicioDia = (dia: number) => {
    setDiasSemana((prev) => ({
      ...prev,
      [dia]: [...(prev[dia] ?? []), emptyEjercicio((prev[dia]?.length ?? 0) + 1)],
    }));
  };

  const removeEjercicioDia = (dia: number, idx: number) => {
    setDiasSemana((prev) => ({
      ...prev,
      [dia]: prev[dia].filter((_, i) => i !== idx).map((e, i) => ({ ...e, orden: i + 1 })),
    }));
  };

  const updateEjercicioDia = (dia: number, idx: number, field: keyof EjercicioForm, value: string | number) => {
    setDiasSemana((prev) => ({
      ...prev,
      [dia]: prev[dia].map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    }));
  };

  const guardarSemana = async () => {
    if (!cursoSeleccionado) return;
    if (diasActivos.length === 0) { setError('Selecciona al menos un día'); return; }

    const diasPayload = diasActivos.map((dia) => {
      const ejs = (diasSemana[dia] ?? []).filter((e) => e.ejercicioId > 0);
      return {
        diaSemana: dia,
        ejercicios: ejs.map((e) => ({
          ejercicioId: e.ejercicioId,
          orden: e.orden,
          repeticionesObj: e.repeticionesObj ? Number(e.repeticionesObj) : undefined,
          tiempoObjetivoSeg: e.tiempoObjetivoSeg ? Number(e.tiempoObjetivoSeg) : undefined,
          comentarioCoach: e.comentarioCoach || undefined,
        })),
      };
    }).filter((d) => d.ejercicios.length > 0);

    if (diasPayload.length === 0) { setError('Agrega al menos un ejercicio en un día'); return; }

    try {
      setSavingSemana(true);
      await coursesService.crearSemana(cursoSeleccionado.id, nuevaSemana, diasPayload);
      setSuccess(`Semana ${nuevaSemana} creada exitosamente`);
      setShowSemanaModal(false);
      recargarCurso();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la semana';
      setError(msg);
    } finally {
      setSavingSemana(false);
    }
  };

  // ── Editar día ────────────────────────────────────────────────────────────
  const abrirEditarDia = (semanaId: number, dia: RutinaCursoDia) => {
    setEditandoDia({ semanaId, dia });
    setDiaEjercicios(
      dia.ejercicios.map((e) => ({
        ejercicioId: e.ejercicioId,
        orden: e.orden,
        repeticionesObj: e.repeticionesObj?.toString() ?? '',
        tiempoObjetivoSeg: e.tiempoObjetivoSeg?.toString() ?? '',
        comentarioCoach: e.comentarioCoach ?? '',
      }))
    );
    setShowDiaModal(true);
  };

  const guardarDia = async () => {
    if (!cursoSeleccionado || !editandoDia) return;
    try {
      setSavingDia(true);
      const ejercicios = diaEjercicios
        .filter((e) => e.ejercicioId > 0)
        .map((e) => ({
          ejercicioId: e.ejercicioId,
          orden: e.orden,
          repeticionesObj: e.repeticionesObj ? Number(e.repeticionesObj) : undefined,
          tiempoObjetivoSeg: e.tiempoObjetivoSeg ? Number(e.tiempoObjetivoSeg) : undefined,
          comentarioCoach: e.comentarioCoach || undefined,
        }));

      await coursesService.actualizarDia(
        cursoSeleccionado.id,
        editandoDia.semanaId,
        editandoDia.dia.id,
        ejercicios
      );
      setSuccess('Día actualizado');
      setShowDiaModal(false);
      recargarCurso();
    } catch {
      setError('Error al guardar el día');
    } finally {
      setSavingDia(false);
    }
  };

  // ── Eliminar semana ───────────────────────────────────────────────────────
  const eliminarSemana = async (semanaId: number, numSemana: number) => {
    if (!cursoSeleccionado) return;
    if (!confirm(`¿Eliminar la semana ${numSemana}? Se borrarán todos sus días y ejercicios.`)) return;
    try {
      await coursesService.eliminarSemana(cursoSeleccionado.id, semanaId);
      setSuccess(`Semana ${numSemana} eliminada`);
      recargarCurso();
    } catch {
      setError('Error al eliminar la semana');
    }
  };

  // ── Duplicar semana ───────────────────────────────────────────────────────
  const abrirDuplicar = (semana: RutinaCurso) => {
    setSemanaOrigen(semana);
    const semanasExistentes = cursoSeleccionado?.rutinas?.map((r) => r.semana) ?? [];
    const siguiente = semanasExistentes.length > 0 ? Math.max(...semanasExistentes) + 1 : 2;
    setSemanaDestino(siguiente);
    setShowDuplicarModal(true);
  };

  const confirmarDuplicar = async () => {
    if (!cursoSeleccionado || !semanaOrigen) return;
    try {
      setDuplicando(true);
      await coursesService.duplicarSemana(cursoSeleccionado.id, semanaOrigen.id, semanaDestino);
      setSuccess(`Semana ${semanaOrigen.semana} duplicada a semana ${semanaDestino}`);
      setShowDuplicarModal(false);
      recargarCurso();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al duplicar la semana';
      setError(msg);
    } finally {
      setDuplicando(false);
    }
  };

  const nombreEjercicio = (id: number) =>
    ejercicios.find((e) => e.id === id)?.titulo ?? `Ejercicio #${id}`;

  if (loading) return <LoadingSpinner />;

  // ── Vista principal: lista de cursos asignados ────────────────────────────
  if (!cursoSeleccionado) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Mis Cursos</h1>
          <p className="text-dark-500 text-sm mt-1">Selecciona un curso para gestionar sus rutinas semanales</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {cursos.length === 0 ? (
          <div className="card text-center py-12">
            <svg className="w-12 h-12 text-dark-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-dark-400">No tienes cursos asignados</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {cursos.map((c) => (
              <button
                key={c.id}
                onClick={() => seleccionarCurso(c)}
                className="card text-left hover:border-primary-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-dark-900">{c.nombre}</h3>
                    <p className="text-sm text-dark-500 mt-0.5">
                      {c.fechaInicio.slice(0, 10)} → {c.fechaFin.slice(0, 10)} · {c._count?.alumnos ?? 0} alumnos · {c._count?.rutinas ?? 0} semanas
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

        {loadingCurso && <LoadingSpinner />}
      </div>
    );
  }

  // ── Vista de gestión de un curso específico ──────────────────────────────
  const semanas = cursoSeleccionado.rutinas ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setCursoSeleccionado(null); cargarCursos(); }}
          className="p-2 rounded-lg hover:bg-dark-100 transition-colors"
        >
          <svg className="w-5 h-5 text-dark-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-dark-900">{cursoSeleccionado.nombre}</h1>
          <p className="text-dark-500 text-sm">
            {cursoSeleccionado.fechaInicio.slice(0, 10)} → {cursoSeleccionado.fechaFin.slice(0, 10)}
            &nbsp;·&nbsp;{cursoSeleccionado.alumnos?.length ?? 0} alumnos
          </p>
        </div>
        <button onClick={abrirCrearSemana} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Semana
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Lista de semanas */}
      {semanas.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-12 h-12 text-dark-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-dark-400 font-medium">No hay semanas programadas</p>
          <p className="text-dark-300 text-sm mt-1">Crea la primera semana con el botón superior</p>
        </div>
      ) : (
        <div className="space-y-4">
          {semanas.map((semana) => (
            <div key={semana.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-dark-900">Semana {semana.semana}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => abrirDuplicar(semana)}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                    title="Duplicar semana"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Duplicar
                  </button>
                  <button
                    onClick={() => eliminarSemana(semana.id, semana.semana)}
                    className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {semana.dias.length === 0 ? (
                <p className="text-dark-400 text-sm">Sin días programados</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {semana.dias.map((dia) => (
                    <div
                      key={dia.id}
                      className="bg-dark-50 rounded-lg p-3 border border-dark-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-dark-700">
                          {DIAS_SEMANA.find((d) => d.num === dia.diaSemana)?.label}
                        </span>
                        <button
                          onClick={() => abrirEditarDia(semana.id, dia)}
                          className="text-primary-600 hover:text-primary-800 p-0.5 rounded transition-colors"
                          title="Editar día"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                      <ul className="space-y-1">
                        {dia.ejercicios.map((ej) => (
                          <li key={ej.id} className="text-xs text-dark-600 flex items-start gap-1">
                            <span className="text-dark-400 flex-shrink-0">{ej.orden}.</span>
                            <span className="truncate">{ej.ejercicio.titulo}</span>
                          </li>
                        ))}
                        {dia.ejercicios.length === 0 && (
                          <li className="text-xs text-dark-300 italic">Sin ejercicios</li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Crear Semana ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showSemanaModal}
        onClose={() => setShowSemanaModal(false)}
        title="Nueva Semana de Rutina"
      >
        <div className="space-y-5">
          <div>
            <label className="label">Número de semana</label>
            <input
              type="number"
              min={1}
              max={52}
              className="input w-32"
              value={nuevaSemana}
              onChange={(e) => setNuevaSemana(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="label mb-2 block">Días activos</label>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map((d) => (
                <button
                  key={d.num}
                  type="button"
                  onClick={() => toggleDia(d.num)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    diasActivos.includes(d.num)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-dark-600 border-dark-200 hover:border-primary-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ejercicios por día */}
          {diasActivos.map((dia) => (
            <div key={dia} className="border border-dark-200 rounded-lg overflow-hidden">
              <div className="bg-dark-50 px-4 py-2 flex items-center justify-between">
                <span className="font-medium text-sm text-dark-700">
                  {DIAS_SEMANA.find((d) => d.num === dia)?.label}
                </span>
                <button
                  type="button"
                  onClick={() => addEjercicioDia(dia)}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                >
                  + Ejercicio
                </button>
              </div>
              <div className="p-3 space-y-3">
                {(diasSemana[dia] ?? []).map((ej, idx) => (
                  <EjercicioRow
                    key={idx}
                    ej={ej}
                    idx={idx}
                    ejercicios={ejercicios}
                    onChange={(field, val) => updateEjercicioDia(dia, idx, field, val)}
                    onRemove={() => removeEjercicioDia(dia, idx)}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setShowSemanaModal(false)}>Cancelar</button>
            <button className="btn-primary" onClick={guardarSemana} disabled={savingSemana}>
              {savingSemana ? 'Guardando...' : 'Crear Semana'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Editar Día ───────────────────────────────────────────────── */}
      <Modal
        isOpen={showDiaModal}
        onClose={() => setShowDiaModal(false)}
        title={`Editar ${DIAS_SEMANA.find((d) => d.num === editandoDia?.dia.diaSemana)?.label ?? 'Día'} — Semana ${cursoSeleccionado.rutinas?.find((r) => r.id === editandoDia?.semanaId)?.semana ?? ''}`}
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setDiaEjercicios((prev) => [...prev, emptyEjercicio(prev.length + 1)])}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              + Agregar Ejercicio
            </button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {diaEjercicios.map((ej, idx) => (
              <EjercicioRow
                key={idx}
                ej={ej}
                idx={idx}
                ejercicios={ejercicios}
                onChange={(field, val) =>
                  setDiaEjercicios((prev) =>
                    prev.map((e, i) => (i === idx ? { ...e, [field]: val } : e))
                  )
                }
                onRemove={() =>
                  setDiaEjercicios((prev) =>
                    prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, orden: i + 1 }))
                  )
                }
              />
            ))}
            {diaEjercicios.length === 0 && (
              <p className="text-sm text-dark-400 text-center py-4">
                Sin ejercicios. Agrega uno con el botón superior.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setShowDiaModal(false)}>Cancelar</button>
            <button className="btn-primary" onClick={guardarDia} disabled={savingDia}>
              {savingDia ? 'Guardando...' : 'Guardar Día'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Duplicar Semana ──────────────────────────────────────────── */}
      <Modal
        isOpen={showDuplicarModal}
        onClose={() => setShowDuplicarModal(false)}
        title={`Duplicar Semana ${semanaOrigen?.semana}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-dark-600">
            Se copiará la estructura de la semana {semanaOrigen?.semana} (días y ejercicios) a una nueva semana.
          </p>

          <div>
            <label className="label">Número de semana destino</label>
            <input
              type="number"
              min={1}
              max={52}
              className="input w-32"
              value={semanaDestino}
              onChange={(e) => setSemanaDestino(Number(e.target.value))}
            />
            {semanaDestino === semanaOrigen?.semana && (
              <p className="text-amber-600 text-xs mt-1">
                La semana destino no puede ser la misma que la de origen.
              </p>
            )}
            {semanaDestino !== semanaOrigen?.semana &&
              (cursoSeleccionado.rutinas ?? []).some((r) => r.semana === semanaDestino) && (
              <p className="text-amber-600 text-xs mt-1">
                La semana {semanaDestino} ya existe. Cámbiala antes de continuar.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setShowDuplicarModal(false)}>Cancelar</button>
            <button
              className="btn-primary"
              onClick={confirmarDuplicar}
              disabled={
                duplicando ||
                semanaDestino === semanaOrigen?.semana ||
                (cursoSeleccionado.rutinas ?? []).some((r) => r.semana === semanaDestino)
              }
            >
              {duplicando ? 'Duplicando...' : 'Duplicar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Sub-componente EjercicioRow ───────────────────────────────────────────────
function EjercicioRow({
  ej,
  idx,
  ejercicios,
  onChange,
  onRemove,
}: {
  ej: EjercicioForm;
  idx: number;
  ejercicios: Ejercicio[];
  onChange: (field: keyof EjercicioForm, val: string | number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-dark-100 rounded-lg p-3 bg-white space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-dark-400 w-5 text-right flex-shrink-0">{ej.orden}.</span>
        <select
          className="input flex-1 text-sm py-1.5"
          value={ej.ejercicioId}
          onChange={(e) => onChange('ejercicioId', Number(e.target.value))}
        >
          <option value={0}>Selecciona ejercicio</option>
          {ejercicios.map((e) => (
            <option key={e.id} value={e.id}>{e.titulo}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-400 hover:text-red-600 p-1 rounded flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 pl-7">
        <div>
          <input
            type="number"
            className="input text-sm py-1.5"
            placeholder="Reps objetivo"
            value={ej.repeticionesObj}
            onChange={(e) => onChange('repeticionesObj', e.target.value)}
          />
        </div>
        <div>
          <input
            type="number"
            className="input text-sm py-1.5"
            placeholder="Tiempo (seg)"
            value={ej.tiempoObjetivoSeg}
            onChange={(e) => onChange('tiempoObjetivoSeg', e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <input
            className="input text-sm py-1.5"
            placeholder="Comentario del coach..."
            value={ej.comentarioCoach}
            onChange={(e) => onChange('comentarioCoach', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
