import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

// En desarrollo carga el .env de la raíz del proyecto (../);
// en producción (Docker) las vars ya vienen inyectadas por docker-compose.
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env' : '../.env' });

import { errorHandler } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import exercisesRoutes from './routes/exercises.routes';
import routinesRoutes from './routes/routines.routes';
import progressRoutes from './routes/progress.routes';
import loginLogsRoutes from './routes/login-logs.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares globales ────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos de video subidos
app.use('/uploads', express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads')));

// ── Rutas API ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/exercises', exercisesRoutes);
app.use('/api/routines', routinesRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin/login-logs', loginLogsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Fitness App API OK', timestamp: new Date() });
});

// ── Manejador de errores (siempre al final) ─────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📦 Entorno: ${process.env.NODE_ENV}`);
});

export default app;
