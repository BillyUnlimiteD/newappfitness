import { useState, useEffect, useCallback } from 'react';
import { coursesService } from '../../services/courses.service';
import { usersService } from '../../services/users.service';
import { Curso, Usuario, TipoPeriodoCurso } from '../../types';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const PERIODOS: { value: TipoPeriodoCurso; label: string }[] = [
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'SEMESTRAL', label: 'Semestral' },
];

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface CursoForm {
  nombre: string;
  descripcion: string;
  coachId: string;
  fechaInicio: string;
  fechaFin: string;
  tipoPeriodo: TipoPeriodoCurso;
  activo: boolean;
}

const emptyForm = (): CursoForm => ({
  nombre: '',
  descripcion: '',
  coachId: '',
  fechaInicio: '',
  fechaFin: '',
  tipoPeriodo: 'MENSUAL',
  activo: true,
});

export default function CoursesAdminPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [coaches, setCoaches] = useState<Usuario[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal crear/editar curso
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);
  const [form, setForm] = useState<CursoForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Modal gestión de alumnos
  const [showAlumnosModal, setShowAlumnosModal] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null);
  const [alumnosSeleccionados, setAlumnosSeleccionados] = useState<number[]>([]);
  const [savingAlumnos, setSavingAlumnos] = useState(false);

  // Modal detalle del curso
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [detalles, setDetalles] = useState<Curso | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const [cursosData, usersData] = await Promise.all([
        coursesService.listar(),
        usersService.listar(),
      ]);
      setCursos(cursosData);
      setCoaches(usersData.filter((u) => u.tipoUsuario === 'COACH' && u.activo));
      setUsuarios(usersData.filter((u) => u.tipoUsuario === 'USUARIO' && u.activo));
    } catch {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const abrirCrear = () => {
    setEditingCurso(null);
    setForm(emptyForm());
    setShowFormModal(true);
  };

  const abrirEditar = (curso: Curso) => {
    setEditingCurso(curso);
    setForm({
      nombre: curso.nombre,
      descripcion: curso.descripcion ?? '',
      coachId: String(curso.coachId),
      fechaInicio: curso.fechaInicio.slice(0, 10),
      fechaFin: curso.fechaFin.slice(0, 10),
      tipoPeriodo: curso.tipoPeriodo,
      activo: curso.activo,
    });
    setShowFormModal(true);
  };

  const guardarCurso = async () => {
    if (!form.nombre || !form.coachId || !form.fechaInicio || !form.fechaFin) {
      setError('Completa todos los campos obligatorios');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        coachId: Number(form.coachId),
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        tipoPeriodo: form.tipoPeriodo,
        activo: form.activo,
      };
      if (editingCurso) {
        await coursesService.actualizar(editingCurso.id, payload);
        setSuccess('Curso actualizado exitosamente');
      } else {
        await coursesService.crear(payload);
        setSuccess('Curso creado exitosamente');
      }
      setShowFormModal(false);
      cargarDatos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el curso';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const eliminarCurso = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este curso? Esta acción no se puede deshacer.')) return;
    try {
      await coursesService.eliminar(id);
      setSuccess('Curso eliminado');
      cargarDatos();
    } catch {
      setError('Error al eliminar el curso');
    }
  };

  const abrirGestionAlumnos = async (curso: Curso) => {
    try {
      const detalle = await coursesService.obtener(curso.id);
      setSelectedCurso(detalle);
      setAlumnosSeleccionados(detalle.alumnos?.map((a) => a.alumnoId) ?? []);
      setShowAlumnosModal(true);
    } catch {
      setError('Error al cargar alumnos del curso');
    }
  };

  const toggleAlumno = (uid: number) => {
    setAlumnosSeleccionados((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const guardarAlumnos = async () => {
    if (!selectedCurso) return;
    try {
      setSavingAlumnos(true);
      const actualesIds = selectedCurso.alumnos?.map((a) => a.alumnoId) ?? [];
      const aNagregar = alumnosSeleccionados.filter((id) => !actualesIds.includes(id));
      const aEliminar = actualesIds.filter((id) => !alumnosSeleccionados.includes(id));

      await Promise.all([
        ...(aNagregar.length > 0
          ? [coursesService.agregarAlumnos(selectedCurso.id, aNagregar)]
          : []),
        ...aEliminar.map((id) => coursesService.eliminarAlumno(selectedCurso.id, id)),
      ]);

      setSuccess('Alumnos actualizados');
      setShowAlumnosModal(false);
      cargarDatos();
    } catch {
      setError('Error al actualizar alumnos');
    } finally {
      setSavingAlumnos(false);
    }
  };

  const verDetalle = async (curso: Curso) => {
    try {
      const detalle = await coursesService.obtener(curso.id);
      setDetalles(detalle);
      setShowDetalleModal(true);
    } catch {
      setError('Error al cargar detalles del curso');
    }
  };

  const badgePeriodo: Record<TipoPeriodoCurso, string> = {
    SEMANAL: 'bg-blue-100 text-blue-800',
    MENSUAL: 'bg-green-100 text-green-800',
    TRIMESTRAL: 'bg-yellow-100 text-yellow-800',
    SEMESTRAL: 'bg-purple-100 text-purple-800',
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Cursos</h1>
          <p className="text-dark-500 text-sm mt-1">Gestión de cursos y asignación de coaches y alumnos</p>
        </div>
        <button
          onClick={abrirCrear}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Curso
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Tabla de cursos */}
      {cursos.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-12 h-12 text-dark-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-dark-400 font-medium">No hay cursos creados</p>
          <p className="text-dark-300 text-sm mt-1">Crea el primer curso con el botón superior</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {cursos.map((curso) => (
            <div key={curso.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-dark-900 text-lg">{curso.nombre}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgePeriodo[curso.tipoPeriodo]}`}>
                      {curso.tipoPeriodo}
                    </span>
                    {!curso.activo && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Inactivo
                      </span>
                    )}
                  </div>
                  {curso.descripcion && (
                    <p className="text-dark-500 text-sm mt-1 line-clamp-2">{curso.descripcion}</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-dark-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Coach: {curso.coach.nombre} {curso.coach.apellido}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {curso._count?.alumnos ?? 0} alumnos
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {curso.fechaInicio.slice(0, 10)} → {curso.fechaFin.slice(0, 10)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {curso._count?.rutinas ?? 0} semanas
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => verDetalle(curso)}
                    className="btn-secondary text-xs px-3 py-1.5"
                    title="Ver detalle"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => abrirGestionAlumnos(curso)}
                    className="btn-secondary text-xs px-3 py-1.5"
                    title="Gestionar alumnos"
                  >
                    Alumnos
                  </button>
                  <button
                    onClick={() => abrirEditar(curso)}
                    className="btn-secondary text-xs px-3 py-1.5"
                    title="Editar curso"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarCurso(curso.id)}
                    className="text-red-500 hover:text-red-700 transition-colors p-1.5 rounded hover:bg-red-50"
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar Curso */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingCurso ? 'Editar Curso' : 'Nuevo Curso'}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nombre del curso *</label>
            <input
              className="input"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Fitness Primavera 2026"
            />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input min-h-[80px] resize-none"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Descripción opcional del curso..."
            />
          </div>
          <div>
            <label className="label">Coach encargado *</label>
            <select
              className="input"
              value={form.coachId}
              onChange={(e) => setForm({ ...form, coachId: e.target.value })}
            >
              <option value="">Selecciona un coach</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido} — {c.correo}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de inicio *</label>
              <input
                type="date"
                className="input"
                value={form.fechaInicio}
                onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Fecha de fin *</label>
              <input
                type="date"
                className="input"
                value={form.fechaFin}
                onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Tipo de período</label>
            <select
              className="input"
              value={form.tipoPeriodo}
              onChange={(e) => setForm({ ...form, tipoPeriodo: e.target.value as TipoPeriodoCurso })}
            >
              {PERIODOS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          {editingCurso && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id="activo"
                checked={form.activo}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                className="rounded accent-primary-600"
              />
              <span className="text-sm text-dark-600">Curso activo</span>
            </label>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowFormModal(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={guardarCurso} disabled={saving}>
              {saving ? 'Guardando...' : editingCurso ? 'Actualizar' : 'Crear Curso'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Gestión de Alumnos */}
      <Modal
        isOpen={showAlumnosModal}
        onClose={() => setShowAlumnosModal(false)}
        title={`Alumnos — ${selectedCurso?.nombre}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-dark-500">
            Selecciona los alumnos que participarán en este curso.
            Los cambios se guardan al presionar "Guardar".
          </p>

          {/* Estadísticas */}
          <div className="bg-primary-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-primary-700 font-medium">
              {alumnosSeleccionados.length} alumno(s) seleccionado(s)
            </span>
            <span className="text-xs text-primary-500">{usuarios.length} disponibles</span>
          </div>

          {/* Lista de alumnos */}
          <div className="max-h-72 overflow-y-auto space-y-1 border border-dark-200 rounded-lg p-2">
            {usuarios.length === 0 ? (
              <p className="text-center text-dark-400 text-sm py-4">No hay usuarios disponibles</p>
            ) : (
              usuarios.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={alumnosSeleccionados.includes(u.id)}
                    onChange={() => toggleAlumno(u.id)}
                    className="rounded accent-primary-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-800">
                      {u.nombre} {u.apellido}
                    </p>
                    <p className="text-xs text-dark-400">{u.rut ?? u.correo}</p>
                  </div>
                </label>
              ))
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setShowAlumnosModal(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={guardarAlumnos} disabled={savingAlumnos}>
              {savingAlumnos ? 'Guardando...' : 'Guardar Alumnos'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Detalle del Curso */}
      <Modal
        isOpen={showDetalleModal}
        onClose={() => setShowDetalleModal(false)}
        title={detalles?.nombre ?? 'Detalle del curso'}
      >
        {detalles && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-dark-400 block">Coach</span>
                <span className="font-medium">{detalles.coach.nombre} {detalles.coach.apellido}</span>
              </div>
              <div>
                <span className="text-dark-400 block">Período</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgePeriodo[detalles.tipoPeriodo]}`}>
                  {detalles.tipoPeriodo}
                </span>
              </div>
              <div>
                <span className="text-dark-400 block">Inicio</span>
                <span className="font-medium">{detalles.fechaInicio.slice(0, 10)}</span>
              </div>
              <div>
                <span className="text-dark-400 block">Fin</span>
                <span className="font-medium">{detalles.fechaFin.slice(0, 10)}</span>
              </div>
            </div>

            {detalles.descripcion && (
              <div>
                <span className="text-dark-400 text-sm block mb-1">Descripción</span>
                <p className="text-dark-700 text-sm bg-dark-50 rounded p-2">{detalles.descripcion}</p>
              </div>
            )}

            {/* Semanas programadas */}
            <div>
              <h4 className="font-semibold text-dark-800 mb-2">
                Semanas programadas ({detalles.rutinas?.length ?? 0})
              </h4>
              {!detalles.rutinas || detalles.rutinas.length === 0 ? (
                <p className="text-dark-400 text-sm">El coach aún no ha cargado rutinas.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {detalles.rutinas.map((s) => (
                    <div key={s.id} className="bg-dark-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Semana {s.semana}</span>
                        <span className="text-xs text-dark-400">{s.dias.length} días</span>
                      </div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {s.dias.map((d) => (
                          <span key={d.id} className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                            {DIAS_SEMANA[d.diaSemana - 1]}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alumnos inscritos */}
            <div>
              <h4 className="font-semibold text-dark-800 mb-2">
                Alumnos inscritos ({detalles.alumnos?.length ?? 0})
              </h4>
              {!detalles.alumnos || detalles.alumnos.length === 0 ? (
                <p className="text-dark-400 text-sm">No hay alumnos inscritos.</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {detalles.alumnos.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-sm bg-dark-50 rounded px-3 py-2">
                      <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {a.alumno.nombre?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="font-medium">{a.alumno.nombre} {a.alumno.apellido}</span>
                      <span className="text-dark-400 text-xs ml-auto">{a.alumno.rut ?? a.alumno.correo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
