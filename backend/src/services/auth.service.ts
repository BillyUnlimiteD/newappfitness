import { TipoUsuario } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/password.utils';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.utils';
import { AppError } from '../middlewares/error.middleware';
import { LoginInput, RegisterInput, ChangePasswordInput } from '../validators/auth.validator';
import { JwtPayload } from '../types';
import { loginLogsService } from './login-logs.service';

const MAX_INTENTOS = 10;

export class AuthService {
  private buildPayload(user: {
    id: number;
    correo: string;
    tipoUsuario: TipoUsuario;
    perfilCompleto: boolean;
    passwordTemporal: boolean;
  }): JwtPayload {
    return {
      userId: user.id,
      correo: user.correo,
      tipoUsuario: user.tipoUsuario,
      perfilCompleto: user.perfilCompleto,
      passwordTemporal: user.passwordTemporal,
    };
  }

  async login(data: LoginInput, ip: string) {
    const user = await prisma.usuario.findUnique({ where: { correo: data.correo } });

    if (!user) {
      await loginLogsService.registrar(data.correo, ip, 'USUARIO_NO_EXISTE');
      throw new AppError('No existe una cuenta con ese correo electrónico', 401);
    }

    if (!user.activo) {
      await loginLogsService.registrar(data.correo, ip, 'CUENTA_BLOQUEADA');
      throw new AppError('Tu cuenta está bloqueada. Contacta al administrador.', 403);
    }

    const passwordValida = await comparePassword(data.password, user.passwordHash);
    if (!passwordValida) {
      const intentos = user.intentosFallidos + 1;

      if (intentos >= MAX_INTENTOS) {
        await prisma.usuario.update({
          where: { id: user.id },
          data: { intentosFallidos: intentos, activo: false },
        });
        await loginLogsService.registrar(data.correo, ip, 'BLOQUEADO_POR_INTENTOS', intentos);
        throw new AppError('Tu cuenta ha sido bloqueada por demasiados intentos fallidos. Contacta al administrador.', 403);
      }

      await prisma.usuario.update({
        where: { id: user.id },
        data: { intentosFallidos: intentos },
      });
      await loginLogsService.registrar(data.correo, ip, 'CONTRASENA_INCORRECTA', intentos);

      const restantes = MAX_INTENTOS - intentos;
      throw new AppError(
        restantes === 1
          ? 'Contraseña incorrecta. Último intento antes de bloquear la cuenta.'
          : `Contraseña incorrecta. Te quedan ${restantes} intentos.`,
        401
      );
    }

    // Login exitoso: resetear contador y actualizar última conexión
    await prisma.usuario.update({
      where: { id: user.id },
      data: { ultimaConexion: new Date(), intentosFallidos: 0 },
    });

    const payload = this.buildPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        correo: user.correo,
        nombre: user.nombre,
        apellido: user.apellido,
        rut: user.rut,
        telefonoContacto: user.telefonoContacto,
        tipoUsuario: user.tipoUsuario,
        perfilCompleto: user.perfilCompleto,
        passwordTemporal: user.passwordTemporal,
      },
    };
  }

  async register(data: RegisterInput) {
    const existe = await prisma.usuario.findUnique({ where: { correo: data.correo } });
    if (existe) throw new AppError('Ya existe un usuario con ese correo', 409);

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.usuario.create({
      data: {
        correo: data.correo,
        passwordHash,
        tipoUsuario: data.tipoUsuario as TipoUsuario,
        perfilCompleto: false,
      },
    });

    const payload = this.buildPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        correo: user.correo,
        tipoUsuario: user.tipoUsuario,
        perfilCompleto: user.perfilCompleto,
        passwordTemporal: user.passwordTemporal,
      },
    };
  }

  async refreshToken(token: string) {
    let payload: JwtPayload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError('Refresh token inválido o expirado', 401);
    }

    const user = await prisma.usuario.findUnique({ where: { id: payload.userId } });
    if (!user || !user.activo) throw new AppError('Usuario no encontrado', 401);

    const newPayload = this.buildPayload(user);
    return {
      accessToken: generateAccessToken(newPayload),
      refreshToken: generateRefreshToken(newPayload),
    };
  }

  async changePassword(userId: number, data: ChangePasswordInput) {
    const user = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const passwordValida = await comparePassword(data.passwordActual, user.passwordHash);
    if (!passwordValida) throw new AppError('La contraseña actual es incorrecta', 400);

    const nuevoHash = await hashPassword(data.passwordNueva);

    const updatedUser = await prisma.usuario.update({
      where: { id: userId },
      data: {
        passwordHash: nuevoHash,
        passwordTemporal: false,
      },
    });

    const payload = this.buildPayload(updatedUser);
    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
      message: 'Contraseña actualizada correctamente',
    };
  }
}

export const authService = new AuthService();
