import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { CreateEjercicioInput, UpdateEjercicioInput } from '../validators/exercises.validator';

export class ExercisesService {
  async listar(busqueda?: string) {
    return prisma.ejercicio.findMany({
      where: {
        activo: true,
        ...(busqueda
          ? { titulo: { contains: busqueda } }
          : {}),
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async obtener(id: number) {
    const ejercicio = await prisma.ejercicio.findUnique({ where: { id } });
    if (!ejercicio) throw new AppError('Ejercicio no encontrado', 404);
    return ejercicio;
  }

  async crear(data: CreateEjercicioInput) {
    return prisma.ejercicio.create({ data });
  }

  async actualizar(id: number, data: UpdateEjercicioInput) {
    const ejercicio = await prisma.ejercicio.findUnique({ where: { id } });
    if (!ejercicio) throw new AppError('Ejercicio no encontrado', 404);
    return prisma.ejercicio.update({ where: { id }, data });
  }

  async eliminar(id: number) {
    const ejercicio = await prisma.ejercicio.findUnique({ where: { id } });
    if (!ejercicio) throw new AppError('Ejercicio no encontrado', 404);

    const enUso = await prisma.rutinaDiaEjercicio.count({ where: { ejercicioId: id } });
    if (enUso > 0) throw new AppError('No se puede eliminar: el ejercicio está asignado a una o más rutinas', 409);

    return prisma.ejercicio.update({ where: { id }, data: { activo: false } });
  }
}

export const exercisesService = new ExercisesService();
