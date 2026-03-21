import { Response } from 'express';
import { AuthRequest } from '../types';
import { routinesService } from '../services/routines.service';
import { sendSuccess } from '../utils/response.utils';
import { createRutinaSchema, updateRutinaDiaSchema, agregarRutinaDiaSchema, calificarRutinaSchema } from '../validators/routines.validator';

export class RoutinesController {
  async listar(req: AuthRequest, res: Response): Promise<void> {
    const filtroUsuarioId = req.query.usuarioId ? parseInt(req.query.usuarioId as string) : undefined;
    const result = await routinesService.listar(req.user!.userId, req.user!.tipoUsuario, filtroUsuarioId);
    sendSuccess(res, result);
  }

  async obtener(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const result = await routinesService.obtener(id, req.user!.userId, req.user!.tipoUsuario);
    sendSuccess(res, result);
  }

  async crear(req: AuthRequest, res: Response): Promise<void> {
    const data = createRutinaSchema.parse(req.body);
    const result = await routinesService.crear(req.user!.userId, data);
    sendSuccess(res, result, 'Rutina creada correctamente', 201);
  }

  async actualizarDia(req: AuthRequest, res: Response): Promise<void> {
    const rutinaId = parseInt(req.params.id);
    const diaId = parseInt(req.params.diaId);
    const { ejercicios } = updateRutinaDiaSchema.parse(req.body);
    const result = await routinesService.actualizarDia(rutinaId, diaId, req.user!.userId, ejercicios);
    sendSuccess(res, result, 'Día actualizado');
  }

  async calificar(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const { nota } = calificarRutinaSchema.parse(req.body);
    const result = await routinesService.calificar(id, req.user!.userId, nota);
    sendSuccess(res, result, 'Rutina calificada');
  }

  async agregarDia(req: AuthRequest, res: Response): Promise<void> {
    const rutinaId = parseInt(req.params.id);
    const { fecha, ejercicios } = agregarRutinaDiaSchema.parse(req.body);
    const result = await routinesService.agregarDia(rutinaId, req.user!.userId, fecha, ejercicios);
    sendSuccess(res, result, 'Día agregado', 201);
  }

  async eliminar(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    await routinesService.eliminar(id, req.user!.userId);
    sendSuccess(res, null, 'Rutina eliminada');
  }
}

export const routinesController = new RoutinesController();
