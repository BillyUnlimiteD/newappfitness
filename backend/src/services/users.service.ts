import { TipoUsuario } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { hashPassword, comparePassword, generateTempPassword } from '../utils/password.utils';
import {
  CompletarPerfilInput,
  CreateUsuarioAdminInput,
  UpdateUsuarioAdminInput,
} from '../validators/users.validator';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.utils';

const SELECT_USER_PUBLIC = {
  id: true,
  correo: true,
  nombre: true,
  apellido: true,
  rut: true,
  telefonoContacto: true,
  lesiones: true,
  tipoUsuario: true,
  perfilCompleto: true,
  passwordTemporal: true,
  activo: true,
  ultimaConexion: true,
  creadoEn: true,
};

export class UsersService {
  // ── Perfil propio ─────────────────────────────────────────────────────────

  async completarPerfil(userId: number, data: CompletarPerfilInput) {
    // Verificar unicidad del RUT
    const rutExiste = await prisma.usuario.findFirst({
      where: { rut: data.rut, id: { not: userId } },
    });
    if (rutExiste) throw new AppError('El RUT ya está registrado', 409);

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: {
        ...data,
        perfilCompleto: true,
      },
    });

    // Regenerar tokens con perfilCompleto = true
    const payload = {
      userId: updated.id,
      correo: updated.correo,
      tipoUsuario: updated.tipoUsuario,
      perfilCompleto: updated.perfilCompleto,
      passwordTemporal: updated.passwordTemporal,
    };

    return {
      user: { id: updated.id, nombre: updated.nombre, apellido: updated.apellido, rut: updated.rut, tipoUsuario: updated.tipoUsuario, perfilCompleto: true },
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
    };
  }

  async updatePerfil(userId: number, data: { nombre?: string; apellido?: string; telefonoContacto?: string }) {
    const user = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data,
      select: SELECT_USER_PUBLIC,
    });
    return updated;
  }

  async cambiarPassword(userId: number, passwordActual: string, passwordNueva: string) {
    const user = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const valida = await comparePassword(passwordActual, user.passwordHash);
    if (!valida) throw new AppError('La contraseña actual es incorrecta', 400);

    const hash = await hashPassword(passwordNueva);
    await prisma.usuario.update({
      where: { id: userId },
      data: { passwordHash: hash, passwordTemporal: false },
    });
  }

  // ── CRUD Admin ────────────────────────────────────────────────────────────

  async listarUsuarios(filtroTipo?: TipoUsuario) {
    return prisma.usuario.findMany({
      where: filtroTipo ? { tipoUsuario: filtroTipo } : {},
      select: {
        ...SELECT_USER_PUBLIC,
        coachAsignado: {
          select: {
            coach: { select: { id: true, nombre: true, apellido: true, correo: true } },
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async obtenerUsuario(id: number) {
    const user = await prisma.usuario.findUnique({
      where: { id },
      select: {
        ...SELECT_USER_PUBLIC,
        coachAsignado: {
          select: {
            coach: { select: { id: true, nombre: true, apellido: true, correo: true } },
          },
        },
        supervisa: {
          select: {
            supervisado: { select: { id: true, nombre: true, apellido: true } },
          },
        },
      },
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    return user;
  }

  async crearUsuario(data: CreateUsuarioAdminInput) {
    const existe = await prisma.usuario.findUnique({ where: { correo: data.correo } });
    if (existe) throw new AppError('Ya existe un usuario con ese correo', 409);

    if (data.rut) {
      const rutExiste = await prisma.usuario.findFirst({ where: { rut: data.rut } });
      if (rutExiste) throw new AppError('El RUT ya está registrado', 409);
    }

    // Generar contraseña temporal
    const { password: tempPass, hash } = await generateTempPassword();

    const perfilCompleto = !!(data.nombre && data.apellido && data.rut && data.telefonoContacto);

    const user = await prisma.usuario.create({
      data: {
        correo: data.correo,
        passwordHash: hash,
        passwordTemporal: true,
        tipoUsuario: data.tipoUsuario as TipoUsuario,
        nombre: data.nombre,
        apellido: data.apellido,
        rut: data.rut,
        telefonoContacto: data.telefonoContacto,
        perfilCompleto,
      },
      select: SELECT_USER_PUBLIC,
    });

    // Si es USUARIO y tiene coachId, crear relación
    if (data.tipoUsuario === 'USUARIO' && data.coachId) {
      await this.asignarCoach(user.id, data.coachId);
    }

    return { user, tempPassword: tempPass };
  }

  async importarUsuarios(usuarios: { correo: string; nombre?: string; apellido?: string; rut?: string; telefonoContacto?: string }[]) {
    const creados: { correo: string; nombre: string | null; apellido: string | null; tempPassword: string }[] = [];
    const errores: { correo: string; error: string }[] = [];

    for (const u of usuarios) {
      try {
        if (!u.correo) { errores.push({ correo: u.correo || '(sin correo)', error: 'Correo requerido' }); continue; }
        const existe = await prisma.usuario.findUnique({ where: { correo: u.correo } });
        if (existe) { errores.push({ correo: u.correo, error: 'Correo ya registrado' }); continue; }
        if (u.rut) {
          const rutExiste = await prisma.usuario.findFirst({ where: { rut: u.rut } });
          if (rutExiste) { errores.push({ correo: u.correo, error: 'RUT ya registrado' }); continue; }
        }
        const { password: tempPass, hash } = await generateTempPassword();
        const perfilCompleto = !!(u.nombre && u.apellido && u.rut && u.telefonoContacto);
        const user = await prisma.usuario.create({
          data: {
            correo: u.correo,
            passwordHash: hash,
            passwordTemporal: true,
            tipoUsuario: 'USUARIO',
            nombre: u.nombre || null,
            apellido: u.apellido || null,
            rut: u.rut || null,
            telefonoContacto: u.telefonoContacto || null,
            perfilCompleto,
          },
        });
        creados.push({ correo: user.correo, nombre: user.nombre, apellido: user.apellido, tempPassword: tempPass });
      } catch {
        errores.push({ correo: u.correo || '(error)', error: 'Error al crear usuario' });
      }
    }
    return { creados, errores };
  }

  async actualizarUsuario(id: number, data: UpdateUsuarioAdminInput) {
    const user = await prisma.usuario.findUnique({ where: { id } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    if (data.rut && data.rut !== user.rut) {
      const rutExiste = await prisma.usuario.findFirst({ where: { rut: data.rut, id: { not: id } } });
      if (rutExiste) throw new AppError('El RUT ya está registrado', 409);
    }

    const { coachId, ...updateData } = data;

    // Recalcular perfilCompleto
    const merged = { ...user, ...updateData };
    const perfilCompleto = !!(merged.nombre && merged.apellido && merged.rut && merged.telefonoContacto);

    const updated = await prisma.usuario.update({
      where: { id },
      data: { ...updateData, perfilCompleto },
      select: SELECT_USER_PUBLIC,
    });

    // Actualizar coach si se proporciona
    if (updated.tipoUsuario === 'USUARIO' && coachId !== undefined) {
      if (coachId === null) {
        await prisma.coachUsuario.deleteMany({ where: { usuarioId: id } });
      } else {
        await this.asignarCoach(id, coachId);
      }
    }

    return updated;
  }

  async toggleActivo(id: number) {
    const user = await prisma.usuario.findUnique({ where: { id } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const updated = await prisma.usuario.update({
      where: { id },
      // Al activar, se resetean los intentos fallidos
      data: { activo: !user.activo, ...(!user.activo ? { intentosFallidos: 0 } : {}) },
      select: SELECT_USER_PUBLIC,
    });
    return updated;
  }

  async resetearPassword(id: number) {
    const user = await prisma.usuario.findUnique({ where: { id } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const { password: tempPass, hash } = await generateTempPassword();

    await prisma.usuario.update({
      where: { id },
      data: { passwordHash: hash, passwordTemporal: true },
    });

    return { tempPassword: tempPass };
  }

  async asignarCoach(usuarioId: number, coachId: number) {
    // Verificar que el coach existe y tiene rol COACH
    const coach = await prisma.usuario.findUnique({ where: { id: coachId } });
    if (!coach || coach.tipoUsuario !== 'COACH') {
      throw new AppError('El coach especificado no existe o no tiene rol COACH', 400);
    }

    // Upsert: si ya tiene coach, actualizar
    await prisma.coachUsuario.upsert({
      where: { usuarioId },
      update: { coachId },
      create: { usuarioId, coachId },
    });
  }

  async actualizarLesiones(apoderadoId: number, supervisadoId: number, lesiones: string) {
    const supervisa = await prisma.apoderadoUsuario.findFirst({
      where: { apoderadoId, supervisadoId },
    });
    if (!supervisa) throw new AppError('No tienes permiso para editar este usuario', 403);

    return prisma.usuario.update({
      where: { id: supervisadoId },
      data: { lesiones },
      select: { id: true, lesiones: true },
    });
  }

  // ── Supervisados de apoderado ─────────────────────────────────────────────

  async listarSupervisados(apoderadoId: number) {
    const apoderado = await prisma.usuario.findUnique({ where: { id: apoderadoId } });
    if (!apoderado) throw new AppError('Usuario no encontrado', 404);
    if (apoderado.tipoUsuario !== 'APODERADO') throw new AppError('El usuario no tiene rol APODERADO', 400);

    const relaciones = await prisma.apoderadoUsuario.findMany({
      where: { apoderadoId },
      include: {
        supervisado: { select: { id: true, nombre: true, apellido: true, correo: true, rut: true } },
      },
    });
    return relaciones.map((r) => r.supervisado);
  }

  async setSupervisados(apoderadoId: number, supervisadoIds: number[]) {
    const apoderado = await prisma.usuario.findUnique({ where: { id: apoderadoId } });
    if (!apoderado) throw new AppError('Usuario no encontrado', 404);
    if (apoderado.tipoUsuario !== 'APODERADO') throw new AppError('El usuario no tiene rol APODERADO', 400);

    if (supervisadoIds.length > 0) {
      const usuarios = await prisma.usuario.findMany({
        where: { id: { in: supervisadoIds }, tipoUsuario: 'USUARIO' },
        select: { id: true },
      });
      if (usuarios.length !== supervisadoIds.length) {
        throw new AppError('Uno o más usuarios no existen o no tienen rol USUARIO', 400);
      }
    }

    await prisma.$transaction([
      prisma.apoderadoUsuario.deleteMany({ where: { apoderadoId } }),
      ...(supervisadoIds.length > 0
        ? [prisma.apoderadoUsuario.createMany({
            data: supervisadoIds.map((supervisadoId) => ({ apoderadoId, supervisadoId })),
          })]
        : []),
    ]);

    return this.listarSupervisados(apoderadoId);
  }

  async listarCoaches() {
    return prisma.usuario.findMany({
      where: { tipoUsuario: 'COACH', activo: true },
      select: { id: true, nombre: true, apellido: true, correo: true },
    });
  }

  async listarUsuariosDelCoach(coachId: number) {
    const relaciones = await prisma.coachUsuario.findMany({
      where: { coachId },
      include: {
        usuario: { select: SELECT_USER_PUBLIC },
      },
    });
    return relaciones.map((r) => r.usuario);
  }
}

export const usersService = new UsersService();
