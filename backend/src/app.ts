import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';

// En desarrollo carga el .env de la raíz del proyecto (../);
// en producción (Docker) las vars ya vienen inyectadas por docker-compose.
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env' : '../.env' });

import { errorHandler } from './middlewares/error.middleware';
import { globalLimiter } from './middlewares/rate-limit.middleware';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import exercisesRoutes from './routes/exercises.routes';
import routinesRoutes from './routes/routines.routes';
import progressRoutes from './routes/progress.routes';
import loginLogsRoutes from './routes/login-logs.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Seguridad: headers HTTP seguros ─────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
// El puerto 80 es implícito en HTTP: el navegador envía "http://host" sin ":80"
const normalizeOrigin = (o: string) => o.trim().replace(/:80$/, '');

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Sin origin: permitir siempre (Nginx interno, health checks, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(normalizeOrigin(origin))) return callback(null, true);
    callback(new Error(`CORS: origen no permitido — ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(globalLimiter);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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
