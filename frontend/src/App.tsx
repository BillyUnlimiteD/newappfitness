import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CompleteProfilePage from './pages/auth/CompleteProfilePage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';

// App pages
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/profile/ProfilePage';
import UsersAdminPage from './pages/admin/UsersAdminPage';
import ImportUsersPage from './pages/admin/ImportUsersPage';
import LoginLogsPage from './pages/admin/LoginLogsPage';
import ReportPage from './pages/routines/ReportPage';
import ExercisesPage from './pages/exercises/ExercisesPage';
import RoutinesManagerPage from './pages/routines/RoutinesManagerPage';
import RoutinesReviewPage from './pages/routines/RoutinesReviewPage';
import UserRoutinePage from './pages/user/UserRoutinePage';
import SupervisedPage from './pages/apoderado/SupervisedPage';
import CoursesAdminPage from './pages/admin/CoursesAdminPage';
import CourseManagerPage from './pages/courses/CourseManagerPage';
import CourseReportPage from './pages/courses/CourseReportPage';
import UserCoursePage from './pages/user/UserCoursePage';

function AppRoutes() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />

      {/* Flujos especiales (requieren auth pero no perfil completo) */}
      <Route path="/complete-profile" element={
        isAuthenticated ? (
          user?.passwordTemporal ? <Navigate to="/change-password" /> :
          user?.perfilCompleto ? <Navigate to="/dashboard" /> :
          <CompleteProfilePage />
        ) : <Navigate to="/login" />
      } />
      <Route path="/change-password" element={
        isAuthenticated ? <ChangePasswordPage /> : <Navigate to="/login" />
      } />

      {/* Layout principal (protegido) */}
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Admin */}
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
            <UsersAdminPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/import" element={
          <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
            <ImportUsersPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/login-logs" element={
          <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
            <LoginLogsPage />
          </ProtectedRoute>
        } />

        {/* Ejercicios (admin y coach) */}
        <Route path="/exercises" element={
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'COACH']}>
            <ExercisesPage />
          </ProtectedRoute>
        } />

        {/* Rutinas - Coach */}
        <Route path="/routines/manage" element={
          <ProtectedRoute allowedRoles={['COACH']}>
            <RoutinesManagerPage />
          </ProtectedRoute>
        } />
        <Route path="/routines/review" element={
          <ProtectedRoute allowedRoles={['COACH']}>
            <RoutinesReviewPage />
          </ProtectedRoute>
        } />
        <Route path="/routines/report" element={
          <ProtectedRoute allowedRoles={['COACH']}>
            <ReportPage />
          </ProtectedRoute>
        } />

        {/* Rutina - Usuario */}
        <Route path="/my-routine" element={
          <ProtectedRoute allowedRoles={['USUARIO']}>
            <UserRoutinePage />
          </ProtectedRoute>
        } />

        {/* Supervisados - Apoderado */}
        <Route path="/supervised" element={
          <ProtectedRoute allowedRoles={['APODERADO']}>
            <SupervisedPage />
          </ProtectedRoute>
        } />

        {/* Cursos - Admin */}
        <Route path="/admin/courses" element={
          <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
            <CoursesAdminPage />
          </ProtectedRoute>
        } />

        {/* Cursos - Coach */}
        <Route path="/courses/manage" element={
          <ProtectedRoute allowedRoles={['COACH']}>
            <CourseManagerPage />
          </ProtectedRoute>
        } />
        <Route path="/courses/report" element={
          <ProtectedRoute allowedRoles={['COACH', 'ADMINISTRADOR']}>
            <CourseReportPage />
          </ProtectedRoute>
        } />

        {/* Cursos - Usuario */}
        <Route path="/my-courses" element={
          <ProtectedRoute allowedRoles={['USUARIO']}>
            <UserCoursePage />
          </ProtectedRoute>
        } />
      </Route>

      {/* Fallbacks */}
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
