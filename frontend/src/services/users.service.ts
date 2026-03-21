import api from './api';
import { ApiResponse, Usuario } from '../types';

export const usersService = {
  // ── Perfil propio ─────────────────────────────────────────────────────
  async completarPerfil(data: { nombre: string; apellido: string; rut: string; telefonoContacto: string }) {
    const { data: res } = await api.put<ApiResponse>('/users/profile/complete', data);
    return res.data as { user: Usuario; accessToken: string; refreshToken: string };
  },

  async updatePerfil(data: { nombre?: string; apellido?: string; telefonoContacto?: string }) {
    const { data: res } = await api.put<ApiResponse<Usuario>>('/users/profile', data);
    return res.data!;
  },

  // ── Admin CRUD ────────────────────────────────────────────────────────
  async listar(tipo?: string): Promise<Usuario[]> {
    const params = tipo ? { tipo } : {};
    const { data } = await api.get<ApiResponse<Usuario[]>>('/users', { params });
    return data.data!;
  },

  async obtener(id: number): Promise<Usuario> {
    const { data } = await api.get<ApiResponse<Usuario>>(`/users/${id}`);
    return data.data!;
  },

  async crear(payload: {
    correo: string;
    tipoUsuario: string;
    nombre?: string;
    apellido?: string;
    rut?: string;
    telefonoContacto?: string;
    coachId?: number;
  }) {
    const { data } = await api.post<ApiResponse<{ user: Usuario; tempPassword: string }>>('/users', payload);
    return data.data!;
  },

  async actualizar(id: number, payload: Partial<Usuario> & { coachId?: number | null }) {
    const { data } = await api.put<ApiResponse<Usuario>>(`/users/${id}`, payload);
    return data.data!;
  },

  async resetearPassword(id: number): Promise<{ tempPassword: string }> {
    const { data } = await api.post<ApiResponse<{ tempPassword: string }>>(`/users/${id}/reset-password`);
    return data.data!;
  },

  async toggleActivo(id: number): Promise<Usuario> {
    const { data } = await api.patch<ApiResponse<Usuario>>(`/users/${id}/toggle-activo`);
    return data.data!;
  },

  async listarCoaches() {
    const { data } = await api.get<ApiResponse<{ id: number; nombre: string; apellido: string; correo: string }[]>>('/users/coaches');
    return data.data!;
  },

  async misUsuarios(): Promise<Usuario[]> {
    const { data } = await api.get<ApiResponse<Usuario[]>>('/users/my-users');
    return data.data!;
  },

  async listarSupervisados(id: number): Promise<{ id: number; nombre: string | null; apellido: string | null; correo: string; rut: string | null }[]> {
    const { data } = await api.get(`/users/${id}/supervisados`);
    return data.data!;
  },

  async setSupervisados(id: number, supervisadoIds: number[]): Promise<void> {
    await api.put(`/users/${id}/supervisados`, { supervisadoIds });
  },

  async actualizarLesiones(supervisadoId: number, lesiones: string): Promise<void> {
    await api.put(`/users/${supervisadoId}/lesiones`, { lesiones });
  },

  async cambiarPassword(passwordActual: string, passwordNueva: string): Promise<void> {
    await api.put('/users/profile/password', { passwordActual, passwordNueva });
  },

  async importar(usuarios: { correo: string; nombre?: string; apellido?: string; rut?: string; telefonoContacto?: string }[]) {
    const { data } = await api.post<ApiResponse<{
      creados: { correo: string; nombre: string | null; apellido: string | null; tempPassword: string }[];
      errores: { correo: string; error: string }[];
    }>>('/users/import', { usuarios });
    return data.data!;
  },
};
