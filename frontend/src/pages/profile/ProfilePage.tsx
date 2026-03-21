import { useState, FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usersService } from '../../services/users.service';
import Alert from '../../components/common/Alert';
import RoleBadge from '../../components/common/RoleBadge';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    telefonoContacto: '',
    lesiones: '',
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Cambio de contraseña
  const [pwForm, setPwForm] = useState({ passwordActual: '', passwordNueva: '', passwordConfirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [isSavingPw, setIsSavingPw] = useState(false);
  const [showPwSection, setShowPwSection] = useState(false);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleChangePw = async (e: FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (pwForm.passwordNueva !== pwForm.passwordConfirm) {
      setPwError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (pwForm.passwordNueva.length < 8) {
      setPwError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    setIsSavingPw(true);
    try {
      await usersService.cambiarPassword(pwForm.passwordActual, pwForm.passwordNueva);
      setPwSuccess('Contraseña actualizada correctamente');
      setPwForm({ passwordActual: '', passwordNueva: '', passwordConfirm: '' });
      setShowPwSection(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPwError(msg || 'Error al cambiar la contraseña');
    } finally {
      setIsSavingPw(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      const updated = await usersService.updatePerfil(form);
      updateUser({ nombre: updated.nombre, apellido: updated.apellido, telefonoContacto: updated.telefonoContacto } as Parameters<typeof updateUser>[0]);
      setSuccess('Perfil actualizado correctamente');
      setIsEditing(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Error al actualizar el perfil');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900">Mi Perfil</h1>
        <p className="text-dark-500 mt-0.5">Gestiona tu información personal</p>
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Avatar + info principal */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
            {user?.nombre?.[0]?.toUpperCase() || user?.correo[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-dark-900">
              {user?.nombre ? `${user.nombre} ${user.apellido}` : 'Sin nombre'}
            </h2>
            <p className="text-dark-500 text-sm mt-0.5">{user?.correo}</p>
            <div className="mt-2 flex items-center gap-2">
              {user?.tipoUsuario && <RoleBadge role={user.tipoUsuario} />}
              {user?.perfilCompleto && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Perfil completo
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {pwSuccess && <Alert type="success" message={pwSuccess} onClose={() => setPwSuccess('')} />}

      {/* Datos del perfil */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-dark-900">Información personal</h3>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="btn-secondary text-sm">
              Editar
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Nombre</label>
                <input type="text" value={form.nombre} onChange={handleChange('nombre')} className="input-field" />
              </div>
              <div>
                <label className="input-label">Apellido</label>
                <input type="text" value={form.apellido} onChange={handleChange('apellido')} className="input-field" />
              </div>
            </div>

            <div>
              <label className="input-label">Teléfono de contacto</label>
              <input type="tel" value={form.telefonoContacto} onChange={handleChange('telefonoContacto')} className="input-field" placeholder="+56912345678" />
            </div>

            <div>
              <label className="input-label">Lesiones o malformaciones físicas</label>
              <textarea
                value={form.lesiones}
                onChange={(e) => setForm((prev) => ({ ...prev, lesiones: e.target.value }))}
                className="input-field min-h-[100px] resize-y"
                placeholder="Describe cualquier lesión, limitación física o condición médica relevante para tu entrenamiento..."
              />
              <p className="text-xs text-dark-400 mt-1">Esta información es visible para tu coach y apoderado.</p>
            </div>

            {/* RUT: solo lectura una vez asignado */}
            <div>
              <label className="input-label">RUT</label>
              <div className="input-field bg-dark-50 text-dark-500 cursor-not-allowed">
                {/* El RUT es readonly después de ser asignado */}
                {user?.rut || 'No asignado'}
              </div>
              <p className="text-xs text-dark-400 mt-1">El RUT no puede modificarse una vez registrado.</p>
            </div>

            <div>
              <label className="input-label">Correo electrónico</label>
              <div className="input-field bg-dark-50 text-dark-500 cursor-not-allowed">{user?.correo}</div>
              <p className="text-xs text-dark-400 mt-1">El correo no puede modificarse.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={isSaving} className="btn-primary flex-1">
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <dl className="space-y-4">
            {[
              { label: 'Nombre completo', value: user?.nombre ? `${user.nombre} ${user.apellido}` : undefined },
              { label: 'Correo electrónico', value: user?.correo },
              { label: 'RUT', value: user?.rut },
              { label: 'Tipo de usuario', value: user?.tipoUsuario },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-1">
                <dt className="text-sm font-medium text-dark-500 sm:w-48 flex-shrink-0">{label}</dt>
                <dd className="text-dark-900 font-medium">{value || <span className="text-dark-400 italic text-sm">Sin registrar</span>}</dd>
              </div>
            ))}
            <div className="flex flex-col gap-1 pt-2 border-t border-dark-100">
              <dt className="text-sm font-medium text-dark-500">Lesiones o malformaciones físicas</dt>
              <dd className="text-dark-900 text-sm whitespace-pre-wrap">
                {(user as { lesiones?: string | null })?.lesiones || <span className="text-dark-400 italic">Sin registrar</span>}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* Cambio de contraseña */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark-900">Cambiar contraseña</h3>
          {!showPwSection && (
            <button onClick={() => setShowPwSection(true)} className="btn-secondary text-sm">
              Cambiar
            </button>
          )}
        </div>

        {showPwSection ? (
          <form onSubmit={handleChangePw} className="space-y-4">
            {pwError && <Alert type="error" message={pwError} onClose={() => setPwError('')} />}
            <div>
              <label className="input-label">Contraseña actual</label>
              <input
                type="password"
                value={pwForm.passwordActual}
                onChange={(e) => setPwForm((p) => ({ ...p, passwordActual: e.target.value }))}
                className="input-field"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="input-label">Nueva contraseña</label>
              <input
                type="password"
                value={pwForm.passwordNueva}
                onChange={(e) => setPwForm((p) => ({ ...p, passwordNueva: e.target.value }))}
                className="input-field"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="input-label">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={pwForm.passwordConfirm}
                onChange={(e) => setPwForm((p) => ({ ...p, passwordConfirm: e.target.value }))}
                className="input-field"
                autoComplete="new-password"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isSavingPw} className="btn-primary flex-1">
                {isSavingPw ? 'Guardando...' : 'Actualizar contraseña'}
              </button>
              <button
                type="button"
                onClick={() => { setShowPwSection(false); setPwError(''); setPwForm({ passwordActual: '', passwordNueva: '', passwordConfirm: '' }); }}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-dark-400">Por seguridad, te recomendamos usar una contraseña de al menos 8 caracteres.</p>
        )}
      </div>
    </div>
  );
}
