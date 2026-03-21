import { Router } from 'express';
import { routinesController } from '../controllers/routines.controller';
import { authenticate, requirePerfilCompleto } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticate, requirePerfilCompleto);

// Todos los roles pueden ver rutinas (con filtros por rol en el servicio)
router.get('/', (req, res) => routinesController.listar(req, res));
router.get('/:id', (req, res) => routinesController.obtener(req, res));

// Solo COACH puede crear/modificar/eliminar rutinas
router.post('/', authorize('COACH', 'ADMINISTRADOR'), (req, res) => routinesController.crear(req, res));
router.put('/:id/nota', authorize('COACH', 'ADMINISTRADOR'), (req, res) => routinesController.calificar(req, res));
router.post('/:id/dias', authorize('COACH', 'ADMINISTRADOR'), (req, res) => routinesController.agregarDia(req, res));
router.put('/:id/dias/:diaId', authorize('COACH', 'ADMINISTRADOR'), (req, res) => routinesController.actualizarDia(req, res));
router.delete('/:id', authorize('COACH', 'ADMINISTRADOR'), (req, res) => routinesController.eliminar(req, res));

export default router;
