import { PrismaClient, TipoUsuario } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── Admin inicial ─────────────────────────────────────────────────────────
  // Credenciales configuradas en .env (SEED_ADMIN_CORREO / SEED_ADMIN_PASSWORD)
  const correo = process.env.SEED_ADMIN_CORREO || 'admin@fitness.cl';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
  const nombre = process.env.SEED_ADMIN_NOMBRE || 'Administrador';
  const apellido = process.env.SEED_ADMIN_APELLIDO || '';
  const rut = process.env.SEED_ADMIN_RUT || '';
  const telefono = process.env.SEED_ADMIN_TELEFONO || '';

  const perfilCompleto = !!(nombre && apellido && rut && telefono);
  const hash = await bcrypt.hash(password, 12);

  const admin = await prisma.usuario.upsert({
    where: { correo },
    update: {},
    create: {
      correo,
      passwordHash: hash,
      tipoUsuario: TipoUsuario.ADMINISTRADOR,
      nombre: nombre || null,
      apellido: apellido || null,
      rut: rut || null,
      telefonoContacto: telefono || null,
      perfilCompleto,
      passwordTemporal: false,
    },
  });

  console.log('✅ Admin creado:', admin.correo);
  console.log('\n🎉 Seed completado.\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
