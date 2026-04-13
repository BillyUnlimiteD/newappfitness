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

export const createRutinaSchema = z
  .object({
    usuarioId: z.number().int().positive(),
    fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    tipoPeriodo: z.enum(['SEMANAL', 'MENSUAL']),
    dias: z.array(rutinaDiaSchema).min(1),
  })
  .superRefine((data, ctx) => {
    // Los strings ISO sin hora se parsean como UTC medianoche en Node.js
    const inicio = new Date(data.fechaInicio);
    const fin = new Date(data.fechaFin);

    if (data.tipoPeriodo === 'SEMANAL') {
      // getUTCDay: 0=Dom, 1=Lun … 6=Sáb
      if (inicio.getUTCDay() !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La rutina semanal debe iniciar en lunes',
          path: ['fechaInicio'],
        });
      }
      if (fin.getUTCDay() !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La rutina semanal debe terminar en domingo',
          path: ['fechaFin'],
        });
      }
      const diffDias = Math.round((fin.getTime() - inicio.getTime()) / 86_400_000);
      if (diffDias !== 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La rutina semanal debe abarcar exactamente 7 días (lunes a domingo)',
          path: ['fechaFin'],
        });
      }
    }

    if (data.tipoPeriodo === 'MENSUAL') {
      if (inicio.getUTCDate() !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La rutina mensual debe iniciar el día 1 del mes',
          path: ['fechaInicio'],
        });
      }
      // Último día UTC del mes de fechaInicio
      const ultimoDia = new Date(
        Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 0)
      );
      if (fin.getTime() !== ultimoDia.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `La rutina mensual debe terminar el día ${ultimoDia.getUTCDate()} del mes`,
          path: ['fechaFin'],
        });
      }
    }
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
