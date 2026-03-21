import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { CreateRutinaInput } from '../validators/routines.validator';

export class RoutinesService {
  // ── Crear rutina completa (coach) ─────────────────────────────────────────
  async crear(coachId: number, data: CreateRutinaInput) {
    // Verificar que el usuario es del coach
    const relacion = await prisma.coachUsuario.findFirst({
      where: { coachId, usuarioId: data.usuarioId },
    });
    if (!relacion) throw new AppError('El usuario no está asignado a este coach', 403);

    // Crear rutina con días y ejercicios en una sola transacción
    return prisma.rutina.create({
      data: {
        usuarioId: data.usuarioId,
        coachId,
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: new Date(data.fechaFin),
        tipoPeriodo: data.tipoPeriodo,
        dias: {
          create: data.dias.map((dia) => ({
            fecha: new Date(dia.fecha),
            ejercicios: {
              create: dia.ejercicios.map((ej) => ({
                ejercicioId: ej.ejercicioId,
                orden: ej.orden,
                repeticionesObj: ej.repeticionesObj,
                tiempoObjetivoSeg: ej.tiempoObjetivoSeg,
                comentarioCoach: ej.comentarioCoach,
              })),
            },
          })),
        },
      },
      include: this.includeCompleto(),
    });
  }

  // ── Listar rutinas (coach ve las de sus usuarios; usuario ve las suyas) ───
  async listar(userId: number, tipoUsuario: string, filtroUsuarioId?: number) {
    if (tipoUsuario === 'COACH') {
      return prisma.rutina.findMany({
        where: {
          coachId: userId,
          ...(filtroUsuarioId ? { usuarioId: filtroUsuarioId } : {}),
        },
        include: this.includeResumen(),
        orderBy: { fechaInicio: 'desc' },
      });
    }

    if (tipoUsuario === 'ADMINISTRADOR') {
      return prisma.rutina.findMany({
        include: this.includeResumen(),
        orderBy: { fechaInicio: 'desc' },
      });
    }

    // USUARIO
    if (tipoUsuario === 'USUARIO') {
      return prisma.rutina.findMany({
        where: { usuarioId: userId },
        include: this.includeResumen(),
        orderBy: { fechaInicio: 'desc' },
      });
    }

    // APODERADO: ve las rutinas de sus supervisados
    const supervisados = await prisma.apoderadoUsuario.findMany({
      where: { apoderadoId: userId },
      select: { supervisadoId: true },
    });
    const supervisadoIds = supervisados.map((s) => s.supervisadoId);

    return prisma.rutina.findMany({
      where: { usuarioId: { in: supervisadoIds } },
      include: this.includeResumen(),
      orderBy: { fechaInicio: 'desc' },
    });
  }

  async obtener(id: number, userId: number, tipoUsuario: string) {
    const rutina = await prisma.rutina.findUnique({
      where: { id },
      include: {
        ...this.includeCompleto(),
        usuario: { select: { id: true, nombre: true, apellido: true } },
        coach: { select: { id: true, nombre: true, apellido: true } },
      },
    });

    if (!rutina) throw new AppError('Rutina no encontrada', 404);

    // Verificar acceso
    if (tipoUsuario === 'COACH' && rutina.coachId !== userId) {
      throw new AppError('No tienes acceso a esta rutina', 403);
    }
    if (tipoUsuario === 'USUARIO' && rutina.usuarioId !== userId) {
      throw new AppError('No tienes acceso a esta rutina', 403);
    }
    if (tipoUsuario === 'APODERADO') {
      const supervisa = await prisma.apoderadoUsuario.findFirst({
        where: { apoderadoId: userId, supervisadoId: rutina.usuarioId },
      });
      if (!supervisa) throw new AppError('No tienes acceso a esta rutina', 403);
    }

    return rutina;
  }

