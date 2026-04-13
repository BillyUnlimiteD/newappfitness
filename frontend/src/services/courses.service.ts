import api from './api';
import {
  ApiResponse,
  Curso,
  CursoAlumno,
  RutinaCurso,
  RutinaCursoDia,
  ProgresoEjercicioCurso,
  ReporteCurso,
  DetalleAlumnoCurso,
  TipoPeriodoCurso,
} from '../types';

type EjercicioDia = {
  ejercicioId: number;
  orden: number;
  repeticionesObj?: number;
  tiempoObjetivoSeg?: number;
  comentarioCoach?: string;
};

type DiaInput = {
  diaSemana: number;
  ejercicios: EjercicioDia[];
};

export const coursesService = {
  // ── Listar cursos ───────────────────────────────────────────────────────
  async listar(): Promise<Curso[]> {
    const { data } = await api.get<ApiResponse<Curso[]>>('/courses');
    return data.data!;
  },

  // ── Obtener curso con detalle completo ──────────────────────────────────
  async obtener(id: number): Promise<Curso> {
    const { data } = await api.get<ApiResponse<Curso>>(`/courses/${id}`);
    return data.data!;
  },

  // ── ADMIN: Crear curso ──────────────────────────────────────────────────
  async crear(payload: {
    nombre: string;
    descripcion?: string;
    coachId: number;
    fechaInicio: string;
    fechaFin: string;
    tipoPeriodo: TipoPeriodoCurso;
  }): Promise<Curso> {
    const { data } = await api.post<ApiResponse<Curso>>('/courses', payload);
    return data.data!;
  },

  // ── ADMIN: Actualizar curso ─────────────────────────────────────────────
  async actualizar(
    id: number,
    payload: Partial<{
      nombre: string;
      descripcion: string;
      coachId: number;
      fechaInicio: string;
      fechaFin: string;
      tipoPeriodo: TipoPeriodoCurso;
      activo: boolean;
    }>
  ): Promise<Curso> {
    const { data } = await api.put<ApiResponse<Curso>>(`/courses/${id}`, payload);
    return data.data!;
  },

  // ── ADMIN: Eliminar curso ───────────────────────────────────────────────
  async eliminar(id: number): Promise<void> {
    await api.delete(`/courses/${id}`);
  },

  // ── ADMIN: Agregar alumnos ──────────────────────────────────────────────
  async agregarAlumnos(cursoId: number, alumnoIds: number[]): Promise<CursoAlumno[]> {
    const { data } = await api.post<ApiResponse<CursoAlumno[]>>(
      `/courses/${cursoId}/students`,
      { alumnoIds }
    );
    return data.data!;
  },

  // ── ADMIN: Eliminar alumno ──────────────────────────────────────────────
  async eliminarAlumno(cursoId: number, alumnoId: number): Promise<void> {
    await api.delete(`/courses/${cursoId}/students/${alumnoId}`);
  },

  // ── COACH: Crear semana ─────────────────────────────────────────────────
  async crearSemana(cursoId: number, semana: number, dias: DiaInput[]): Promise<RutinaCurso> {
    const { data } = await api.post<ApiResponse<RutinaCurso>>(
      `/courses/${cursoId}/weeks`,
      { semana, dias }
    );
    return data.data!;
  },

  // ── COACH: Eliminar semana ──────────────────────────────────────────────
  async eliminarSemana(cursoId: number, semanaId: number): Promise<void> {
    await api.delete(`/courses/${cursoId}/weeks/${semanaId}`);
  },

  // ── COACH: Duplicar semana ──────────────────────────────────────────────
  async duplicarSemana(
    cursoId: number,
    semanaId: number,
    semanaDestino: number
  ): Promise<RutinaCurso> {
    const { data } = await api.post<ApiResponse<RutinaCurso>>(
      `/courses/${cursoId}/weeks/${semanaId}/duplicate`,
      { semanaDestino }
    );
    return data.data!;
  },

  // ── COACH: Agregar día a una semana ────────────────────────────────────
  async agregarDia(
    cursoId: number,
    semanaId: number,
    diaSemana: number,
    ejercicios: EjercicioDia[]
  ): Promise<RutinaCursoDia> {
    const { data } = await api.post<ApiResponse<RutinaCursoDia>>(
      `/courses/${cursoId}/weeks/${semanaId}/days`,
      { diaSemana, ejercicios }
    );
    return data.data!;
  },

  // ── COACH: Actualizar día ───────────────────────────────────────────────
  async actualizarDia(
    cursoId: number,
    semanaId: number,
    diaId: number,
    ejercicios: EjercicioDia[]
  ): Promise<RutinaCursoDia> {
    const { data } = await api.put<ApiResponse<RutinaCursoDia>>(
      `/courses/${cursoId}/weeks/${semanaId}/days/${diaId}`,
      { ejercicios }
    );
    return data.data!;
  },

  // ── USUARIO: Mi progreso en el curso ───────────────────────────────────
  async obtenerMiProgreso(cursoId: number): Promise<ProgresoEjercicioCurso[]> {
    const { data } = await api.get<ApiResponse<ProgresoEjercicioCurso[]>>(
      `/courses/${cursoId}/my-progress`
    );
    return data.data!;
  },

  // ── USUARIO: Guardar progreso ───────────────────────────────────────────
  async guardarProgreso(
    cursoId: number,
    payload: {
      rutinaCursoDiaEjercicioId: number;
      fecha: string;
      repeticionesRealizadas?: number;
      tiempoRealizadoSeg?: number;
      completado: boolean;
    }
  ): Promise<ProgresoEjercicioCurso> {
    const { data } = await api.post<ApiResponse<ProgresoEjercicioCurso>>(
      `/courses/${cursoId}/progress`,
      payload
    );
    return data.data!;
  },

  // ── Reporte del curso ───────────────────────────────────────────────────
  async reporteCurso(cursoId: number): Promise<ReporteCurso> {
    const { data } = await api.get<ApiResponse<ReporteCurso>>(`/courses/${cursoId}/report`);
    return data.data!;
  },

  // ── Reporte alumno en el curso ──────────────────────────────────────────
  async reporteAlumnoCurso(cursoId: number, alumnoId: number): Promise<DetalleAlumnoCurso> {
    const { data } = await api.get<ApiResponse<DetalleAlumnoCurso>>(`/courses/${cursoId}/report/${alumnoId}`);
    return data.data!;
  },
};
