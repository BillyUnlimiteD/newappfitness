import { Response } from 'express';
import { TipoUsuario } from '@prisma/client';
import { AuthRequest } from '../types';
import { usersService } from '../services/users.service';
import { sendSuccess } from '../utils/response.utils';
import {
  completarPerfilSchema,
  updatePerfilSchema,
  createUsuarioAdminSchema,
  updateUsuarioAdminSchema,
  updateLesionesSchema,
  cambiarPasswordSchema,
} from '../validators/users.validator';

export class UsersController {
  // ── Perfil propio ─────────────────────────────────────────────────────────

  async completarPerfil(req: AuthRequest, res: Response): Promise<void> {
    const data = completarPerfilSchema.parse(req.body);
    const result = await usersService.completarPerfil(req.user!.userId, data);
    sendSuccess(res, result, 'Perfil completado correctamente');
  }

  async updatePerfil(req: AuthRequest, res: Response): Promise<void> {
    const data = updatePerfilSchema.parse(req.body);
    const result = await usersService.updatePerfil(req.user!.userId, data);
    sendSuccess(res, result, 'Perfil actualizado');
  }

  async cambiarPassword(req: AuthRequest, res: Response): Promise<void> {
    const { passwordActual, passwordNueva } = cambiarPasswordSchema.parse(req.body);
    await usersService.cambiarPassword(req.user!.userId, passwordActual, passwordNueva);
    sendSuccess(res, null, 'Contraseña actualizada correctamente');
  }

  // ── CRUD Admin ────────────────────────────────────────────────────────────

  async listar(req: AuthRequest, res: Response): Promise<void> {
    const tipo = req.query.tipo as TipoUsuario | undefined;
    const result = await usersService.listarUsuarios(tipo);
    sendSuccess(res, result);
  }

  async obtener(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const result = await usersService.obtenerUsuario(id);
    sendSuccess(res, result);
  }

  async crear(req: AuthRequest, res: Response): Promise<void> {
    const data = createUsuarioAdminSchema.parse(req.body);
    const result = await usersService.crearUsuario(data);
    sendSuccess(res, result, 'Usuario creado correctamente', 201);
  }

  async importar(req: AuthRequest, res: Response): Promise<void> {
    const { usuarios } = req.body as { usuarios: { correo: string; nombre?: string; apellido?: string; rut?: string; telefonoContacto?: string }[] };
    if (!Array.isArray(usuarios) || usuarios.length === 0) throw new Error('Se requiere un listado de usuarios');
    if (usuarios.length > 500) throw new Error('No se pueden importar más de 500 usuarios por vez');
    const result = await usersService.importarUsuarios(usuarios);
    sendSuccess(res, result, `${result.creados.length} usuarios creados`);
  }

  async actualizar(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const data = updateUsuarioAdminSchema.parse(req.body);
    const result = await usersService.actualizarUsuario(id, data);
    sendSuccess(res, result, 'Usuario actualizado');
  }

  async toggleActivo(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const result = await usersService.toggleActivo(id);
    const estado = result.activo ? 'activado' : 'bloqueado';
    sendSuccess(res, result, `Usuario ${estado} correctamente`);
  }

  async resetearPassword(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const result = await usersService.resetearPassword(id);
    sendSuccess(res, result, 'Contraseña reseteada');
  }

  async actualizarLesiones(req: AuthRequest, res: Response): Promise<void> {
    const supervisadoId = parseInt(req.params.id);
    const { lesiones } = updateLesionesSchema.parse(req.body);
    const result = await usersService.actualizarLesiones(req.user!.userId, supervisadoId, lesiones);
    sendSuccess(res, result, 'Lesiones actualizadas');
  }

  async listarSupervisados(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const result = await usersService.listarSupervisados(id);
    sendSuccess(res, result);
  }

  async setSupervisados(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const { supervisadoIds } = req.body as { supervisadoIds: number[] };
    if (!Array.isArray(supervisadoIds)) throw new Error('supervisadoIds debe ser un array');
    const result = await usersService.setSupervisados(id, supervisadoIds);
    sendSuccess(res, result, 'Supervisados actualizados');
  }

  async listarCoaches(req: AuthRequest, res: Response): Promise<void> {
    const result = await usersService.listarCoaches();
    sendSuccess(res, result);
  }

  async listarMisUsuarios(req: AuthRequest, res: Response): Promise<void> {
    const result = await usersService.listarUsuariosDelCoach(req.user!.userId);
    sendSuccess(res, result);
  }
}

export const usersController = new UsersController();
