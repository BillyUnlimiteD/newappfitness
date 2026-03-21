import { z } from 'zod';

const ejercicioDiaSchema = z.object({
  ejercicioId: z.number().int().positive(),
  orden: z.number().int().min(1).max(5),
  repeticionesObj: z.number().int().positive().optional(),
  tiempoObjetivoSeg: z.number().int().positive().optional(),
  comentarioCoach: z.string().max(500).optional(),
});

const rutinaDiaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD'),
  ejercicios: z.array(ejercicioDiaSchema).min(1).max(5),
});

export const createRutinaSchema = z.object({
  usuarioId: z.number().int().positive(),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipoPeriodo: z.enum(['SEMANAL', 'MENSUAL']),
  dias: z.array(rutinaDiaSchema).min(1),
});

export const updateRutinaDiaSchema = z.object({
  ejercicios: z.array(ejercicioDiaSchema).min(1).max(5),
});

export const calificarRutinaSchema = z.object({
  nota: z.number().min(1, 'Nota mínima es 1').max(7, 'Nota máxima es 7'),
});

export const agregarRutinaDiaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD'),
  ejercicios: z.array(ejercicioDiaSchema).min(1).max(5),
});

export type CreateRutinaInput = z.infer<typeof createRutinaSchema>;
