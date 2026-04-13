import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import {
  CreateCursoInput,
  UpdateCursoInput,
  AddAlumnosInput,
  CreateSemanaInput,
  UpdateDiaInput,
  DuplicarSemanaInput,
  SaveProgresoInput,
} from '../validators/courses.validator';

export class CoursesService {
  // ── ADMIN: Crear curso ────────────────────────────────────────────────────
  async crear(adminId: number, data: CreateCursoInput) {
    const coach = await prisma.usuario.findFirst({
      where: { id: data.coachId, tipoUsuario: 'COACH', activo: true },
    });
    if (!coach) throw new AppError('Coach no encontrado o inactivo', 404);

    const inicio = new Date(data.fechaInicio);
    const fin = new Date(data.fechaFin);
    if (fin <= inicio) throw new AppError('La fecha de fin debe ser posterior al inicio', 400);

    return prisma.curso.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        coachId: data.coachId,
        adminId,
        fechaInicio: inicio,
        fechaFin: fin,
        tipoPeriodo: data.tipoPeriodo,
      },
      include: this.includeResumen(),
    });
  }

  // ── ADMIN: Actualizar curso ───────────────────────────────────────────────
  async actualizar(id: number, adminId: number, data: UpdateCursoInput) {
    const curso = await prisma.curso.findUnique({ where: { id } });
    if (!curso) throw new AppError('Curso no encontrado', 404);

    if (data.coachId) {
      const coach = await prisma.usuario.findFirst({
        where: { id: data.coachId, tipoUsuario: 'COACH', activo: true },
      });
      if (!coach) throw new AppError('Coach no encontrado o inactivo', 404);
    }

    const inicio = data.fechaInicio ? new Date(data.fechaInicio) : curso.fechaInicio;
    const fin = data.fechaFin ? new Date(data.fechaFin) : curso.fechaFin;
    if (fin <= inicio) throw new AppError('La fecha de fin debe ser posterior al inicio', 400);

    return prisma.curso.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        coachId: data.coachId,
        fechaInicio: data.fechaInicio ? inicio : undefined,
        fechaFin: data.fechaFin ? fin : undefined,
        tipoPeriodo: data.tipoPeriodo,
        activo: data.activo,
      },
      include: this.includeResumen(),
    });
  }

  // ── ADMIN: Eliminar curso ─────────────────────────────────────────────────
  async eliminar(id: number) {
    const curso = await prisma.curso.findUnique({ where: { id } });
    if (!curso) throw new AppError('Curso no encontrado', 404);
    return prisma.curso.delete({ where: { id } });
  }

  // ── Listar cursos ─────────────────────────────────────────────────────────
  async listar(userId: number, tipoUsuario: string) {
    if (tipoUsuario === 'ADMINISTRADOR') {
      return prisma.curso.findMany({
        include: this.includeResumen(),
        orderBy: { fechaInicio: 'desc' },
      });
    }

    if (tipoUsuario === 'COACH') {
      return prisma.curso.findMany({
        where: { coachId: userId },
        include: this.includeResumen(),
        orderBy: { fechaInicio: 'desc' },
      });
    }

    // USUARIO: cursos en los que está inscrito
    return prisma.curso.findMany({
      where: {
        alumnos: { some: { alumnoId: userId } },
        activo: true,
      },
      include: this.includeResumen(),
      orderBy: { fechaInicio: 'desc' },
    });
  }

  // ── Obtener curso por ID ──────────────────────────────────────────────────
  async obtener(id: number, userId: number, tipoUsuario: string) {
    const curso = await prisma.curso.findUnique({
      where: { id },
      include: {
        ...this.includeResumen(),
        alumnos: {
          include: {
            alumno: {
              select: { id: true, nombre: true, apellido: true, correo: true, rut: true },
            },
          },
        },
        rutinas: {
          orderBy: { semana: 'asc' },
          include: {
            dias: {
              orderBy: { diaSemana: 'asc' },
              include: {
                ejercicios: {
                  orderBy: { orden: 'asc' },
                  include: { ejercicio: true },
                },
              },
            },
          },
        },
      },
    });

    if (!curso) throw new AppError('Curso no encontrado', 404);

    if (tipoUsuario === 'COACH' && curso.coachId !== userId) {
      throw new AppError('No tienes acceso a este curso', 403);
    }
    if (tipoUsuario === 'USUARIO') {
      const inscrito = curso.alumnos.some((a) => a.alumnoId === userId);
      if (!inscrito) throw new AppError('No estás inscrito en este curso', 403);
    }

    return curso;
  }

  // ── ADMIN: Agregar alumnos al curso ───────────────────────────────────────
  async agregarAlumnos(cursoId: number, data: AddAlumnosInput) {
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) throw new AppError('Curso no encontrado', 404);

    const alumnos = await prisma.usuario.findMany({
      where: { id: { in: data.alumnoIds }, tipoUsuario: 'USUARIO', activo: true },
    });
    if (alumnos.length !== data.alumnoIds.length) {
      throw new AppError('Uno o más alumnos no encontrados o no son de tipo USUARIO', 400);
    }

    // Crear solo los que no existen (upsert por uniqueness)
    await prisma.cursoAlumno.createMany({
      data: data.alumnoIds.map((alumnoId) => ({ cursoId, alumnoId })),
      skipDuplicates: true,
    });

    return prisma.cursoAlumno.findMany({
      where: { cursoId },
      include: {
        alumno: { select: { id: true, nombre: true, apellido: true, correo: true, rut: true } },
      },
    });
  }

  // ── ADMIN: Eliminar alumno del curso ──────────────────────────────────────
  async eliminarAlumno(cursoId: number, alumnoId: number) {
    const inscripcion = await prisma.cursoAlumno.findUnique({
      where: { cursoId_alumnoId: { cursoId, alumnoId } },
    });
    if (!inscripcion) throw new AppError('El alumno no está inscrito en este curso', 404);
    return prisma.cursoAlumno.delete({ where: { id: inscripcion.id } });
  }

  // ── COACH: Crear semana de rutina ─────────────────────────────────────────
  async crearSemana(cursoId: number, userId: number, tipoUsuario: string, data: CreateSemanaInput) {
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) throw new AppError('Curso no encontrado', 404);
    if (tipoUsuario !== 'ADMINISTRADOR' && curso.coachId !== userId) {
      throw new AppError('No tienes acceso a este curso', 403);
    }
    // El admin opera en nombre del coach asignado al curso
    const coachId = tipoUsuario === 'ADMINISTRADOR' ? curso.coachId : userId;

    const existe = await prisma.rutinaCurso.findUnique({
      where: { cursoId_semana: { cursoId, semana: data.semana } },
    });
    if (existe) throw new AppError(`La semana ${data.semana} ya existe en este curso`, 409);

    return prisma.rutinaCurso.create({
      data: {
        cursoId,
        coachId,
        semana: data.semana,
        dias: {
          create: data.dias.map((dia) => ({
            diaSemana: dia.diaSemana,
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
      include: this.includeSemanaCompleta(),
    });
  }

  // ── COACH: Actualizar día de una semana ───────────────────────────────────
  async actualizarDia(
    cursoId: number,
    semanaId: number,
    diaId: number,
    userId: number,
    tipoUsuario: string,
    data: UpdateDiaInput
  ) {
    const semana = await prisma.rutinaCurso.findUnique({ where: { id: semanaId } });
    if (!semana || semana.cursoId !== cursoId) throw new AppError('Semana no encontrada', 404);
    if (tipoUsuario !== 'ADMINISTRADOR' && semana.coachId !== userId) {
      throw new AppError('No tienes acceso', 403);
    }

    const dia = await prisma.rutinaCursoDia.findUnique({ where: { id: diaId } });
    if (!dia || dia.rutinaCursoId !== semanaId) throw new AppError('Día no encontrado', 404);

    await prisma.rutinaCursoDiaEjercicio.deleteMany({ where: { rutinaCursoDiaId: diaId } });

    if (data.ejercicios.length > 0) {
      await prisma.rutinaCursoDia.update({
        where: { id: diaId },
        data: {
          ejercicios: {
            create: data.ejercicios.map((ej) => ({
              ejercicioId: ej.ejercicioId,
              orden: ej.orden,
              repeticionesObj: ej.repeticionesObj,
              tiempoObjetivoSeg: ej.tiempoObjetivoSeg,
              comentarioCoach: ej.comentarioCoach,
            })),
          },
        },
      });
    }

    return prisma.rutinaCursoDia.findUnique({
      where: { id: diaId },
      include: {
        ejercicios: {
          orderBy: { orden: 'asc' },
          include: { ejercicio: true },
        },
      },
    });
  }

  // ── COACH: Agregar día a una semana existente ─────────────────────────────
  async agregarDia(
    cursoId: number,
    semanaId: number,
    userId: number,
    tipoUsuario: string,
    diaSemana: number,
    ejercicios: UpdateDiaInput['ejercicios']
  ) {
    const semana = await prisma.rutinaCurso.findUnique({ where: { id: semanaId } });
    if (!semana || semana.cursoId !== cursoId) throw new AppError('Semana no encontrada', 404);
    if (tipoUsuario !== 'ADMINISTRADOR' && semana.coachId !== userId) {
      throw new AppError('No tienes acceso', 403);
    }

    const existe = await prisma.rutinaCursoDia.findUnique({
      where: { rutinaCursoId_diaSemana: { rutinaCursoId: semanaId, diaSemana } },
    });
    if (existe) throw new AppError('Ya existe un día para ese día de la semana', 409);

    return prisma.rutinaCursoDia.create({
      data: {
        rutinaCursoId: semanaId,
        diaSemana,
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
      include: {
        ejercicios: { orderBy: { orden: 'asc' }, include: { ejercicio: true } },
      },
    });
  }

  // ── COACH: Eliminar semana ────────────────────────────────────────────────
  async eliminarSemana(cursoId: number, semanaId: number, userId: number, tipoUsuario: string) {
    const semana = await prisma.rutinaCurso.findUnique({ where: { id: semanaId } });
    if (!semana || semana.cursoId !== cursoId) throw new AppError('Semana no encontrada', 404);
    if (tipoUsuario !== 'ADMINISTRADOR' && semana.coachId !== userId) {
      throw new AppError('No tienes acceso', 403);
    }
    return prisma.rutinaCurso.delete({ where: { id: semanaId } });
  }

  // ── COACH: Duplicar semana ────────────────────────────────────────────────
  async duplicarSemana(
    cursoId: number,
    semanaOrigenId: number,
    userId: number,
    tipoUsuario: string,
    data: DuplicarSemanaInput
  ) {
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) throw new AppError('Curso no encontrado', 404);
    if (tipoUsuario !== 'ADMINISTRADOR' && curso.coachId !== userId) {
      throw new AppError('No tienes acceso a este curso', 403);
    }
    // El admin opera en nombre del coach asignado al curso
    const coachId = tipoUsuario === 'ADMINISTRADOR' ? curso.coachId : userId;

    const semanaOrigen = await prisma.rutinaCurso.findUnique({
      where: { id: semanaOrigenId },
      include: {
        dias: {
          include: {
            ejercicios: { orderBy: { orden: 'asc' } },
          },
        },
      },
    });
    if (!semanaOrigen || semanaOrigen.cursoId !== cursoId) {
      throw new AppError('Semana origen no encontrada', 404);
    }

    // Verificar que la semana destino no existe
    const existeDestino = await prisma.rutinaCurso.findUnique({
      where: { cursoId_semana: { cursoId, semana: data.semanaDestino } },
    });
    if (existeDestino) {
      throw new AppError(`La semana ${data.semanaDestino} ya existe. Elimínala primero.`, 409);
    }

    // Crear copia exacta
    return prisma.rutinaCurso.create({
      data: {
        cursoId,
        coachId,
        semana: data.semanaDestino,
        dias: {
          create: semanaOrigen.dias.map((dia) => ({
            diaSemana: dia.diaSemana,
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
      include: this.includeSemanaCompleta(),
    });
  }

  // ── USUARIO: Guardar progreso en ejercicio del curso ──────────────────────
  async guardarProgreso(alumnoId: number, cursoId: number, data: SaveProgresoInput) {
    // Verificar que el alumno está inscrito
    const inscripcion = await prisma.cursoAlumno.findUnique({
      where: { cursoId_alumnoId: { cursoId, alumnoId } },
    });
    if (!inscripcion) throw new AppError('No estás inscrito en este curso', 403);

    // Verificar que el ejercicio pertenece a este curso (evitar cross-course injection)
    const ejercicio = await prisma.rutinaCursoDiaEjercicio.findFirst({
      where: {
        id: data.rutinaCursoDiaEjercicioId,
        rutinaCursoDia: {
          rutinaCurso: { cursoId },
        },
      },
    });
    if (!ejercicio) throw new AppError('El ejercicio no pertenece a este curso', 403);

    return prisma.progresoEjercicioCurso.upsert({
      where: {
        rutinaCursoDiaEjercicioId_alumnoId_fecha: {
          rutinaCursoDiaEjercicioId: data.rutinaCursoDiaEjercicioId,
          alumnoId,
          fecha: new Date(data.fecha),
        },
      },
      update: {
        repeticionesRealizadas: data.repeticionesRealizadas,
        tiempoRealizadoSeg: data.tiempoRealizadoSeg,
        completado: data.completado,
      },
      create: {
        rutinaCursoDiaEjercicioId: data.rutinaCursoDiaEjercicioId,
        alumnoId,
        fecha: new Date(data.fecha),
        repeticionesRealizadas: data.repeticionesRealizadas,
        tiempoRealizadoSeg: data.tiempoRealizadoSeg,
        completado: data.completado,
      },
    });
  }

  // ── USUARIO: Obtener progreso propio en el curso ──────────────────────────
  async obtenerProgresoAlumno(cursoId: number, alumnoId: number) {
    const inscripcion = await prisma.cursoAlumno.findUnique({
      where: { cursoId_alumnoId: { cursoId, alumnoId } },
    });
    if (!inscripcion) throw new AppError('No estás inscrito en este curso', 403);

    const progresos = await prisma.progresoEjercicioCurso.findMany({
      where: {
        alumnoId,
        rutinaCursoDiaEjercicio: {
          rutinaCursoDia: { rutinaCurso: { cursoId } },
        },
      },
    });

    return progresos;
  }

  // ── REPORTE: Resumen del curso ────────────────────────────────────────────
  async reporteCurso(cursoId: number, userId: number, tipoUsuario: string) {
    const curso = await prisma.curso.findUnique({
      where: { id: cursoId },
      include: {
        ...this.includeResumen(),
        alumnos: {
          include: {
            alumno: { select: { id: true, nombre: true, apellido: true, correo: true } },
          },
        },
        rutinas: {
          orderBy: { semana: 'asc' },
          include: {
            dias: {
              include: {
                ejercicios: {
                  include: {
                    progresos: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!curso) throw new AppError('Curso no encontrado', 404);
    if (tipoUsuario === 'COACH' && curso.coachId !== userId) {
      throw new AppError('No tienes acceso a este curso', 403);
    }

    const alumnoIds = curso.alumnos.map((a) => a.alumnoId);
    const totalAlumnos = alumnoIds.length;

    // Calcular progreso por alumno
    const resumenAlumnos = curso.alumnos.map((inscripcion) => {
      let totalEjercicios = 0;
      let completados = 0;

      for (const semana of curso.rutinas) {
        for (const dia of semana.dias) {
          for (const ejercicio of dia.ejercicios) {
            totalEjercicios++;
            const progreso = ejercicio.progresos.find(
              (p) => p.alumnoId === inscripcion.alumnoId && p.completado
            );
            if (progreso) completados++;
          }
        }
      }

      const porcentaje = totalEjercicios > 0 ? Math.round((completados / totalEjercicios) * 100) : 0;

      return {
        alumno: inscripcion.alumno,
        totalEjercicios,
        completados,
        porcentaje,
      };
    });

    // Progreso global del curso
    const totalEjerciciosGlobal = resumenAlumnos.reduce((sum, a) => sum + a.totalEjercicios, 0);
    const completadosGlobal = resumenAlumnos.reduce((sum, a) => sum + a.completados, 0);
    const porcentajeGlobal =
      totalEjerciciosGlobal > 0
        ? Math.round((completadosGlobal / totalEjerciciosGlobal) * 100)
        : 0;

    return {
      curso: {
        id: curso.id,
        nombre: curso.nombre,
        descripcion: curso.descripcion,
        tipoPeriodo: curso.tipoPeriodo,
        fechaInicio: curso.fechaInicio,
        fechaFin: curso.fechaFin,
        activo: curso.activo,
        coach: curso.coach,
        totalSemanas: curso.rutinas.length,
      },
      totalAlumnos,
      porcentajeGlobal,
      resumenAlumnos,
    };
  }

  // ── REPORTE: Progreso de un alumno específico en el curso ─────────────────
  async reporteAlumnoCurso(cursoId: number, alumnoId: number, userId: number, tipoUsuario: string) {
    const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) throw new AppError('Curso no encontrado', 404);
    if (tipoUsuario === 'COACH' && curso.coachId !== userId) {
      throw new AppError('No tienes acceso a este curso', 403);
    }

    const inscripcion = await prisma.cursoAlumno.findUnique({
      where: { cursoId_alumnoId: { cursoId, alumnoId } },
      include: {
        alumno: { select: { id: true, nombre: true, apellido: true, correo: true, rut: true } },
      },
    });
    if (!inscripcion) throw new AppError('El alumno no está inscrito en este curso', 404);

    const semanas = await prisma.rutinaCurso.findMany({
      where: { cursoId },
      orderBy: { semana: 'asc' },
      include: {
        dias: {
          orderBy: { diaSemana: 'asc' },
          include: {
            ejercicios: {
              orderBy: { orden: 'asc' },
              include: {
                ejercicio: true,
                progresos: {
                  where: { alumnoId },
                },
              },
            },
          },
        },
      },
    });

    // Calcular estadísticas por semana
    const semanasConEstadisticas = semanas.map((semana) => {
      let totalEjercicios = 0;
      let completados = 0;

      for (const dia of semana.dias) {
        for (const ej of dia.ejercicios) {
          totalEjercicios++;
          if (ej.progresos.some((p) => p.completado)) completados++;
        }
      }

      return {
        semana: semana.semana,
        id: semana.id,
        totalEjercicios,
        completados,
        porcentaje: totalEjercicios > 0 ? Math.round((completados / totalEjercicios) * 100) : 0,
        dias: semana.dias,
      };
    });

    const totalEjerciciosGlobal = semanasConEstadisticas.reduce((s, w) => s + w.totalEjercicios, 0);
    const completadosGlobal = semanasConEstadisticas.reduce((s, w) => s + w.completados, 0);

    return {
      alumno: inscripcion.alumno,
      curso: { id: curso.id, nombre: curso.nombre, tipoPeriodo: curso.tipoPeriodo },
      totalEjercicios: totalEjerciciosGlobal,
      completados: completadosGlobal,
      porcentaje:
        totalEjerciciosGlobal > 0
          ? Math.round((completadosGlobal / totalEjerciciosGlobal) * 100)
          : 0,
      semanas: semanasConEstadisticas,
    };
  }

  // ── Helpers de include ────────────────────────────────────────────────────
  private includeResumen() {
    return {
      coach: { select: { id: true, nombre: true, apellido: true, correo: true } },
      admin: { select: { id: true, nombre: true, apellido: true } },
      _count: { select: { alumnos: true, rutinas: true } },
    };
  }

  private includeSemanaCompleta() {
    return {
      dias: {
        orderBy: { diaSemana: 'asc' as const },
        include: {
          ejercicios: {
            orderBy: { orden: 'asc' as const },
            include: { ejercicio: true },
          },
        },
      },
    };
  }
}

export const coursesService = new CoursesService();
