import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usersService } from '../../services/users.service';
import Alert from '../../components/common/Alert';

export default function CompleteProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    rut: '',
    telefonoContacto: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await usersService.completarPerfil(form);
      // Actualizar tokens con el nuevo estado (perfilCompleto = true)
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      updateUser({ ...result.user, perfilCompleto: true } as Parameters<typeof updateUser>[0]);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Error al guardar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-500 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Completa tu perfil</h1>
          <p className="text-primary-200 mt-1">Necesitamos algunos datos antes de continuar</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="mb-4">
              <Alert type="error" message={error} onClose={() => setError('')} />
            </div>
          )}

          <div className="mb-4 p-3 bg-primary-50 rounded-xl">
            <p className="text-sm text-primary-700">
              Sesión activa: <strong>{user?.correo}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Nombre *</label>
                <input type="text" value={form.nombre} onChange={handleChange('nombre')}
                  className="input-field" placeholder="Juan" required />
              </div>
              <div>
                <label className="input-label">Apellido *</label>
                <input type="text" value={form.apellido} onChange={handleChange('apellido')}
                  className="input-field" placeholder="Pérez" required />
              </div>
            </div>

            <div>
              <label className="input-label">RUT *</label>
              <input type="text" value={form.rut} onChange={handleChange('rut')}
                className="input-field" placeholder="12345678-9" required />
              <p className="text-xs text-dark-400 mt-1">Formato: 12345678-9</p>
            </div>

            <div>
              <label className="input-label">Teléfono de contacto *</label>
              <input type="tel" value={form.telefonoContacto} onChange={handleChange('telefonoContacto')}
                className="input-field" placeholder="+56912345678" required />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
              {isLoading ? 'Guardando...' : 'Guardar y continuar'}
            </button>
          </form>

          <button onClick={logout} className="w-full text-center text-sm text-dark-400 hover:text-dark-600 mt-4 transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
