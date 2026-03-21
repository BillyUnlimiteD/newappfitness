import { Response } from 'express';
import { AuthRequest } from '../types';
import { loginLogsService } from '../services/login-logs.service';
import { sendSuccess } from '../utils/response.utils';

export class LoginLogsController {
  async listar(req: AuthRequest, res: Response): Promise<void> {
    const correo = req.query.correo as string | undefined;
    const motivo = req.query.motivo as string | undefined;
    const pagina = req.query.pagina ? parseInt(req.query.pagina as string) : 1;

    const result = await loginLogsService.listar({ correo, motivo, pagina });
    sendSuccess(res, result);
  }
}

export const loginLogsController = new LoginLogsController();
