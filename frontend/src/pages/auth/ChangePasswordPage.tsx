import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import Alert from '../../components/common/Alert';

export default function ChangePasswordPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ passwordActual: '', passwordNueva: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.passwordNueva.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres'); return; }
    if (form.passwordNueva !== form.confirmPassword) { setError('Las contraseñas no coinciden'); return; }

    setIsLoading(true);
    try {
      const result = await authService.changePassword(form.passwordActual, form.passwordNueva, form.confirmPassword);
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      updateUser({ passwordTemporal: false });
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Error al cambiar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Cambio de contraseña obligatorio</h1>
          <p className="text-primary-200 mt-1">Tu contraseña fue reseteada por un administrador</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-sm text-yellow-800">
              Debes establecer una nueva contraseña para continuar usando la plataforma.
            </p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert type="error" message={error} onClose={() => setError('')} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Contraseña temporal (actual)</label>
              <input type="password" value={form.passwordActual} onChange={handleChange('passwordActual')}
                className="input-field" placeholder="Contraseña temporal recibida" required />
            </div>
            <div>
              <label className="input-label">Nueva contraseña</label>
              <input type="password" value={form.passwordNueva} onChange={handleChange('passwordNueva')}
                className="input-field" placeholder="Mínimo 6 caracteres" required />
            </div>
            <div>
              <label className="input-label">Confirmar nueva contraseña</label>
              <input type="password" value={form.confirmPassword} onChange={handleChange('confirmPassword')}
                className="input-field" placeholder="Repite la contraseña" required />
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
              {isLoading ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
