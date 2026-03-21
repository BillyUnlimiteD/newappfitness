import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiResponse } from '../types';

// Manejador centralizado de errores - siempre al final del stack de middlewares
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[ERROR]', err);

  // Errores de validación de Zod
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const path = e.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(e.message);
    });
    const response: ApiResponse = {
      success: false,
      message: 'Error de validación',
      errors,
    };
    res.status(422).json(response);
    return;
  }

  // Errores personalizados con código HTTP
  if ('statusCode' in err) {
    const httpErr = err as Error & { statusCode: number };
    res.status(httpErr.statusCode).json({
      success: false,
      message: httpErr.message,
    });
    return;
  }

  // Error genérico del servidor
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
  });
};

// Helper para crear errores con código HTTP
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}
