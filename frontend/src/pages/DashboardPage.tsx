import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const roleWelcome: Record<string, { title: string; description: string; links: { to: string; label: string; icon: string; color: string }[] }> = {
  ADMINISTRADOR: {
    title: 'Panel de Administración',
    description: 'Gestiona usuarios, coaches y toda la plataforma.',
    links: [
      { to: '/admin/users', label: 'Administrar Usuarios', icon: '👥', color: 'bg-purple-50 border-purple-200 text-purple-700' },
      { to: '/exercises', label: 'Mantenedor de Ejercicios', icon: '🏋️', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    ],
  },
  COACH: {
    title: 'Panel del Coach',
    description: 'Gestiona tus rutinas y el progreso de tus usuarios.',
    links: [
      { to: '/exercises', label: 'Ejercicios', icon: '🏋️', color: 'bg-blue-50 border-blue-200 text-blue-700' },
      { to: '/routines/manage', label: 'Crear Rutinas', icon: '📋', color: 'bg-green-50 border-green-200 text-green-700' },
      { to: '/routines/review', label: 'Seguimiento', icon: '📊', color: 'bg-accent-50 border-accent-200 text-accent-700' },
    ],
  },
  USUARIO: {
    title: 'Mi Entrenamiento',
    description: 'Revisa tu rutina y registra tu progreso diario.',
    links: [
      { to: '/my-routine', label: 'Ver mi Rutina', icon: '⚡', color: 'bg-accent-50 border-accent-200 text-accent-700' },
      { to: '/profile', label: 'Mi Perfil', icon: '👤', color: 'bg-primary-50 border-primary-200 text-primary-700' },
    ],
  },
  APODERADO: {
    title: 'Panel del Apoderado',
    description: 'Monitorea el progreso de tus supervisados.',
    links: [
      { to: '/supervised', label: 'Ver Supervisados', icon: '👁️', color: 'bg-green-50 border-green-200 text-green-700' },
      { to: '/profile', label: 'Mi Perfil', icon: '👤', color: 'bg-primary-50 border-primary-200 text-primary-700' },
    ],
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.tipoUsuario || 'USUARIO';
  const config = roleWelcome[role] || roleWelcome.USUARIO;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">
          ¡Hola, {user?.nombre || user?.correo}! 👋
        </h1>
        <p className="text-dark-500 mt-1">{config.description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {config.links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`card-hover border-2 ${link.color} flex items-center gap-4`}
          >
            <span className="text-3xl">{link.icon}</span>
            <div>
              <p className="font-semibold">{link.label}</p>
              <p className="text-xs opacity-70 mt-0.5">Ir a sección →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
