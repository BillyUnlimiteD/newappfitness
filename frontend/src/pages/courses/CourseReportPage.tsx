import { useState, useEffect, useCallback } from 'react';
import { coursesService } from '../../services/courses.service';
import { Curso, ReporteCurso, TipoPeriodoCurso, SemanaDetalle, DetalleAlumnoCurso } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';
import Modal from '../../components/common/Modal';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const badgePeriodo: Record<TipoPeriodoCurso, string> = {
  SEMANAL: 'bg-blue-100 text-blue-800',
  MENSUAL: 'bg-green-100 text-green-800',
  TRIMESTRAL: 'bg-yellow-100 text-yellow-800',
  SEMESTRAL: 'bg-purple-100 text-purple-800',
};

function ProgressBar({ value }: { value: number }) {
  const color =
    value >= 80 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="w-full bg-dark-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function CourseReportPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reporte seleccionado
  const [cursoSeleccionado, setCursoSeleccionado] = useState<Curso | null>(null);
  const [reporte, setReporte] = useState<ReporteCurso | null>(null);
  const [loadingReporte, setLoadingReporte] = useState(false);

  // Detalle alumno
  const [showDetalleAlumno, setShowDetalleAlumno] = useState(false);
  const [detalleAlumno, setDetalleAlumno] = useState<DetalleAlumnoCurso | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    coursesService
      .listar()
      .then(setCursos)
      .catch(() => setError('Error al cargar cursos'))
      .finally(() => setLoading(false));
  }, []);

  const cargarReporte = useCallback(async (curso: Curso) => {
    try {
      setLoadingReporte(true);
      setCursoSeleccionado(curso);
      const data = await coursesService.reporteCurso(curso.id);
      setReporte(data);
    } catch {
      setError('Error al cargar el reporte');
    } finally {
      setLoadingReporte(false);
    }
  }, []);

  const verDetalleAlumno = async (cursoId: number, alumnoId: number) => {
    try {
      setLoadingDetalle(true);
      setShowDetalleAlumno(true);
      const data = await coursesService.reporteAlumnoCurso(cursoId, alumnoId);
      setDetalleAlumno(data);
    } catch {
      setError('Error al cargar detalle del alumno');
    } finally {
      setLoadingDetalle(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  // ── Lista de cursos ───────────────────────────────────────────────────────
  if (!cursoSeleccionado || !reporte) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Reportes de Cursos</h1>
          <p className="text-dark-500 text-sm mt-1">Selecciona un curso para ver el reporte detallado</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {cursos.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-dark-400">No hay cursos disponibles</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {cursos.map((c) => (
              <button
                key={c.id}
                onClick={() => cargarReporte(c)}
                disabled={loadingReporte}
                className="card text-left hover:border-primary-300 hover:shadow-md transition-all disabled:opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-dark-900">{c.nombre}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgePeriodo[c.tipoPeriodo]}`}>
                        {c.tipoPeriodo}
                      </span>
                    </div>
                    <p className="text-sm text-dark-500 mt-0.5">
                      Coach: {c.coach.nombre} {c.coach.apellido} &nbsp;·&nbsp;
                      {c._count?.alumnos ?? 0} alumnos &nbsp;·&nbsp;
                      {c._count?.rutinas ?? 0} semanas
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
        {loadingReporte && <LoadingSpinner />}
      </div>
    );
  }

  // ── Reporte del curso ─────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setCursoSeleccionado(null); setReporte(null); }}
          className="p-2 rounded-lg hover:bg-dark-100 transition-colors"
        >
          <svg className="w-5 h-5 text-dark-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-dark-900">{reporte.curso.nombre}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgePeriodo[reporte.curso.tipoPeriodo]}`}>
              {reporte.curso.tipoPeriodo}
            </span>
          </div>
          <p className="text-dark-500 text-sm">
            {reporte.curso.fechaInicio.slice(0, 10)} → {reporte.curso.fechaFin.slice(0, 10)}
            &nbsp;·&nbsp; Coach: {reporte.curso.coach.nombre} {reporte.curso.coach.apellido}
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Resumen global */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-600">{reporte.totalAlumnos}</p>
          <p className="text-dark-500 text-sm mt-1">Alumnos</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-600">{reporte.curso.totalSemanas}</p>
          <p className="text-dark-500 text-sm mt-1">Semanas</p>
        </div>
        <div className="card text-center">
          <p className={`text-3xl font-bold ${
            reporte.porcentajeGlobal >= 80 ? 'text-green-600' :
            reporte.porcentajeGlobal >= 50 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {reporte.porcentajeGlobal}%
          </p>
          <p className="text-dark-500 text-sm mt-1">Progreso Global</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-dark-700">
            {reporte.resumenAlumnos.filter((a) => a.porcentaje === 100).length}
          </p>
          <p className="text-dark-500 text-sm mt-1">Completos (100%)</p>
        </div>
      </div>

      {/* Barra de progreso global */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-dark-700">Progreso general del curso</span>
          <span className="text-sm font-bold text-dark-900">{reporte.porcentajeGlobal}%</span>
        </div>
        <ProgressBar value={reporte.porcentajeGlobal} />
      </div>

      {/* Tabla de alumnos */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 border-b border-dark-100">
          <h2 className="font-semibold text-dark-900">Progreso por Alumno</h2>
        </div>

        {reporte.resumenAlumnos.length === 0 ? (
          <div className="p-6 text-center text-dark-400 text-sm">
            No hay alumnos inscritos en este curso.
          </div>
        ) : (
          <div className="divide-y divide-dark-100">
            {reporte.resumenAlumnos
              .sort((a, b) => b.porcentaje - a.porcentaje)
              .map((item) => (
                <div key={item.alumno.id} className="px-5 py-4 hover:bg-dark-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {item.alumno.nombre?.[0]?.toUpperCase() ?? '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-dark-800 truncate">
                          {item.alumno.nombre} {item.alumno.apellido}
                        </p>
                        <span className={`text-sm font-bold ml-2 flex-shrink-0 ${
                          item.porcentaje >= 80 ? 'text-green-600' :
                          item.porcentaje >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {item.porcentaje}%
                        </span>
                      </div>
                      <ProgressBar value={item.porcentaje} />
                      <p className="text-xs text-dark-400 mt-1">
                        {item.completados} / {item.totalEjercicios} ejercicios completados
                      </p>
                    </div>

                    {/* Botón detalle */}
                    <button
                      onClick={() => verDetalleAlumno(cursoSeleccionado!.id, item.alumno.id)}
                      className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0"
                    >
                      Detalle
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Modal Detalle Alumno */}
      <Modal
        isOpen={showDetalleAlumno}
        onClose={() => { setShowDetalleAlumno(false); setDetalleAlumno(null); }}
        title="Detalle del Alumno"
      >
        {loadingDetalle ? (
          <LoadingSpinner />
        ) : detalleAlumno ? (
          <DetalleAlumnoContent data={detalleAlumno} />
        ) : null}
      </Modal>
    </div>
  );
}

// ── Sub-componente detalle alumno ─────────────────────────────────────────────
function DetalleAlumnoContent({ data }: { data: DetalleAlumnoCurso }) {
  const [semanaAbierta, setSemanaAbierta] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
          {data.alumno.nombre?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="font-semibold">{data.alumno.nombre} {data.alumno.apellido}</p>
          <p className="text-sm text-dark-400">{data.alumno.correo}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-dark-50 rounded-lg p-3">
          <p className="text-xl font-bold text-primary-600">{data.porcentaje}%</p>
          <p className="text-xs text-dark-500">Progreso</p>
        </div>
        <div className="bg-dark-50 rounded-lg p-3">
          <p className="text-xl font-bold text-dark-700">{data.completados}</p>
          <p className="text-xs text-dark-500">Completados</p>
        </div>
        <div className="bg-dark-50 rounded-lg p-3">
          <p className="text-xl font-bold text-dark-700">{data.totalEjercicios}</p>
          <p className="text-xs text-dark-500">Total</p>
        </div>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {data.semanas.map((s) => (
          <div key={s.id} className="border border-dark-200 rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-50 transition-colors"
              onClick={() => setSemanaAbierta(semanaAbierta === s.semana ? null : s.semana)}
            >
              <span className="font-medium text-sm">Semana {s.semana}</span>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${
                  s.porcentaje >= 80 ? 'text-green-600' :
                  s.porcentaje >= 50 ? 'text-yellow-600' : 'text-red-500'
                }`}>
                  {s.porcentaje}%
                </span>
                <svg
                  className={`w-4 h-4 text-dark-400 transition-transform ${semanaAbierta === s.semana ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {semanaAbierta === s.semana && (
              <div className="px-4 pb-3 border-t border-dark-100">
                {s.dias.map((dia) => (
                  <div key={dia.id} className="mt-2">
                    <p className="text-xs font-semibold text-dark-500 mb-1">
                      {DIAS_SEMANA[dia.diaSemana - 1]}
                    </p>
                    <ul className="space-y-1">
                      {dia.ejercicios.map((ej) => {
                        const hecho = ej.progresos.some((p) => p.completado);
                        return (
                          <li key={ej.id} className="flex items-center gap-2 text-xs">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                              hecho ? 'bg-green-100 text-green-600' : 'bg-dark-100 text-dark-400'
                            }`}>
                              {hecho ? '✓' : '·'}
                            </span>
                            <span className={hecho ? 'text-dark-700' : 'text-dark-400'}>
                              {ej.ejercicio.titulo}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
