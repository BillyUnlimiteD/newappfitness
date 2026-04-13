import { z } from 'zod';

const ejercicioDiaSchema = z.object({
  ejercicioId: z.number().int().positive(),
  orden: z.number().int().min(1).max(10),
  repeticionesObj: z.number().int().min(1).max(9999).optional(),
  tiempoObjetivoSeg: z.number().int().min(1).max(7200).optional(), // máx 2 horas
  comentarioCoach: z.string().max(500).optional(),
});

const diaSchema = z.object({
  diaSemana: z.number().int().min(1).max(7), // 1=Lunes, 7=Domingo
  ejercicios: z.array(ejercicioDiaSchema).min(1).max(10),
});

// ── Crear curso (admin) ───────────────────────────────────────────────────────
export const createCursoSchema = z.object({
  nombre: z.string().min(3).max(200),
  descripcion: z.string().max(1000).optional(),
  coachId: z.number().int().positive(),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido'),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido'),
  tipoPeriodo: z.enum(['SEMANAL', 'MENSUAL', 'TRIMESTRAL', 'SEMESTRAL']),
});

export type CreateCursoInput = z.infer<typeof createCursoSchema>;

// ── Actualizar curso (admin) ──────────────────────────────────────────────────
export const updateCursoSchema = z.object({
  nombre: z.string().min(3).max(200).optional(),
  descripcion: z.string().max(1000).optional(),
  coachId: z.number().int().positive().optional(),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tipoPeriodo: z.enum(['SEMANAL', 'MENSUAL', 'TRIMESTRAL', 'SEMESTRAL']).optional(),
  activo: z.boolean().optional(),
});

export type UpdateCursoInput = z.infer<typeof updateCursoSchema>;

// ── Agregar alumnos (admin) ───────────────────────────────────────────────────
export const addAlumnosSchema = z.object({
  alumnoIds: z.array(z.number().int().positive()).min(1),
});

export type AddAlumnosInput = z.infer<typeof addAlumnosSchema>;

// ── Crear semana de rutina del curso (coach) ──────────────────────────────────
export const createSemanaSchema = z.object({
  semana: z.number().int().min(1).max(52),
  dias: z.array(diaSchema).min(1).max(7),
});

export type CreateSemanaInput = z.infer<typeof createSemanaSchema>;

// ── Actualizar día de la semana (coach) ───────────────────────────────────────
export const updateDiaSchema = z.object({
  ejercicios: z.array(ejercicioDiaSchema).min(0).max(10),
});

export type UpdateDiaInput = z.infer<typeof updateDiaSchema>;

// ── Agregar día a semana existente (coach) ────────────────────────────────────
export const agregarDiaSchema = z.object({
  diaSemana: z.number().int().min(1).max(7),
  ejercicios: z.array(ejercicioDiaSchema).min(0).max(10),
});

export type AgregarDiaInput = z.infer<typeof agregarDiaSchema>;

// ── Duplicar semana (coach) ───────────────────────────────────────────────────
export const duplicarSemanaSchema = z.object({
  semanaDestino: z.number().int().min(1).max(52),
});

export type DuplicarSemanaInput = z.infer<typeof duplicarSemanaSchema>;

// ── Guardar progreso (usuario) ────────────────────────────────────────────────
export const saveProgresoSchema = z.object({
  rutinaCursoDiaEjercicioId: z.number().int().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  repeticionesRealizadas: z.number().int().min(0).max(9999).optional(),
  tiempoRealizadoSeg: z.number().int().min(0).max(7200).optional(),
  completado: z.boolean(),
});

export type SaveProgresoInput = z.infer<typeof saveProgresoSchema>;
