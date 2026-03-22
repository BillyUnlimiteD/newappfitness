import { useState, useEffect, useCallback } from 'react';
import { usersService } from '../../services/users.service';
import { Usuario, TipoUsuario } from '../../types';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import RoleBadge from '../../components/common/RoleBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const TIPO_OPTIONS: TipoUsuario[] = ['ADMINISTRADOR', 'COACH', 'APODERADO', 'USUARIO'];

interface UserFormData {
  correo: string;
  tipoUsuario: TipoUsuario;
  nombre: string;
  apellido: string;
  rut: string;
  telefonoContacto: string;
  coachId: string;
}

type UsuarioSimple = { id: number; nombre: string | null; apellido: string | null; correo: string; rut: string | null };

const defaultForm: UserFormData = {
  correo: '', tipoUsuario: 'USUARIO', nombre: '', apellido: '', rut: '', telefonoContacto: '', coachId: '',
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [coaches, setCoaches] = useState<{ id: number; nombre: string | null; apellido: string | null; correo: string }[]>([]);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<UsuarioSimple[]>([]);
  const [supervisadosSeleccionados, setSupervisadosSeleccionados] = useState<number[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<Usuario | null>(null);
  const [form, setForm] = useState<UserFormData>(defaultForm);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [tempPass, setTempPass] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  // Modal de supervisados
  const [supModal, setSupModal] = useState<{
    isOpen: boolean;
    apoderado: Usuario | null;
    lista: UsuarioSimple[];
    isLoading: boolean;
  }>({ isOpen: false, apoderado: null, lista: [], isLoading: false });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersData, coachesData] = await Promise.all([
        usersService.listar(filtroTipo || undefined),
        usersService.listarCoaches(),
      ]);
      setUsers(usersData);
      setCoaches(coachesData);
      setUsuariosDisponibles(usersData.filter((u) => u.tipoUsuario === 'USUARIO') as UsuarioSimple[]);
    } catch {
      setError('Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  }, [filtroTipo]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => { setEditUser(null); setForm(defaultForm); setTempPass(''); setIsModalOpen(true); };
  const openEdit = async (u: Usuario) => {
    setEditUser(u);
    setForm({
      correo: u.correo,
      tipoUsuario: u.tipoUsuario,
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      rut: u.rut || '',
      telefonoContacto: u.telefonoContacto || '',
      coachId: u.coachAsignado?.coach.id.toString() || '',
    });
    setSupervisadosSeleccionados([]);
    if (u.tipoUsuario === 'APODERADO') {
      try {
        const supervisados = await usersService.listarSupervisados(u.id);
        setSupervisadosSeleccionados(supervisados.map((s) => s.id));
      } catch {
        // si falla, empieza vacío
      }
    }
    setTempPass('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        coachId: form.coachId ? parseInt(form.coachId) : undefined,
      };

      if (editUser) {
        const { correo: _c, ...updatePayload } = payload;
        await usersService.actualizar(editUser.id, updatePayload);
        if (form.tipoUsuario === 'APODERADO') {
          await usersService.setSupervisados(editUser.id, supervisadosSeleccionados);
        }
        setSuccess('Usuario actualizado correctamente');
      } else {
        const result = await usersService.crear(payload);
        setTempPass(result.tempPassword);
        setSuccess('Usuario creado. Contraseña temporal generada.');
      }
      await loadData();
      if (!tempPass) setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Error al guardar usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActivo = async (u: Usuario) => {
    const accion = u.activo ? 'bloquear' : 'activar';
    if (!confirm(`¿Deseas ${accion} al usuario ${u.nombre || u.correo}?`)) return;
    try {
      const updated = await usersService.toggleActivo(u.id);
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? { ...x, activo: updated.activo } : x)));
      setSuccess(`Usuario ${updated.activo ? 'activado' : 'bloqueado'} correctamente`);
    } catch {
      setError('Error al cambiar estado del usuario');
    }
  };

  const handleResetPassword = async (userId: number) => {
    if (!confirm('¿Resetear la contraseña de este usuario?')) return;
    try {
      const result = await usersService.resetearPassword(userId);
      setTempPass(result.tempPassword);
      setSuccess('Contraseña reseteada');
    } catch {
      setError('Error al resetear contraseña');
    }
  };

  const openSupModal = async (u: Usuario) => {
    setSupModal({ isOpen: true, apoderado: u, lista: [], isLoading: true });
    try {
      const lista = await usersService.listarSupervisados(u.id);
      setSupModal((prev) => ({ ...prev, lista: lista as UsuarioSimple[], isLoading: false }));
    } catch {
      setSupModal((prev) => ({ ...prev, isLoading: false }));
      setError('Error al cargar supervisados');
    }
  };

  const handleRemoveSupervisado = async (supervisadoId: number) => {
    if (!supModal.apoderado) return;
    const nuevosIds = supModal.lista.filter((s) => s.id !== supervisadoId).map((s) => s.id);
    try {
      await usersService.setSupervisados(supModal.apoderado.id, nuevosIds);
      setSupModal((prev) => ({ ...prev, lista: prev.lista.filter((s) => s.id !== supervisadoId) }));
      setSuccess('Supervisado eliminado');
    } catch {
      setError('Error al eliminar supervisado');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (
      u.correo.toLowerCase().includes(q) ||
      (u.nombre || '').toLowerCase().includes(q) ||
      (u.apellido || '').toLowerCase().includes(q) ||
      (u.rut || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Administrador de Usuarios</h1>
          <p className="text-dark-500 mt-0.5">{users.length} usuarios registrados</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Contraseña temporal generada */}
      {tempPass && (
        <div className="my-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
          <p className="font-semibold text-yellow-800 mb-1">⚠ Contraseña temporal generada:</p>
          <code className="text-2xl font-mono font-bold text-yellow-900 bg-yellow-100 px-4 py-2 rounded-lg block">{tempPass}</code>
          <p className="text-xs text-yellow-700 mt-2">Comparte esta contraseña con el usuario. Se le pedirá cambiarla al ingresar.</p>
          <button onClick={() => setTempPass('')} className="mt-2 text-xs text-yellow-600 underline">Ocultar</button>
        </div>
      )}

      {/* Filtros */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Buscar por nombre, correo o RUT..."
            className="input-field flex-1"
          />
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="input-field sm:w-48">
            <option value="">Todos los roles</option>
            {TIPO_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-dark-50 border-b border-dark-100">
                  <th className="text-left px-4 py-3 font-semibold text-dark-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-dark-600">Correo</th>
                  <th className="text-left px-4 py-3 font-semibold text-dark-600">RUT</th>
                  <th className="text-left px-4 py-3 font-semibold text-dark-600">Rol</th>
                  <th className="text-left px-4 py-3 font-semibold text-dark-600">Coach / Supervisados</th>
                  <th className="text-left px-4 py-3 font-semibold text-dark-600">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-dark-600">Última conexión</th>
                  <th className="text-right px-4 py-3 font-semibold text-dark-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-50">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-dark-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-dark-900">
                      {u.nombre ? `${u.nombre} ${u.apellido}` : <span className="text-dark-400 italic">Sin nombre</span>}
                    </td>
                    <td className="px-4 py-3 text-dark-600">{u.correo}</td>
                    <td className="px-4 py-3 text-dark-500">{u.rut || '-'}</td>
                    <td className="px-4 py-3"><RoleBadge role={u.tipoUsuario} /></td>
                    <td className="px-4 py-3 text-dark-500">
                      {u.tipoUsuario === 'APODERADO' ? (
                        <button
                          onClick={() => openSupModal(u)}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium underline"
                        >
                          Ver supervisados
                        </button>
                      ) : u.coachAsignado?.coach ? (
                        `${u.coachAsignado.coach.nombre} ${u.coachAsignado.coach.apellido}`
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-green-500' : 'bg-red-500'}`} />
                        {u.activo ? 'Activo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-dark-500 text-xs">
                      {u.ultimaConexion
                        ? new Date(u.ultimaConexion).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
                        : <span className="italic text-dark-400">Nunca</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(u)} className="text-primary-600 hover:text-primary-700 text-xs font-medium px-2 py-1 rounded hover:bg-primary-50 transition-colors">
                          Editar
                        </button>
                        <button onClick={() => handleResetPassword(u.id)} className="text-orange-600 hover:text-orange-700 text-xs font-medium px-2 py-1 rounded hover:bg-orange-50 transition-colors">
                          Reset Pass
                        </button>
                        <button
                          onClick={() => handleToggleActivo(u)}
                          className={`text-xs font-medium px-2 py-1 rounded transition-colors ${u.activo ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}`}
                        >
                          {u.activo ? 'Bloquear' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-dark-400">No se encontraron usuarios</div>
            )}
          </div>
        </div>
      )}

      {/* Modal supervisados */}
      <Modal
        isOpen={supModal.isOpen}
        onClose={() => setSupModal((p) => ({ ...p, isOpen: false }))}
        title={`Supervisados de ${supModal.apoderado?.nombre || supModal.apoderado?.correo}`}
      >
        {supModal.isLoading ? (
          <LoadingSpinner />
        ) : supModal.lista.length === 0 ? (
          <p className="text-dark-400 text-sm py-4 text-center">Este apoderado no tiene usuarios supervisados asignados.</p>
        ) : (
          <div className="divide-y divide-dark-100">
            {supModal.lista.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-dark-900">
                    {s.nombre ? `${s.nombre} ${s.apellido}` : s.correo}
                  </p>
                  <p className="text-xs text-dark-400">{s.correo}{s.rut ? ` · ${s.rut}` : ''}</p>
                </div>
                <button
                  onClick={() => handleRemoveSupervisado(s.id)}
                  className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-3 border-t border-dark-100 mt-2">
          <button
            onClick={() => setSupModal((p) => ({ ...p, isOpen: false }))}
            className="btn-secondary w-full"
          >
            Cerrar
          </button>
        </div>
      </Modal>

      {/* Modal crear/editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editUser ? 'Editar usuario' : 'Nuevo usuario'}
      >
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Nombre</label>
              <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="input-label">Apellido</label>
              <input type="text" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} className="input-field" />
            </div>
          </div>

          <div>
            <label className="input-label">Correo {!editUser && '*'}</label>
            <input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} className="input-field" disabled={!!editUser} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">RUT</label>
              <input type="text" value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} className="input-field" placeholder="12345678-9" />
            </div>
            <div>
              <label className="input-label">Teléfono</label>
              <input type="tel" value={form.telefonoContacto} onChange={(e) => setForm({ ...form, telefonoContacto: e.target.value })} className="input-field" />
            </div>
          </div>

          <div>
            <label className="input-label">Tipo de usuario</label>
            <select value={form.tipoUsuario} onChange={(e) => setForm({ ...form, tipoUsuario: e.target.value as TipoUsuario })} className="input-field">
              {TIPO_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {form.tipoUsuario === 'USUARIO' && (
            <div>
              <label className="input-label">Coach asignado</label>
              <select value={form.coachId} onChange={(e) => setForm({ ...form, coachId: e.target.value })} className="input-field">
                <option value="">Sin coach asignado</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.apellido} ({c.correo})</option>
                ))}
              </select>
            </div>
          )}

          {form.tipoUsuario === 'APODERADO' && editUser && (
            <div>
              <label className="input-label">
                Usuarios supervisados
                <span className="ml-2 text-xs text-dark-400 font-normal">({supervisadosSeleccionados.length} seleccionado{supervisadosSeleccionados.length !== 1 ? 's' : ''})</span>
              </label>
              {usuariosDisponibles.length === 0 ? (
                <p className="text-sm text-dark-400 italic">No hay usuarios de tipo USUARIO disponibles.</p>
              ) : (
                <div className="border border-dark-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-dark-100">
                  {usuariosDisponibles.map((u) => {
                    const checked = supervisadosSeleccionados.includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-dark-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSupervisadosSeleccionados((prev) =>
                              checked ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                            )
                          }
                          className="w-4 h-4 accent-primary-600"
                        />
                        <span className="text-sm text-dark-800">
                          {u.nombre ? `${u.nombre} ${u.apellido}` : u.correo}
                          {u.rut && <span className="text-dark-400 ml-1">· {u.rut}</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={isSaving} className="btn-primary flex-1">
              {isSaving ? 'Guardando...' : (editUser ? 'Actualizar' : 'Crear usuario')}
            </button>
            <button onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
