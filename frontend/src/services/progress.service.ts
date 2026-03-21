import api from './api';
import { ApiResponse, ProgresoEjercicioUsuario, ProgresoRutinaResponse } from '../types';

export const progressService = {
  async registrar(payload: {
    rutinaDiaEjercicioId: number;
    fecha: string;
    repeticionesRealizadas?: number;
    tiempoRealizadoSeg?: number;
    completado: boolean;
  }): Promise<ProgresoEjercicioUsuario> {
    const { data } = await api.post<ApiResponse<ProgresoEjercicioUsuario>>('/progress', payload);
    return data.data!;
  },

  async obtenerPorRutina(rutinaId: number): Promise<ProgresoRutinaResponse> {
    const { data } = await api.get<ApiResponse<ProgresoRutinaResponse>>(`/progress/rutina/${rutinaId}`);
    return data.data!;
  },
};
