import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

const roleBgClass: Record<string, string> = {
  USUARIO: 'bg-role-usuario',
  APODERADO: 'bg-role-apoderado',
  COACH: 'bg-role-coach',
  ADMINISTRADOR: 'bg-role-admin',
};

export default function Layout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user } = useAuth();
  const bgClass = roleBgClass[user?.tipoUsuario ?? ''] ?? 'bg-dark-50';

  return (
    <div className={`flex h-screen ${bgClass} overflow-hidden`}>
      <Sidebar isMobileOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden bg-white border-b border-dark-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-xl text-dark-600 hover:bg-dark-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-dark-900">FitTrack</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
