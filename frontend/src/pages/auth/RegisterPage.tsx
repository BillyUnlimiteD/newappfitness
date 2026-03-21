import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Alert from '../../components/common/Alert';
import { TipoUsuario } from '../../types';

const TIPOS: { value: TipoUsuario; label: string }[] = [
  { value: 'ADMINISTRADOR', label: 'Administrador' },
  { value: 'COACH', label: 'Coach' },
  { value: 'APODERADO', label: 'Apoderado' },
  { value: 'USUARIO', label: 'Usuario' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    correo: '',
    password: '',
    confirmPassword: '',
    tipoUsuario: 'USUARIO' as TipoUsuario,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validate = () => {
    if (!form.correo.includes('@')) return 'Ingresa un correo válido';
    if (form.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (form.password !== form.confirmPassword) return 'Las contraseñas no coinciden';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setIsLoading(true);
    setError('');
    try {
      await register(form.correo, form.password, form.confirmPassword, form.tipoUsuario);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Error al registrar usuario');
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">FitTrack</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-dark-900 mb-6">Crear cuenta</h2>

          {error && (
            <div className="mb-4">
              <Alert type="error" message={error} onClose={() => setError('')} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Correo electrónico</label>
              <input type="email" value={form.correo} onChange={handleChange('correo')}
                className="input-field" placeholder="tu@correo.cl" required />
            </div>

            <div>
              <label className="input-label">Tipo de usuario</label>
              <select value={form.tipoUsuario} onChange={handleChange('tipoUsuario')} className="input-field">
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">Contraseña</label>
              <input type="password" value={form.password} onChange={handleChange('password')}
                className="input-field" placeholder="Mínimo 6 caracteres" required />
            </div>

            <div>
              <label className="input-label">Confirmar contraseña</label>
              <input type="password" value={form.confirmPassword} onChange={handleChange('confirmPassword')}
                className="input-field" placeholder="Repite la contraseña" required />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 mt-2">
              {isLoading ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-dark-500 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
