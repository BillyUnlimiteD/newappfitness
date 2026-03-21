import { prisma } from '../lib/prisma';

const DIAS_RETENCION = 30;

export type MotivoLog =
  | 'USUARIO_NO_EXISTE'
  | 'CONTRASENA_INCORRECTA'
  | 'CUENTA_BLOQUEADA'
  | 'BLOQUEADO_POR_INTENTOS';

export class LoginLogsService {
  /**
   * Registra un intento de login fallido y elimina los registros
   * con más de 30 días de antigüedad.
   */
  async registrar(correo: string, ip: string, motivo: MotivoLog, intentos?: number) {
    const limite = new Date();
    limite.setDate(limite.getDate() - DIAS_RETENCION);

    await prisma.$transaction([
      // Eliminar logs antiguos
      prisma.errorLoginLog.deleteMany({ where: { creadoEn: { lt: limite } } }),
      // Insertar nuevo log
      prisma.errorLoginLog.create({ data: { correo, ip, motivo, intentos } }),
    ]);
  }

  async listar(filtros: { correo?: string; motivo?: string; pagina?: number }) {
    const { correo, motivo, pagina = 1 } = filtros;
    const LIMITE = 50;
    const skip = (pagina - 1) * LIMITE;

    const where = {
      ...(correo ? { correo: { contains: correo } } : {}),
      ...(motivo ? { motivo } : {}),
    };

    const [total, logs] = await prisma.$transaction([
      prisma.errorLoginLog.count({ where }),
      prisma.errorLoginLog.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        skip,
        take: LIMITE,
      }),
    ]);

    return { logs, total, pagina, totalPaginas: Math.ceil(total / LIMITE) };
  }
}

export const loginLogsService = new LoginLogsService();
