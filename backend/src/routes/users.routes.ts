import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { authenticate, requirePerfilCompleto } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ── Perfil propio (sin requerir perfil completo para poder completarlo) ──
router.put('/profile/complete', (req, res) => usersController.completarPerfil(req, res));
router.put('/profile', requirePerfilCompleto, (req, res) => usersController.updatePerfil(req, res));
router.put('/profile/password', requirePerfilCompleto, (req, res) => usersController.cambiarPassword(req, res));

// ── Coaches disponibles (ADMIN y COACH pueden verlos) ──
router.get('/coaches', requirePerfilCompleto, authorize('ADMINISTRADOR', 'COACH'), (req, res) => usersController.listarCoaches(req, res));

// ── Usuarios del coach autenticado ──
router.get('/my-users', requirePerfilCompleto, authorize('COACH'), (req, res) => usersController.listarMisUsuarios(req, res));

// ── CRUD Admin ──────────────────────────────────────────────────────────────
router.get('/', requirePerfilCompleto, authorize('ADMINISTRADOR'), (req, res) => usersController.listar(req, res));
router.post('/', requirePerfilCompleto, authorize('ADMINISTRADOR'), (req, res) => usersController.crear(req, res));
router.post('/import', requirePerfilCompleto, authorize('ADMINISTRADOR'), (req, res) => usersController.importar(req, res));
router.get('/:id', requirePerfilCompleto, authorize('ADMINISTRADOR'), (req, res) => usersController.obtener(req, res));
router.put('/:id', requirePerfilCompleto, authorize('ADMINISTRADOR'), (req, res) => usersController.actualizar(req, res));
router.post('/:id/reset-password', requirePerfilCompleto, authorize('ADMINISTRADOR'), (req, res) => usersController.resetearPassword(req, res));
router.patch('/:id/toggle-activo', requirePerfilCompleto, authorize('ADMINISTRADOR'), (req, res) => usersController.toggleActivo(req, res));
router.get('/:id/supervisados', requirePerfilCompleto, authorize('ADMINISTRADOR'), (req, res) => usersController.listarSupervisados(req, res));
router.put('/:id/supervisados', requirePerfilCompleto, authorize('ADMINISTRADOR'), (req, res) => usersController.setSupervisados(req, res));
router.put('/:id/lesiones', requirePerfilCompleto, authorize('APODERADO'), (req, res) => usersController.actualizarLesiones(req, res));

export default router;
