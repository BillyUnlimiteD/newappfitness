import api from './api';
import { ApiResponse, Rutina } from '../types';

export const routinesService = {
  async listar(usuarioId?: number): Promise<Rutina[]> {
    const { data } = await api.get<ApiResponse<Rutina[]>>('/routines', {
      params: usuarioId ? { usuarioId } : {},
    });
    return data.data!;
  },

  async obtener(id: number): Promise<Rutina> {
    const { data } = await api.get<ApiResponse<Rutina>>(`/routines/${id}`);
    return data.data!;
  },

  async crear(payload: {
    usuarioId: number;
    fechaInicio: string;
    fechaFin: string;
    tipoPeriodo: string;
    dias: {
      fecha: string;
      ejercicios: {
        ejercicioId: number;
        orden: number;
        repeticionesObj?: number;
        tiempoObjetivoSeg?: number;
        comentarioCoach?: string;
      }[];
    }[];
  }): Promise<Rutina> {
    const { data } = await api.post<ApiResponse<Rutina>>('/routines', payload);
    return data.data!;
  },

  async actualizarDia(
    rutinaId: number,
    diaId: number,
    ejercicios: { ejercicioId: number; orden: number; repeticionesObj?: number; tiempoObjetivoSeg?: number; comentarioCoach?: string }[]
  ) {
    const { data } = await api.put<ApiResponse>(`/routines/${rutinaId}/dias/${diaId}`, { ejercicios });
    return data.data;
  },

  async calificar(id: number, nota: number): Promise<void> {
    await api.put(`/routines/${id}/nota`, { nota });
  },

  async agregarDia(
    rutinaId: number,
    fecha: string,
    ejercicios: { ejercicioId: number; orden: number; repeticionesObj?: number; tiempoObjetivoSeg?: number; comentarioCoach?: string }[]
  ) {
    const { data } = await api.post<ApiResponse>(`/routines/${rutinaId}/dias`, { fecha, ejercicios });
    return data.data;
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`/routines/${id}`);
  },
};
