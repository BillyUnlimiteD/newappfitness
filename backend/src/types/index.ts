import { TipoUsuario } from '@prisma/client';
import { Request } from 'express';

// Payload del JWT
export interface JwtPayload {
  userId: number;
  correo: string;
  tipoUsuario: TipoUsuario;
  perfilCompleto: boolean;
  passwordTemporal: boolean;
}

// Request autenticada (con usuario decodificado del token)
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// Respuesta estándar de la API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// Contraseña temporal generada
export interface TempPasswordResult {
  password: string;
  hash: string;
}
