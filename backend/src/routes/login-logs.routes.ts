import { Router } from 'express';
import { loginLogsController } from '../controllers/login-logs.controller';
import { authenticate, requirePerfilCompleto } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticate, requirePerfilCompleto, authorize('ADMINISTRADOR'));

router.get('/', (req, res) => loginLogsController.listar(req, res));

export default router;
