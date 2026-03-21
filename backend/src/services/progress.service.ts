import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { RegistrarProgresoInput } from '../validators/progress.validator';

export class ProgressService {
  // Registrar o actualizar progreso (upsert)
  async registrar(usuarioId: number, data: RegistrarProgresoInput) {
    // Verificar que el ejercicio pertenece a una rutina del usuario
    const rde = await prisma.rutinaDiaEjercicio.findUnique({
      where: { id: data.rutinaDiaEjercicioId },
      include: { rutinaDia: { include: { rutina: true } } },
    });

    if (!rde) throw new AppError('Ejercicio de rutina no encontrado', 404);
    if (rde.rutinaDia.rutina.usuarioId !== usuarioId) {
      throw new AppError('No tienes acceso a este ejercicio', 403);
    }

    return prisma.progresoEjercicioUsuario.upsert({
      where: {
        rutinaDiaEjercicioId_usuarioId: {
          rutinaDiaEjercicioId: data.rutinaDiaEjercicioId,
          usuarioId,
        },
      },
      update: {
        repeticionesRealizadas: data.repeticionesRealizadas,
        tiempoRealizadoSeg: data.tiempoRealizadoSeg,
        completado: data.completado,
        fecha: new Date(data.fecha),
      },
      create: {
        rutinaDiaEjercicioId: data.rutinaDiaEjercicioId,
        usuarioId,
        fecha: new Date(data.fecha),
        repeticionesRealizadas: data.repeticionesRealizadas,
        tiempoRealizadoSeg: data.tiempoRealizadoSeg,
        completado: data.completado,
      },
    });
  }

  // Obtener progreso de una rutina con validación de acceso
  async obtenerProgresoRutina(rutinaId: number, viewerUserId: number, tipoUsuario: string) {
    const rutina = await prisma.rutina.findUnique({
      where: { id: rutinaId },
      include: {
        dias: {
          orderBy: { fecha: 'asc' },
          include: {
            ejercicios: {
              orderBy: { orden: 'asc' },
              include: { ejercicio: true },
            },
          },
        },
        usuario: { select: { id: true, nombre: true, apellido: true } },
        coach: { select: { id: true, nombre: true, apellido: true } },
      },
    });

    if (!rutina) throw new AppError('Rutina no encontrada', 404);

    // Validar acceso por rol
    if (tipoUsuario === 'COACH' && rutina.coachId !== viewerUserId) {
      throw new AppError('Acceso denegado', 403);
    }
    if (tipoUsuario === 'USUARIO' && rutina.usuarioId !== viewerUserId) {
      throw new AppError('Acceso denegado', 403);
    }
    if (tipoUsuario === 'APODERADO') {
      const supervisa = await prisma.apoderadoUsuario.findFirst({
        where: { apoderadoId: viewerUserId, supervisadoId: rutina.usuarioId },
      });
      if (!supervisa) throw new AppError('Acceso denegado', 403);
    }

    // Obtener todos los progresos de la rutina
    const progresos = await prisma.progresoEjercicioUsuario.findMany({
      where: {
        usuarioId: rutina.usuarioId,
        rutinaDiaEjercicio: { rutinaDia: { rutinaId } },
      },
    });

    // Calcular porcentaje
    const totalEjercicios = rutina.dias.reduce((acc, d) => acc + d.ejercicios.length, 0);
    const completados = progresos.filter((p) => p.completado).length;
    const porcentaje = totalEjercicios > 0 ? Math.round((completados / totalEjercicios) * 100) : 0;

    // Indexar progresos por rutinaDiaEjercicioId para fácil acceso en frontend
    const progresosMap = Object.fromEntries(
      progresos.map((p) => [p.rutinaDiaEjercicioId, p])
    );

    return { rutina, progresosMap, porcentaje, totalEjercicios, completados };
  }
}

export const progressService = new ProgressService();