  // ── Actualizar un día de la rutina ────────────────────────────────────────
  async actualizarDia(
    rutinaId: number,
    diaId: number,
    coachId: number,
    ejercicios: { ejercicioId: number; orden: number; repeticionesObj?: number; tiempoObjetivoSeg?: number; comentarioCoach?: string }[]
  ) {
    const rutina = await prisma.rutina.findUnique({ where: { id: rutinaId } });
    if (!rutina || rutina.coachId !== coachId) throw new AppError('Acceso denegado', 403);

    // Reemplazar ejercicios del día
    await prisma.rutinaDiaEjercicio.deleteMany({ where: { rutinaDiaId: diaId } });
    await prisma.rutinaDia.update({
      where: { id: diaId },
      data: {
        ejercicios: {
          create: ejercicios.map((ej) => ({
            ejercicioId: ej.ejercicioId,
            orden: ej.orden,
            repeticionesObj: ej.repeticionesObj,
            tiempoObjetivoSeg: ej.tiempoObjetivoSeg,
            comentarioCoach: ej.comentarioCoach,
          })),
        },
      },
      include: { ejercicios: { include: { ejercicio: true } } },
    });

    return prisma.rutinaDia.findUnique({
      where: { id: diaId },
      include: { ejercicios: { include: { ejercicio: true }, orderBy: { orden: 'asc' } } },
    });
  }

  async calificar(rutinaId: number, coachId: number, nota: number) {
    const rutina = await prisma.rutina.findUnique({ where: { id: rutinaId } });
    if (!rutina) throw new AppError('Rutina no encontrada', 404);
    if (rutina.coachId !== coachId) throw new AppError('No puedes calificar esta rutina', 403);

    return prisma.rutina.update({
      where: { id: rutinaId },
      data: { nota },
      select: { id: true, nota: true },
    });
  }

  async agregarDia(
    rutinaId: number,
    coachId: number,
    fecha: string,
    ejercicios: { ejercicioId: number; orden: number; repeticionesObj?: number; tiempoObjetivoSeg?: number; comentarioCoach?: string }[]
  ) {
    const rutina = await prisma.rutina.findUnique({ where: { id: rutinaId } });
    if (!rutina || rutina.coachId !== coachId) throw new AppError('Acceso denegado', 403);

    const fechaDate = new Date(fecha);
    if (fechaDate < rutina.fechaInicio || fechaDate > rutina.fechaFin) {
      throw new AppError('La fecha está fuera del rango de la rutina', 400);
    }

    const existing = await prisma.rutinaDia.findUnique({
      where: { rutinaId_fecha: { rutinaId, fecha: fechaDate } },
    });
    if (existing) throw new AppError('Ya existe un día para esa fecha', 409);

    return prisma.rutinaDia.create({
      data: {
        rutinaId,
        fecha: fechaDate,
        ejercicios: {
          create: ejercicios.map((ej) => ({
            ejercicioId: ej.ejercicioId,
            orden: ej.orden,
            repeticionesObj: ej.repeticionesObj,
            tiempoObjetivoSeg: ej.tiempoObjetivoSeg,
            comentarioCoach: ej.comentarioCoach,
          })),
        },
      },
      include: { ejercicios: { include: { ejercicio: true }, orderBy: { orden: 'asc' } } },
    });
  }

  async eliminar(id: number, coachId: number) {
    const rutina = await prisma.rutina.findUnique({ where: { id } });
    if (!rutina) throw new AppError('Rutina no encontrada', 404);
    if (rutina.coachId !== coachId) throw new AppError('No puedes eliminar esta rutina', 403);
    return prisma.rutina.delete({ where: { id } });
  }

  // ── Helpers de include ────────────────────────────────────────────────────
  private includeResumen() {
    return {
      usuario: { select: { id: true, nombre: true, apellido: true } },
      coach: { select: { id: true, nombre: true, apellido: true } },
      _count: { select: { dias: true } },
    };
  }

  private includeCompleto() {
    return {
      dias: {
        orderBy: { fecha: 'asc' as const },
        include: {
          ejercicios: {
            orderBy: { orden: 'asc' as const },
            include: {
              ejercicio: true,
              progresos: true,
            },
          },
        },
      },
    };
  }
}

export const routinesService = new RoutinesService();
