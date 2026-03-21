import { Response } from 'express';
import { AuthRequest } from '../types';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/response.utils';
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from '../validators/auth.validator';

export class AuthController {
  async login(req: AuthRequest, res: Response): Promise<void> {
    const data = loginSchema.parse(req.body);
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || 'desconocida';
    const result = await authService.login(data, ip);
    sendSuccess(res, result, 'Login exitoso');
  }

  async register(req: AuthRequest, res: Response): Promise<void> {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    sendSuccess(res, result, 'Usuario registrado correctamente', 201);
  }

  async refreshToken(req: AuthRequest, res: Response): Promise<void> {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    const result = await authService.refreshToken(refreshToken);
    sendSuccess(res, result, 'Token renovado');
  }

  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    const data = changePasswordSchema.parse(req.body);
    const result = await authService.changePassword(req.user!.userId, data);
    sendSuccess(res, result, result.message);
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    const { prisma } = await import('../lib/prisma');
    const user = await prisma.usuario.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        correo: true,
        nombre: true,
        apellido: true,
        rut: true,
        telefonoContacto: true,
        tipoUsuario: true,
        perfilCompleto: true,
        passwordTemporal: true,
        activo: true,
        creadoEn: true,
      },
    });
    sendSuccess(res, user);
  }
}

export const authController = new AuthController();
