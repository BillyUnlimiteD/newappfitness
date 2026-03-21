import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => authController.login(req, res));

// POST /api/auth/register
router.post('/register', (req, res) => authController.register(req, res));

// POST /api/auth/refresh
router.post('/refresh', (req, res) => authController.refreshToken(req, res));

// POST /api/auth/change-password  [autenticado]
router.post('/change-password', authenticate, (req, res) => authController.changePassword(req, res));

// GET /api/auth/me  [autenticado]
router.get('/me', authenticate, (req, res) => authController.me(req, res));

export default router;
