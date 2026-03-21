import { Router } from 'express';
import { exercisesController } from '../controllers/exercises.controller';
import { authenticate, requirePerfilCompleto } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { uploadVideo } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticate, requirePerfilCompleto);

// Todos los roles autenticados pueden ver ejercicios
router.get('/', (req, res) => exercisesController.listar(req, res));
router.get('/:id', (req, res) => exercisesController.obtener(req, res));

// Solo ADMIN y COACH pueden CRUD ejercicios
router.post(
  '/',
  authorize('ADMINISTRADOR', 'COACH'),
  uploadVideo.single('video'),
  (req, res) => exercisesController.crear(req, res)
);
router.put(
  '/:id',
  authorize('ADMINISTRADOR', 'COACH'),
  uploadVideo.single('video'),
  (req, res) => exercisesController.actualizar(req, res)
);
router.delete(
  '/:id',
  authorize('ADMINISTRADOR', 'COACH'),
  (req, res) => exercisesController.eliminar(req, res)
);

export default router;
