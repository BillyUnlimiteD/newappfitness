import { Router } from 'express';
import { coursesController } from '../controllers/courses.controller';
import { authenticate, requirePerfilCompleto } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticate, requirePerfilCompleto);

// ── Listar y obtener cursos (admin, coach, usuario) ───────────────────────────
router.get('/', (req, res) => coursesController.listar(req, res));
router.get('/:id', (req, res) => coursesController.obtener(req, res));

// ── ADMIN: gestión de cursos ──────────────────────────────────────────────────
router.post('/', authorize('ADMINISTRADOR'), (req, res) => coursesController.crear(req, res));
router.put('/:id', authorize('ADMINISTRADOR'), (req, res) => coursesController.actualizar(req, res));
router.delete('/:id', authorize('ADMINISTRADOR'), (req, res) => coursesController.eliminar(req, res));

// ── ADMIN: gestión de alumnos ─────────────────────────────────────────────────
router.post('/:id/students', authorize('ADMINISTRADOR'), (req, res) => coursesController.agregarAlumnos(req, res));
router.delete('/:id/students/:alumnoId', authorize('ADMINISTRADOR'), (req, res) => coursesController.eliminarAlumno(req, res));

// ── COACH: gestión de rutinas (semanas) ───────────────────────────────────────
router.post('/:id/weeks', authorize('COACH', 'ADMINISTRADOR'), (req, res) => coursesController.crearSemana(req, res));
router.delete('/:id/weeks/:semanaId', authorize('COACH', 'ADMINISTRADOR'), (req, res) => coursesController.eliminarSemana(req, res));
router.post('/:id/weeks/:semanaId/duplicate', authorize('COACH', 'ADMINISTRADOR'), (req, res) => coursesController.duplicarSemana(req, res));

// ── COACH: gestión de días ────────────────────────────────────────────────────
router.post('/:id/weeks/:semanaId/days', authorize('COACH', 'ADMINISTRADOR'), (req, res) => coursesController.agregarDia(req, res));
router.put('/:id/weeks/:semanaId/days/:diaId', authorize('COACH', 'ADMINISTRADOR'), (req, res) => coursesController.actualizarDia(req, res));

// ── USUARIO: progreso en el curso ─────────────────────────────────────────────
router.get('/:id/my-progress', authorize('USUARIO'), (req, res) => coursesController.obtenerMiProgreso(req, res));
router.post('/:id/progress', authorize('USUARIO'), (req, res) => coursesController.guardarProgreso(req, res));

// ── Reportes (admin y coach) ──────────────────────────────────────────────────
router.get('/:id/report', authorize('ADMINISTRADOR', 'COACH'), (req, res) => coursesController.reporteCurso(req, res));
router.get('/:id/report/:alumnoId', authorize('ADMINISTRADOR', 'COACH'), (req, res) => coursesController.reporteAlumnoCurso(req, res));

export default router;
