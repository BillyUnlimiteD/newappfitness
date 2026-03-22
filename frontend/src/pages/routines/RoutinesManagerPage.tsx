import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { usersService } from '../../services/users.service';
import { exercisesService } from '../../services/exercises.service';
import { routinesService } from '../../services/routines.service';
import { Usuario, Ejercicio, Rutina } from '../../types';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface EjercicioDia {
  ejercicioId: number;
  orden: number;
  repeticionesObj: string;
  tiempoObjetivoSeg: string;
  comentarioCoach: string;
}

const emptyEj = (): EjercicioDia => ({ ejercicioId: 0, orden: 1, repeticionesObj: '', tiempoObjetivoSeg: '', comentarioCoach: '' });

export default function RoutinesManagerPage() {
  const [myUsers, setMyUsers] = useState<(Usuario & { lesiones?: string | null })[]>([]);
  const [exercises, setExercises] = useState<Ejercicio[]>([]);
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modo crear
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<number>(0);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tipoPeriodo, setTipoPeriodo] = useState<'SEMANAL' | 'MENSUAL'>('SEMANAL');
  const [selectedWeek, setSelectedWeek] = useState('');   // "2024-W03"
  const [selectedMonth, setSelectedMonth] = useState(''); // "2024-03"

  // Modo editar
  const [editingRutina, setEditingRutina] = useState<Rutina | null>(null);
  const [editingDiaId, setEditingDiaId] = useState<number | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);

  // Día seleccionado en calendario (compartido entre crear y editar)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [dayExercicios, setDayExercicios] = useState<EjercicioDia[]>([emptyEj()]);
  const [diasRutina, setDiasRutina] = useState<Record<string, EjercicioDia[]>>({});

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [users, exs, ruts] = await Promise.all([
          usersService.misUsuarios(),
          exercisesService.listar(),
          routinesService.listar(),
        ]);
        setMyUsers(users);
        setExercises(exs);
        setRutinas(ruts);
      } catch { setError('Error al cargar datos'); }
      finally { setIsLoading(false); }
    };
    loadData();
  }, []);

  // ── Selección de semana / mes ─────────────────────────────────────────────

  const handleTipoPeriodoChange = (tipo: 'SEMANAL' | 'MENSUAL') => {
    setTipoPeriodo(tipo);
    setFechaInicio('');
    setFechaFin('');
    setSelectedWeek('');
    setSelectedMonth('');
    setDiasRutina({});
  };

  const handleWeekChange = (weekStr: string) => {
    setSelectedWeek(weekStr);
    if (!weekStr) { setFechaInicio(''); setFechaFin(''); return; }
    // weekStr = "2024-W03"
    const [yearStr, weekPart] = weekStr.split('-W');
    const year = parseInt(yearStr);
    const week = parseInt(weekPart);
    // Lunes de la semana ISO: Jan 4 siempre está en la semana 1
    const jan4 = new Date(year, 0, 4);
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (week - 1) * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    setFechaInicio(format(monday, 'yyyy-MM-dd'));
    setFechaFin(format(sunday, 'yyyy-MM-dd'));
    setDiasRutina({});
  };

  const handleMonthChange = (monthStr: string) => {
    setSelectedMonth(monthStr);
    if (!monthStr) { setFechaInicio(''); setFechaFin(''); return; }
    // monthStr = "2024-03"
    const [yearStr, monthNum] = monthStr.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthNum) - 1; // 0-indexed
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    setFechaInicio(format(firstDay, 'yyyy-MM-dd'));
    setFechaFin(format(lastDay, 'yyyy-MM-dd'));
    setDiasRutina({});
  };

  // ── Helpers de rango de fechas ───────────────────────────────────────────

  const getDateRange = (inicio: string, fin: string): string[] => {
    const dates: string[] = [];
    const start = new Date(inicio);
    const end = new Date(fin);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(format(new Date(d), 'yyyy-MM-dd'));
    }
    return dates;
  };

  // ── Calendario ───────────────────────────────────────────────────────────

  const tileClassName = ({ date }: { date: Date }) => {
    const key = format(date, 'yyyy-MM-dd');
    if (diasRutina[key]?.length) return 'bg-primary-100 text-primary-800 font-medium rounded-lg';
    if (editingRutina) return '';
    if (fechaInicio && fechaFin && getDateRange(fechaInicio, fechaFin).includes(key)) return 'bg-accent-50 rounded-lg';
    return '';
  };

  const tileDisabled = ({ date }: { date: Date }) => {
    const key = format(date, 'yyyy-MM-dd');
    if (editingRutina) {
      return !getDateRange(
        format(parseISO(editingRutina.fechaInicio), 'yyyy-MM-dd'),
        format(parseISO(editingRutina.fechaFin), 'yyyy-MM-dd')
      ).includes(key);
    }
    if (fechaInicio && fechaFin) return !getDateRange(fechaInicio, fechaFin).includes(key);
    return true;
  };

  const handleCalendarClick = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');

    if (editingRutina) {
      const dia = editingRutina.dias.find((d) => format(parseISO(d.fecha), 'yyyy-MM-dd') === key);
      setEditingDiaId(dia?.id ?? null); // null = día nuevo
      setSelectedDate(date);
      setDayExercicios(diasRutina[key] || [emptyEj()]);
      setIsDayModalOpen(true);
      return;
    }

    setEditingDiaId(null);
    setSelectedDate(date);
    setDayExercicios(diasRutina[key] || [emptyEj()]);
    setIsDayModalOpen(true);
  };

  // ── Modal de ejercicios del día ──────────────────────────────────────────

  const saveDayExercicios = async () => {
    if (!selectedDate) return;
    const key = format(selectedDate, 'yyyy-MM-dd');
    const valid = dayExercicios.filter((e) => e.ejercicioId > 0);

    // Modo edición
    if (editingRutina) {
      if (valid.length === 0) { setError('Agrega al menos un ejercicio'); return; }
      setIsSaving(true);
      const ejerciciosPayload = valid.map((e, i) => ({
        ejercicioId: e.ejercicioId,
        orden: i + 1,
        repeticionesObj: e.repeticionesObj ? parseInt(e.repeticionesObj) : undefined,
        tiempoObjetivoSeg: e.tiempoObjetivoSeg ? parseInt(e.tiempoObjetivoSeg) : undefined,
        comentarioCoach: e.comentarioCoach || undefined,
      }));
      try {
        if (editingDiaId !== null) {
          // Día existente
          await routinesService.actualizarDia(editingRutina.id, editingDiaId, ejerciciosPayload);
          setSuccess('Día actualizado correctamente');
        } else {
          // Día nuevo
          const nuevoDia = await routinesService.agregarDia(editingRutina.id, key, ejerciciosPayload) as { id: number; fecha: string; ejercicios: unknown[] };
          setEditingRutina((prev) => prev ? { ...prev, dias: [...prev.dias, nuevoDia as Parameters<typeof prev.dias.push>[0]] } : prev);
          setSuccess('Día agregado correctamente');
        }
        setDiasRutina((prev) => ({ ...prev, [key]: valid.map((e, i) => ({ ...e, orden: i + 1 })) }));
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(msg || 'Error al guardar el día');
      } finally {
        setIsSaving(false);
      }
      setIsDayModalOpen(false);
      return;
    }

    // Modo creación: guarda en estado local
    if (valid.length === 0) {
      const updated = { ...diasRutina };
      delete updated[key];
      setDiasRutina(updated);
    } else {
      setDiasRutina({ ...diasRutina, [key]: valid.map((e, i) => ({ ...e, orden: i + 1 })) });
    }
    setIsDayModalOpen(false);
  };

  const addEjercicio = () => {
    if (dayExercicios.length >= 5) return;
    setDayExercicios([...dayExercicios, { ...emptyEj(), orden: dayExercicios.length + 1 }]);
  };

  const updateEjercicio = (idx: number, field: keyof EjercicioDia, value: string | number) => {
    setDayExercicios(dayExercicios.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const removeEjercicio = (idx: number) => {
    if (dayExercicios.length === 1) return;
    setDayExercicios(dayExercicios.filter((_, i) => i !== idx));
  };

  // ── Abrir modo edición ───────────────────────────────────────────────────

  const openEditRutina = async (r: Rutina) => {
    setIsCreating(false);
    setIsLoadingEdit(true);
    setEditingRutina(null);
    setDiasRutina({});
    try {
      const full = await routinesService.obtener(r.id);
      const dias: Record<string, EjercicioDia[]> = {};
      full.dias.forEach((dia) => {
        const key = format(parseISO(dia.fecha), 'yyyy-MM-dd');
        dias[key] = dia.ejercicios.map((ej) => ({
          ejercicioId: ej.ejercicioId,
          orden: ej.orden,
          repeticionesObj: ej.repeticionesObj?.toString() || '',
          tiempoObjetivoSeg: ej.tiempoObjetivoSeg?.toString() || '',
          comentarioCoach: ej.comentarioCoach || '',
        }));
      });
      setDiasRutina(dias);
      setEditingRutina(full);
    } catch {
      setError('Error al cargar la rutina');
    } finally {
      setIsLoadingEdit(false);
    }
  };


  const closeEditRutina = () => {
    setEditingRutina(null);
    setDiasRutina({});
    setEditingDiaId(null);
  };

  // ── Crear rutina ─────────────────────────────────────────────────────────

  const handleCreateRutina = async () => {
    if (!selectedUser) { setError('Selecciona un usuario'); return; }
    if (!fechaInicio || !fechaFin) { setError(tipoPeriodo === 'SEMANAL' ? 'Selecciona una semana' : 'Selecciona un mes'); return; }
    if (Object.keys(diasRutina).length === 0) { setError('Agrega al menos un día con ejercicios'); return; }

    setIsSaving(true);
    setError('');
    try {
      const dias = Object.entries(diasRutina).map(([fecha, ejercicios]) => ({
        fecha,
        ejercicios: ejercicios.map((e) => ({
          ejercicioId: e.ejercicioId,
          orden: e.orden,
          repeticionesObj: e.repeticionesObj ? parseInt(e.repeticionesObj) : undefined,
          tiempoObjetivoSeg: e.tiempoObjetivoSeg ? parseInt(e.tiempoObjetivoSeg) : undefined,
          comentarioCoach: e.comentarioCoach || undefined,
        })),
      }));

      await routinesService.crear({ usuarioId: selectedUser, fechaInicio, fechaFin, tipoPeriodo, dias });
      const updated = await routinesService.listar();
      setRutinas(updated);
      setDiasRutina({});
      setIsCreating(false);
      setSuccess('Rutina creada correctamente');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Error al crear la rutina');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Mantenedor de Rutinas</h1>
          <p className="text-dark-500 mt-0.5">Crea y gestiona rutinas para tus usuarios</p>
        </div>
        {!editingRutina && (
          <button
            onClick={() => { setIsCreating(!isCreating); setDiasRutina({}); }}
            className="btn-primary"
          >
            {isCreating ? 'Cancelar' : '+ Nueva rutina'}
          </button>
        )}
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* ── Formulario crear ── */}
      {isCreating && !editingRutina && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-dark-900 mb-4">Nueva Rutina</h2>

          {selectedUser > 0 && myUsers.find((u) => u.id === selectedUser)?.lesiones && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex gap-3">
              <span className="text-orange-500 text-xl flex-shrink-0">⚠</span>
              <div>
                <p className="text-sm font-semibold text-orange-800">Este usuario tiene lesiones o condiciones físicas registradas:</p>
                <p className="text-sm text-orange-700 mt-0.5 whitespace-pre-wrap">{myUsers.find((u) => u.id === selectedUser)?.lesiones}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="input-label">Usuario *</label>
              <select value={selectedUser} onChange={(e) => setSelectedUser(parseInt(e.target.value))} className="input-field">
                <option value={0}>Seleccionar usuario</option>
                {myUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.lesiones ? '⚠ ' : ''}{u.nombre} {u.apellido}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Tipo de período</label>
              <select value={tipoPeriodo} onChange={(e) => handleTipoPeriodoChange(e.target.value as 'SEMANAL' | 'MENSUAL')} className="input-field">
                <option value="SEMANAL">Semanal</option>
                <option value="MENSUAL">Mensual</option>
              </select>
            </div>
            <div>
              {tipoPeriodo === 'SEMANAL' ? (
                <>
                  <label className="input-label">Semana *</label>
                  <input type="week" value={selectedWeek} onChange={(e) => handleWeekChange(e.target.value)} className="input-field" />
                  {fechaInicio && fechaFin && (
                    <p className="text-xs text-dark-400 mt-1">
                      {format(parseISO(fechaInicio), 'dd/MM/yyyy')} al {format(parseISO(fechaFin), 'dd/MM/yyyy')}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <label className="input-label">Mes *</label>
                  <input type="month" value={selectedMonth} onChange={(e) => handleMonthChange(e.target.value)} className="input-field" />
                  {fechaInicio && fechaFin && (
                    <p className="text-xs text-dark-400 mt-1">
                      {format(parseISO(fechaInicio), 'dd/MM/yyyy')} al {format(parseISO(fechaFin), 'dd/MM/yyyy')}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {fechaInicio && fechaFin && (
            <div className="mb-4">
              <p className="text-sm font-medium text-dark-700 mb-2">
                Haz clic en los días de la {tipoPeriodo === 'SEMANAL' ? 'semana' : 'mes'} para agregar ejercicios:
                <span className="ml-2 text-xs text-dark-400">({Object.keys(diasRutina).length} días configurados)</span>
              </p>
              <div className="bg-dark-50 rounded-xl p-4 max-w-md">
                <Calendar
                  onClickDay={handleCalendarClick}
                  tileClassName={tileClassName}
                  tileDisabled={tileDisabled}
                  locale="es-CL"
                  minDetail="month"
                />
              </div>
              <p className="text-xs text-dark-400 mt-2">🟠 Días en rango &nbsp; 🔵 Días con ejercicios</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleCreateRutina} disabled={isSaving} className="btn-primary">
              {isSaving ? 'Creando...' : 'Crear rutina'}
            </button>
            <button onClick={() => { setIsCreating(false); setDiasRutina({}); }} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── Panel editar rutina ── */}
      {editingRutina && (
        <div className="card mb-6 border-2 border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-dark-900">
                Editando rutina de {editingRutina.usuario?.nombre} {editingRutina.usuario?.apellido}
              </h2>
              <p className="text-sm text-dark-500">
                {format(parseISO(editingRutina.fechaInicio), 'dd MMM yyyy', { locale: es })} →{' '}
                {format(parseISO(editingRutina.fechaFin), 'dd MMM yyyy', { locale: es })}
                <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${editingRutina.tipoPeriodo === 'SEMANAL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {editingRutina.tipoPeriodo}
                </span>
              </p>
            </div>
            <button onClick={closeEditRutina} className="btn-secondary text-sm">
              Cerrar edición
            </button>
          </div>

          {isLoadingEdit ? (
            <LoadingSpinner />
          ) : (
            <div>
              {myUsers.find((u) => u.id === editingRutina.usuarioId)?.lesiones && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex gap-3">
                  <span className="text-orange-500 text-xl flex-shrink-0">⚠</span>
                  <div>
                    <p className="text-sm font-semibold text-orange-800">Lesiones registradas:</p>
                    <p className="text-sm text-orange-700 mt-0.5 whitespace-pre-wrap">{myUsers.find((u) => u.id === editingRutina.usuarioId)?.lesiones}</p>
                  </div>
                </div>
              )}
              <p className="text-sm font-medium text-dark-700 mb-2">
                Haz clic en cualquier día del rango para editar o agregar ejercicios:
              </p>
              <div className="bg-dark-50 rounded-xl p-4 max-w-md">
                <Calendar
                  onClickDay={handleCalendarClick}
                  tileClassName={tileClassName}
                  tileDisabled={tileDisabled}
                  locale="es-CL"
                  minDetail="month"
                  defaultActiveStartDate={parseISO(editingRutina.fechaInicio)}
                />
              </div>
              <p className="text-xs text-dark-400 mt-2">🔵 Días con ejercicios · Días sin marcar = sin ejercicios aún (puedes agregarlos)</p>
            </div>
          )}
        </div>
      )}

      {/* ── Lista de rutinas ── */}
      {!editingRutina && (
        <div className="space-y-3">
          {rutinas.length === 0 && (
            <div className="card text-center text-dark-400 py-8">No hay rutinas creadas todavía</div>
          )}
          {rutinas.map((r) => {
            const terminada = new Date() > new Date(r.fechaFin);
            return (
              <div key={r.id} className="card flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.tipoPeriodo === 'SEMANAL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {r.tipoPeriodo}
                      </span>
                      {terminada && (
                        <span className="text-xs bg-dark-100 text-dark-500 px-2 py-0.5 rounded-full">Finalizada</span>
                      )}
                    </div>
                    <p className="font-semibold text-dark-900">
                      {r.usuario ? `${r.usuario.nombre} ${r.usuario.apellido}` : 'Usuario'}
                    </p>
                    <p className="text-sm text-dark-500">
                      {format(parseISO(r.fechaInicio), 'dd MMM yyyy', { locale: es })} →{' '}
                      {format(parseISO(r.fechaFin), 'dd MMM yyyy', { locale: es })}
                    </p>
                    {r._count && (
                      <p className="text-xs text-dark-400 mt-1">{r._count.dias} días en la rutina</p>
                    )}
                  </div>
                  <div className="flex gap-2 sm:flex-shrink-0">
                    <button onClick={() => openEditRutina(r)} className="btn-secondary text-sm">Editar</button>
                    <button
                      onClick={async () => {
                        if (!confirm('¿Eliminar esta rutina?')) return;
                        try {
                          await routinesService.eliminar(r.id);
                          setRutinas(rutinas.filter((x) => x.id !== r.id));
                          setSuccess('Rutina eliminada');
                        } catch { setError('Error al eliminar'); }
                      }}
                      className="btn-danger text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ejercicios del día ── */}
      <Modal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        title={selectedDate ? `${editingRutina && editingDiaId === null ? '➕ Nuevo día — ' : ''}${format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}` : ''}
        size="lg"
      >
        <div className="space-y-4">
          {dayExercicios.map((ej, idx) => (
            <div key={idx} className="p-4 bg-dark-50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-dark-700">Ejercicio {idx + 1}</span>
                {dayExercicios.length > 1 && (
                  <button onClick={() => removeEjercicio(idx)} className="text-red-500 hover:text-red-700 text-xs">
                    Quitar
                  </button>
                )}
              </div>

              <div>
                <label className="input-label">Ejercicio *</label>
                <select
                  value={ej.ejercicioId}
                  onChange={(e) => updateEjercicio(idx, 'ejercicioId', parseInt(e.target.value))}
                  className="input-field"
                >
                  <option value={0}>Seleccionar ejercicio</option>
                  {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.titulo}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Repeticiones objetivo</label>
                  <input type="number" min={0} value={ej.repeticionesObj}
                    onChange={(e) => updateEjercicio(idx, 'repeticionesObj', e.target.value)}
                    className="input-field" placeholder="Ej: 15" />
                </div>
                <div>
                  <label className="input-label">Tiempo objetivo (seg)</label>
                  <input type="number" min={0} value={ej.tiempoObjetivoSeg}
                    onChange={(e) => updateEjercicio(idx, 'tiempoObjetivoSeg', e.target.value)}
                    className="input-field" placeholder="Ej: 60" />
                </div>
              </div>

              <div>
                <label className="input-label">Comentario del coach</label>
                <input type="text" value={ej.comentarioCoach}
                  onChange={(e) => updateEjercicio(idx, 'comentarioCoach', e.target.value)}
                  className="input-field" placeholder="Instrucciones adicionales..." />
              </div>
            </div>
          ))}

          {dayExercicios.length < 5 && (
            <button onClick={addEjercicio} className="btn-secondary w-full text-sm">
              + Agregar ejercicio ({dayExercicios.length}/5)
            </button>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={saveDayExercicios} disabled={isSaving} className="btn-primary flex-1">
              {isSaving ? 'Guardando...' : (editingDiaId ? 'Guardar cambios' : 'Guardar día')}
            </button>
            <button onClick={() => setIsDayModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
