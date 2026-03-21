import { z } from 'zod';

export const registrarProgresoSchema = z.object({
  rutinaDiaEjercicioId: z.number().int().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  repeticionesRealizadas: z.number().int().min(0).optional(),
  tiempoRealizadoSeg: z.number().int().min(0).optional(),
  completado: z.boolean().default(false),
});

export type RegistrarProgresoInput = z.infer<typeof registrarProgresoSchema>;
