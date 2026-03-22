import { Router, Request, Response, NextFunction } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rate-limit.middleware';

const router = Router();

// Middleware: bloquea el endpoint si ALLOW_REGISTRATION != 'true'
const registroHabilitado = (_req: Request, res: Response, next: NextFunction): void => {
  if (process.env.ALLOW_REGISTRATION === 'true') return next();
  res.status(403).json({ success: false, message: 'El registro público está deshabilitado.' });
};

// POST /api/auth/login  [rate limited]
router.post('/login', authLimiter, (req, res) => authController.login(req, res));

// POST /api/auth/register  [solo si ALLOW_REGISTRATION=true]
router.post('/register', registroHabilitado, (req, res) => authController.register(req, res));

// POST /api/auth/refresh
router.post('/refresh', (req, res) => authController.refreshToken(req, res));

// POST /api/auth/change-password  [autenticado]
router.post('/change-password', authenticate, (req, res) => authController.changePassword(req, res));

// GET /api/auth/me  [autenticado]
router.get('/me', authenticate, (req, res) => authController.me(req, res));

export default router;
