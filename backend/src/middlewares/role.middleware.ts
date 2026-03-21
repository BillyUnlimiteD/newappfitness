import { Response, NextFunction } from 'express';
import { TipoUsuario } from '@prisma/client';
import { AuthRequest } from '../types';
import { sendError } from '../utils/response.utils';

// Factory: devuelve middleware que permite solo los roles indicados
export const authorize = (...roles: TipoUsuario[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    if (!roles.includes(req.user.tipoUsuario)) {
      sendError(res, 'No tienes permiso para realizar esta acción', 403);
      return;
    }

    next();
  };
};
