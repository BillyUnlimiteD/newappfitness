import { Response } from 'express';
import { AuthRequest } from '../types';
import { exercisesService } from '../services/exercises.service';
import { sendSuccess } from '../utils/response.utils';
import { createEjercicioSchema, updateEjercicioSchema } from '../validators/exercises.validator';

export class ExercisesController {
  async listar(req: AuthRequest, res: Response): Promise<void> {
    const busqueda = req.query.q as string | undefined;
    const result = await exercisesService.listar(busqueda);
    sendSuccess(res, result);
  }

  async obtener(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const result = await exercisesService.obtener(id);
    sendSuccess(res, result);
  }

  async crear(req: AuthRequest, res: Response): Promise<void> {
    // El video puede venir de multer (req.file) o como URL en el body
    const body = { ...req.body };
    if (req.file) {
      // Ruta relativa desde el servidor
      body.videoUrl = `/uploads/${req.file.filename}`;
    }
    const data = createEjercicioSchema.parse(body);
    const result = await exercisesService.crear(data);
    sendSuccess(res, result, 'Ejercicio creado correctamente', 201);
  }

  async actualizar(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const body = { ...req.body };
    if (req.file) {
      body.videoUrl = `/uploads/${req.file.filename}`;
    }
    const data = updateEjercicioSchema.parse(body);
    const result = await exercisesService.actualizar(id, data);
    sendSuccess(res, result, 'Ejercicio actualizado');
  }

  async eliminar(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    await exercisesService.eliminar(id);
    sendSuccess(res, null, 'Ejercicio eliminado');
  }
}

export const exercisesController = new ExercisesController();
