import { Response } from 'express';
import { AuthRequest } from '../types';
import { coursesService } from '../services/courses.service';
import { sendSuccess } from '../utils/response.utils';
import { AppError } from '../middlewares/error.middleware';

// Valida y convierte un parámetro de ruta a entero positivo
function parseId(val: string): number {
  const n = parseInt(val, 10);
  if (isNaN(n) || n <= 0) throw new AppError('ID de parámetro inválido', 400);
  return n;
}
import {
  createCursoSchema,
  updateCursoSchema,
  addAlumnosSchema,
  createSemanaSchema,
  updateDiaSchema,
  agregarDiaSchema,
  duplicarSemanaSchema,
  saveProgresoSchema,
} from '../validators/courses.validator';

export class CoursesController {
  // ── ADMIN: Listar cursos ──────────────────────────────────────────────────
  async listar(req: AuthRequest, res: Response) {
    const { userId, tipoUsuario } = req.user!;
    const cursos = await coursesService.listar(userId, tipoUsuario);
    sendSuccess(res, cursos);
  }

  // ── ADMIN: Crear curso ────────────────────────────────────────────────────
  async crear(req: AuthRequest, res: Response) {
    const data = createCursoSchema.parse(req.body);
    const curso = await coursesService.crear(req.user!.userId, data);
    sendSuccess(res, curso, 'Curso creado exitosamente', 201);
  }

  // ── Obtener curso ─────────────────────────────────────────────────────────
  async obtener(req: AuthRequest, res: Response) {
    const { userId, tipoUsuario } = req.user!;
    const curso = await coursesService.obtener(parseId(req.params.id), userId, tipoUsuario);
    sendSuccess(res, curso);
  }

  // ── ADMIN: Actualizar curso ───────────────────────────────────────────────
  async actualizar(req: AuthRequest, res: Response) {
    const data = updateCursoSchema.parse(req.body);
    const curso = await coursesService.actualizar(parseId(req.params.id), req.user!.userId, data);
    sendSuccess(res, curso, 'Curso actualizado exitosamente');
  }

  // ── ADMIN: Eliminar curso ─────────────────────────────────────────────────
  async eliminar(req: AuthRequest, res: Response) {
    await coursesService.eliminar(parseId(req.params.id));
    sendSuccess(res, null, 'Curso eliminado exitosamente');
  }

  // ── ADMIN: Agregar alumnos ────────────────────────────────────────────────
  async agregarAlumnos(req: AuthRequest, res: Response) {
    const data = addAlumnosSchema.parse(req.body);
    const alumnos = await coursesService.agregarAlumnos(parseId(req.params.id), data);
    sendSuccess(res, alumnos, 'Alumnos agregados exitosamente', 201);
  }

  // ── ADMIN: Eliminar alumno ────────────────────────────────────────────────
  async eliminarAlumno(req: AuthRequest, res: Response) {
    await coursesService.eliminarAlumno(
      parseId(req.params.id),
      parseId(req.params.alumnoId)
    );
    sendSuccess(res, null, 'Alumno eliminado del curso');
  }

  // ── COACH: Crear semana ───────────────────────────────────────────────────
  async crearSemana(req: AuthRequest, res: Response) {
    const data = createSemanaSchema.parse(req.body);
    const { userId, tipoUsuario } = req.user!;
    const semana = await coursesService.crearSemana(
      parseId(req.params.id),
      userId,
      tipoUsuario,
      data
    );
    sendSuccess(res, semana, 'Semana creada exitosamente', 201);
  }

  // ── COACH: Actualizar día ─────────────────────────────────────────────────
  async actualizarDia(req: AuthRequest, res: Response) {
    const data = updateDiaSchema.parse(req.body);
    const { userId, tipoUsuario } = req.user!;
    const dia = await coursesService.actualizarDia(
      parseId(req.params.id),
      parseId(req.params.semanaId),
      parseId(req.params.diaId),
      userId,
      tipoUsuario,
      data
    );
    sendSuccess(res, dia, 'Día actualizado exitosamente');
  }

  // ── COACH: Agregar día a una semana ──────────────────────────────────────
  async agregarDia(req: AuthRequest, res: Response) {
    const data = agregarDiaSchema.parse(req.body);
    const { userId, tipoUsuario } = req.user!;
    const dia = await coursesService.agregarDia(
      parseId(req.params.id),
      parseId(req.params.semanaId),
      userId,
      tipoUsuario,
      data.diaSemana,
      data.ejercicios
    );
    sendSuccess(res, dia, 'Día agregado exitosamente', 201);
  }

  // ── COACH: Eliminar semana ────────────────────────────────────────────────
  async eliminarSemana(req: AuthRequest, res: Response) {
    const { userId, tipoUsuario } = req.user!;
    await coursesService.eliminarSemana(
      parseId(req.params.id),
      parseId(req.params.semanaId),
      userId,
      tipoUsuario
    );
    sendSuccess(res, null, 'Semana eliminada exitosamente');
  }

  // ── COACH: Duplicar semana ────────────────────────────────────────────────
  async duplicarSemana(req: AuthRequest, res: Response) {
    const data = duplicarSemanaSchema.parse(req.body);
    const { userId, tipoUsuario } = req.user!;
    const semana = await coursesService.duplicarSemana(
      parseId(req.params.id),
      parseId(req.params.semanaId),
      userId,
      tipoUsuario,
      data
    );
    sendSuccess(res, semana, `Semana duplicada a semana ${data.semanaDestino} exitosamente`);
  }

  // ── USUARIO: Guardar progreso ─────────────────────────────────────────────
  async guardarProgreso(req: AuthRequest, res: Response) {
    const data = saveProgresoSchema.parse(req.body);
    const progreso = await coursesService.guardarProgreso(
      req.user!.userId,
      parseId(req.params.id),
      data
    );
    sendSuccess(res, progreso, 'Progreso guardado');
  }

  // ── USUARIO: Obtener mi progreso en el curso ──────────────────────────────
  async obtenerMiProgreso(req: AuthRequest, res: Response) {
    const progresos = await coursesService.obtenerProgresoAlumno(
      parseId(req.params.id),
      req.user!.userId
    );
    sendSuccess(res, progresos);
  }

  // ── Reporte del curso ─────────────────────────────────────────────────────
  async reporteCurso(req: AuthRequest, res: Response) {
    const { userId, tipoUsuario } = req.user!;
    const reporte = await coursesService.reporteCurso(parseId(req.params.id), userId, tipoUsuario);
    sendSuccess(res, reporte);
  }

  // ── Reporte alumno en el curso ────────────────────────────────────────────
  async reporteAlumnoCurso(req: AuthRequest, res: Response) {
    const { userId, tipoUsuario } = req.user!;
    const reporte = await coursesService.reporteAlumnoCurso(
      parseId(req.params.id),
      parseId(req.params.alumnoId),
      userId,
      tipoUsuario
    );
    sendSuccess(res, reporte);
  }
}

export const coursesController = new CoursesController();
