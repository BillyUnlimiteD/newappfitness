import api from './api';
import { LoginResponse, ApiResponse, AuthUser } from '../types';

export const authService = {
  async login(correo: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', { correo, password });
    return data.data!;
  },

  async register(correo: string, password: string, confirmPassword: string, tipoUsuario: string): Promise<LoginResponse> {
    const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/register', {
      correo, password, confirmPassword, tipoUsuario,
    });
    return data.data!;
  },

  async me(): Promise<AuthUser> {
    const { data } = await api.get<ApiResponse<AuthUser>>('/auth/me');
    return data.data!;
  },

  async changePassword(passwordActual: string, passwordNueva: string, confirmPassword: string) {
    const { data } = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/change-password', {
      passwordActual, passwordNueva, confirmPassword,
    });
    return data.data!;
  },

  async refreshToken(refreshToken: string) {
    const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/refresh', { refreshToken });
    return data.data!;
  },
};
