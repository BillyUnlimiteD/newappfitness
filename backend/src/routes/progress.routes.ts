import { Router } from 'express';
import { progressController } from '../controllers/progress.controller';
import { authenticate, requirePerfilCompleto } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticate, requirePerfilCompleto);

// USUARIO registra su progreso
router.post('/', authorize('USUARIO'), (req, res) => progressController.registrar(req, res));

// Ver progreso de una rutina (COACH, USUARIO, APODERADO, ADMIN)
router.get('/rutina/:rutinaId', (req, res) => progressController.obtenerPorRutina(req, res));

export default router;
