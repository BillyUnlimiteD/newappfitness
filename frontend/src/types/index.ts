// ── Enums ─────────────────────────────────────────────────────────────────
export type TipoUsuario = 'ADMINISTRADOR' | 'COACH' | 'APODERADO' | 'USUARIO';
export type TipoPeriodo = 'SEMANAL' | 'MENSUAL';
export type GrupoMuscular =
  | 'PECHO' | 'ESPALDA' | 'HOMBROS' | 'BICEPS' | 'TRICEPS'
  | 'ABDOMEN' | 'GLUTEOS' | 'CUADRICEPS' | 'ISQUIOTIBIALES'
  | 'PANTORRILLAS' | 'CUERPO_COMPLETO' | 'OTRO';

// ── Entidades ─────────────────────────────────────────────────────────────
export interface Usuario {
  id: number;
  correo: string;
  nombre: string | null;
  apellido: string | null;
  rut: string | null;
  telefonoContacto: string | null;
  lesiones: string | null;
  tipoUsuario: TipoUsuario;
  perfilCompleto: boolean;
  passwordTemporal: boolean;
  activo: boolean;
  ultimaConexion: string | null;
  creadoEn: string;
  coachAsignado?: {
    coach: { id: number; nombre: string | null; apellido: string | null; correo: string };
  } | null;
}

export interface Ejercicio {
  id: number;
  titulo: string;
  descripcion: string | null;
  videoUrl: string | null;
  grupoMuscular: GrupoMuscular | null;
  activo: boolean;
  creadoEn: string;
}

export interface RutinaDiaEjercicio {
  id: number;
  rutinaDiaId: number;
  ejercicioId: number;
  orden: number;
  repeticionesObj: number | null;
  tiempoObjetivoSeg: number | null;
  comentarioCoach: string | null;
  ejercicio: Ejercicio;
  progresos?: ProgresoEjercicioUsuario[];
}

export interface RutinaDia {
  id: number;
  rutinaId: number;
  fecha: string;
  ejercicios: RutinaDiaEjercicio[];
}

export interface Rutina {
  id: number;
  usuarioId: number;
  coachId: number;
  fechaInicio: string;
  fechaFin: string;
  tipoPeriodo: TipoPeriodo;
  activa: boolean;
  nota: number | null;
  dias: RutinaDia[];
  usuario?: { id: number; nombre: string | null; apellido: string | null };
  coach?: { id: number; nombre: string | null; apellido: string | null };
  _count?: { dias: number };
}

export interface ProgresoEjercicioUsuario {
  id: number;
  rutinaDiaEjercicioId: number;
  usuarioId: number;
  fecha: string;
  repeticionesRealizadas: number | null;
  tiempoRealizadoSeg: number | null;
  completado: boolean;
}

// ── Auth ──────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: number;
  correo: string;
  nombre: string | null;
  apellido: string | null;
  rut: string | null;
  telefonoContacto: string | null;
  tipoUsuario: TipoUsuario;
  perfilCompleto: boolean;
  passwordTemporal: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ── API Response ──────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// ── Progreso con contexto de rutina ──────────────────────────────────────
export interface ProgresoRutinaResponse {
  rutina: Rutina;
  progresosMap: Record<number, ProgresoEjercicioUsuario>;
  porcentaje: number;
  totalEjercicios: number;
  completados: number;
}
