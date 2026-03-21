import { z } from 'zod';

const grupoMuscularValues = [
  'PECHO', 'ESPALDA', 'HOMBROS', 'BICEPS', 'TRICEPS', 'ABDOMEN',
  'GLUTEOS', 'CUADRICEPS', 'ISQUIOTIBIALES', 'PANTORRILLAS',
  'CUERPO_COMPLETO', 'OTRO',
] as const;

export const createEjercicioSchema = z.object({
  titulo: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200),
  descripcion: z.string().max(2000).optional(),
  videoUrl: z.string().max(500).optional(),
  grupoMuscular: z.enum(grupoMuscularValues).optional(),
});

export const updateEjercicioSchema = createEjercicioSchema.partial().extend({
  activo: z.boolean().optional(),
});

export type CreateEjercicioInput = z.infer<typeof createEjercicioSchema>;
export type UpdateEjercicioInput = z.infer<typeof updateEjercicioSchema>;
