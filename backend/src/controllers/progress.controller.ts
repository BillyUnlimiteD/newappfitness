import { Response } from 'express';
import { AuthRequest } from '../types';
import { progressService } from '../services/progress.service';
import { sendSuccess } from '../utils/response.utils';
import { registrarProgresoSchema } from '../validators/progress.validator';

export class ProgressController {
  async registrar(req: AuthRequest, res: Response): Promise<void> {
    const data = registrarProgresoSchema.parse(req.body);
    const result = await progressService.registrar(req.user!.userId, data);
    sendSuccess(res, result, 'Progreso registrado');
  }

  async obtenerPorRutina(req: AuthRequest, res: Response): Promise<void> {
    const rutinaId = parseInt(req.params.rutinaId);
    const result = await progressService.obtenerProgresoRutina(
      rutinaId,
      req.user!.userId,
      req.user!.tipoUsuario
    );
    sendSuccess(res, result);
  }
}

export const progressController = new ProgressController();
