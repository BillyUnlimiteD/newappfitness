import api from './api';
import { ApiResponse, Ejercicio } from '../types';

export const exercisesService = {
  async listar(q?: string): Promise<Ejercicio[]> {
    const { data } = await api.get<ApiResponse<Ejercicio[]>>('/exercises', { params: q ? { q } : {} });
    return data.data!;
  },

  async obtener(id: number): Promise<Ejercicio> {
    const { data } = await api.get<ApiResponse<Ejercicio>>(`/exercises/${id}`);
    return data.data!;
  },

  async crear(formData: FormData): Promise<Ejercicio> {
    const { data } = await api.post<ApiResponse<Ejercicio>>('/exercises', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data!;
  },

  async actualizar(id: number, formData: FormData): Promise<Ejercicio> {
    const { data } = await api.put<ApiResponse<Ejercicio>>(`/exercises/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data!;
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`/exercises/${id}`);
  },
};
