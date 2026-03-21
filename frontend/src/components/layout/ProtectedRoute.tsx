import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TipoUsuario } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';

interface Props {
  children: React.ReactNode;
  allowedRoles?: TipoUsuario[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingSpinner fullScreen />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Si la contraseña es temporal, forzar cambio
  if (user?.passwordTemporal) return <Navigate to="/change-password" replace />;

  // Si el perfil está incompleto, forzar completarlo
  if (!user?.perfilCompleto) return <Navigate to="/complete-profile" replace />;

  // Si requiere rol específico
  if (allowedRoles && user && !allowedRoles.includes(user.tipoUsuario)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
