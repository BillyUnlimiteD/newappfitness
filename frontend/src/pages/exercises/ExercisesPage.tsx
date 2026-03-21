import { useState, useEffect, useRef } from 'react';
import { exercisesService } from '../../services/exercises.service';
import { Ejercicio, GrupoMuscular } from '../../types';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const GRUPOS: GrupoMuscular[] = [
  'PECHO','ESPALDA','HOMBROS','BICEPS','TRICEPS','ABDOMEN',
  'GLUTEOS','CUADRICEPS','ISQUIOTIBIALES','PANTORRILLAS','CUERPO_COMPLETO','OTRO',
];

const GRUPOS_LABEL: Record<GrupoMuscular, string> = {
  PECHO: 'Pecho', ESPALDA: 'Espalda', HOMBROS: 'Hombros', BICEPS: 'Bíceps',
  TRICEPS: 'Tríceps', ABDOMEN: 'Abdomen', GLUTEOS: 'Glúteos', CUADRICEPS: 'Cuádriceps',
  ISQUIOTIBIALES: 'Isquiotibiales', PANTORRILLAS: 'Pantorrillas', CUERPO_COMPLETO: 'Cuerpo completo', OTRO: 'Otro',
};

interface FormData {
  titulo: string;
  descripcion: string;
  grupoMuscular: GrupoMuscular | '';
  videoUrl: string;
  videoFile: File | null;
}

const defaultForm: FormData = { titulo: '', descripcion: '', grupoMuscular: '', videoUrl: '', videoFile: null };

export default function ExercisesPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('ADMINISTRADOR', 'COACH');

  const [exercises, setExercises] = useState<Ejercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editExercise, setEditExercise] = useState<Ejercicio | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadExercises = async (q?: string) => {
    setIsLoading(true);
    try {
      const data = await exercisesService.listar(q);
      setExercises(data);
    } catch { setError('Error al cargar ejercicios'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadExercises(); }, []);

  const handleSearch = (q: string) => { setSearchQ(q); loadExercises(q || undefined); };

  const openCreate = () => { setEditExercise(null); setForm(defaultForm); setIsModalOpen(true); };
  const openEdit = (e: Ejercicio) => {
    setEditExercise(e);
    setForm({ titulo: e.titulo, descripcion: e.descripcion || '', grupoMuscular: e.grupoMuscular || '', videoUrl: e.videoUrl || '', videoFile: null });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) { setError('El título es obligatorio'); return; }
    setIsSaving(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('titulo', form.titulo);
      if (form.descripcion) fd.append('descripcion', form.descripcion);
      if (form.grupoMuscular) fd.append('grupoMuscular', form.grupoMuscular);
      if (form.videoFile) {
        fd.append('video', form.videoFile);
      } else if (form.videoUrl) {
        fd.append('videoUrl', form.videoUrl);
      }

      if (editExercise) {
        await exercisesService.actualizar(editExercise.id, fd);
        setSuccess('Ejercicio actualizado');
      } else {
        await exercisesService.crear(fd);
        setSuccess('Ejercicio creado');
      }
      setIsModalOpen(false);
      loadExercises(searchQ || undefined);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este ejercicio?')) return;
    try {
      await exercisesService.eliminar(id);
      setSuccess('Ejercicio eliminado');
      loadExercises(searchQ || undefined);
    } catch { setError('Error al eliminar'); }
  };

  const getVideoPreview = (ex: Ejercicio) => {
    if (!ex.videoUrl) return null;
    if (ex.videoUrl.startsWith('/uploads/')) {
      return <video src={ex.videoUrl} className="w-24 h-14 object-cover rounded-lg" muted />;
    }
    return (
      <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-xs">
        Ver video ↗
      </a>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Mantenedor de Ejercicios</h1>
          <p className="text-dark-500 mt-0.5">{exercises.length} ejercicios disponibles</p>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo ejercicio
          </button>
        )}
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="card mb-4">
        <input
          type="text"
          value={searchQ}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar ejercicio por título..."
          className="input-field"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exercises.map((ex) => (
            <div key={ex.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-dark-900">{ex.titulo}</h3>
                {ex.grupoMuscular && (
                  <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {GRUPOS_LABEL[ex.grupoMuscular]}
                  </span>
                )}
              </div>

              {ex.descripcion && (
                <p className="text-sm text-dark-500 line-clamp-2">{ex.descripcion}</p>
              )}

              {getVideoPreview(ex)}

              {canEdit && (
                <div className="flex gap-2 mt-auto pt-2 border-t border-dark-100">
                  <button onClick={() => openEdit(ex)} className="btn-secondary text-xs py-1.5 px-3 flex-1">Editar</button>
                  <button onClick={() => handleDelete(ex.id)} className="btn-danger text-xs py-1.5 px-3">Eliminar</button>
                </div>
              )}
            </div>
          ))}
          {exercises.length === 0 && (
            <div className="col-span-full text-center py-12 text-dark-400">
              No hay ejercicios. {canEdit && 'Crea el primero.'}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editExercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}>
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        <div className="space-y-4 mt-2">
          <div>
            <label className="input-label">Título *</label>
            <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="input-field" placeholder="Ej: Sentadilla básica" />
          </div>

          <div>
            <label className="input-label">Descripción</label>
            <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="input-field min-h-[80px]" placeholder="Describe cómo realizar el ejercicio..." />
          </div>

          <div>
            <label className="input-label">Grupo muscular</label>
            <select value={form.grupoMuscular} onChange={(e) => setForm({ ...form, grupoMuscular: e.target.value as GrupoMuscular | '' })} className="input-field">
              <option value="">Sin especificar</option>
              {GRUPOS.map((g) => <option key={g} value={g}>{GRUPOS_LABEL[g]}</option>)}
            </select>
          </div>

          <div>
            <label className="input-label">Video</label>
            <div className="space-y-2">
              <input type="text" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value, videoFile: null })} className="input-field" placeholder="URL del video (YouTube, Vimeo, etc.)" />
              <p className="text-xs text-dark-400">O sube un archivo:</p>
              <input ref={fileInputRef} type="file" accept="video/*" className="text-sm text-dark-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setForm({ ...form, videoFile: file, videoUrl: file ? '' : form.videoUrl });
                }}
              />
              {form.videoFile && <p className="text-xs text-green-600">Archivo: {form.videoFile.name}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={isSaving} className="btn-primary flex-1">
              {isSaving ? 'Guardando...' : (editExercise ? 'Actualizar' : 'Crear ejercicio')}
            </button>
            <button onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
