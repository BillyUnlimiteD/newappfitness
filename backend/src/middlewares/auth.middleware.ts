import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt.utils';
import { sendError } from '../utils/response.utils';

// Verifica que el token JWT sea válido
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'Token de autenticación no proporcionado', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    sendError(res, 'Token inválido o expirado', 401);
  }
};

// Verifica que el perfil del usuario esté completo (excepto rutas de perfil)
export const requirePerfilCompleto = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user?.perfilCompleto) {
    sendError(res, 'Debes completar tu perfil antes de continuar', 403);
    return;
  }
  next();
};
