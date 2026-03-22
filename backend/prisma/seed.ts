import { PrismaClient, TipoUsuario, GrupoMuscular, TipoPeriodo } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  const hash = async (pw: string) => bcrypt.hash(pw, 12);

  // ── 1. Usuarios ──────────────────────────────────────────────────────────────

  const admin = await prisma.usuario.upsert({
    where: { correo: process.env.SEED_ADMIN_CORREO || 'admin@fitness.cl' },
    update: {},
    create: {
      correo:          process.env.SEED_ADMIN_CORREO    || 'admin@fitness.cl',
      passwordHash:    await hash(process.env.SEED_ADMIN_PASSWORD || 'Admin123!'),
      tipoUsuario:     TipoUsuario.ADMINISTRADOR,
      nombre:          process.env.SEED_ADMIN_NOMBRE    || 'Administrador',
      apellido:        process.env.SEED_ADMIN_APELLIDO  || 'Principal',
      rut:             process.env.SEED_ADMIN_RUT       || '12345678-9',
      telefonoContacto:process.env.SEED_ADMIN_TELEFONO  || '+56912345678',
      perfilCompleto:  true,
      passwordTemporal:false,
    },
  });
  console.log('✅ Admin:', admin.correo);

  const coach = await prisma.usuario.upsert({
    where: { correo: 'coach@fitness.cl' },
    update: {},
    create: {
      correo:           'coach@fitness.cl',
      passwordHash:     await hash('Coach123!'),
      tipoUsuario:      TipoUsuario.COACH,
      nombre:           'Carlos',
      apellido:         'Muñoz',
      rut:              '11111111-1',
      telefonoContacto: '+56911111111',
      perfilCompleto:   true,
      passwordTemporal: false,
    },
  });
  console.log('✅ Coach:', coach.correo);

  const usuario = await prisma.usuario.upsert({
    where: { correo: 'usuario@fitness.cl' },
    update: {},
    create: {
      correo:           'usuario@fitness.cl',
      passwordHash:     await hash('User123!'),
      tipoUsuario:      TipoUsuario.USUARIO,
      nombre:           'Juan',
      apellido:         'Pérez',
      rut:              '22222222-2',
      telefonoContacto: '+56922222222',
      perfilCompleto:   true,
      passwordTemporal: false,
    },
  });
  console.log('✅ Usuario:', usuario.correo);

  const apoderado = await prisma.usuario.upsert({
    where: { correo: 'apoderado@fitness.cl' },
    update: {},
    create: {
      correo:           'apoderado@fitness.cl',
      passwordHash:     await hash('Apod123!'),
      tipoUsuario:      TipoUsuario.APODERADO,
      nombre:           'María',
      apellido:         'González',
      rut:              '33333333-3',
      telefonoContacto: '+56933333333',
      perfilCompleto:   true,
      passwordTemporal: false,
    },
  });
  console.log('✅ Apoderado:', apoderado.correo);

  // ── 2. Relación Coach → Usuario ──────────────────────────────────────────────

  await prisma.coachUsuario.upsert({
    where:  { usuarioId: usuario.id },
    update: {},
    create: { coachId: coach.id, usuarioId: usuario.id },
  });
  console.log('✅ Coach asignado a usuario');

  // ── 3. Relación Apoderado → Usuario ──────────────────────────────────────────

  await prisma.apoderadoUsuario.upsert({
    where:  { apoderadoId_supervisadoId: { apoderadoId: apoderado.id, supervisadoId: usuario.id } },
    update: {},
    create: { apoderadoId: apoderado.id, supervisadoId: usuario.id },
  });
  console.log('✅ Apoderado vinculado a usuario');

  // ── 4. Ejercicios ─────────────────────────────────────────────────────────────

  const ejercicios = await Promise.all([
    prisma.ejercicio.upsert({
      where:  { id: 1 },
      update: {},
      create: {
        titulo:        'Sentadilla',
        descripcion:   'Flexión de rodillas manteniendo la espalda recta. Baja hasta que los muslos queden paralelos al suelo.',
        grupoMuscular: GrupoMuscular.CUADRICEPS,
      },
    }),
    prisma.ejercicio.upsert({
      where:  { id: 2 },
      update: {},
      create: {
        titulo:        'Flexiones de pecho',
        descripcion:   'Desde posición de plancha, baja el pecho al suelo y empuja hacia arriba manteniendo el cuerpo alineado.',
        grupoMuscular: GrupoMuscular.PECHO,
      },
    }),
    prisma.ejercicio.upsert({
      where:  { id: 3 },
      update: {},
      create: {
        titulo:        'Plancha abdominal',
        descripcion:   'Mantén el cuerpo en línea recta apoyado en antebrazos y punta de pies. Contrae el abdomen durante todo el ejercicio.',
        grupoMuscular: GrupoMuscular.ABDOMEN,
      },
    }),
    prisma.ejercicio.upsert({
      where:  { id: 4 },
      update: {},
      create: {
        titulo:        'Remo con mancuerna',
        descripcion:   'Apoya una rodilla en el banco, tira la mancuerna hacia la cadera manteniendo la espalda plana.',
        grupoMuscular: GrupoMuscular.ESPALDA,
      },
    }),
    prisma.ejercicio.upsert({
      where:  { id: 5 },
      update: {},
      create: {
        titulo:        'Press de hombros',
        descripcion:   'Sentado o de pie, empuja las mancuernas hacia arriba hasta extender los brazos completamente.',
        grupoMuscular: GrupoMuscular.HOMBROS,
      },
    }),
    prisma.ejercicio.upsert({
      where:  { id: 6 },
      update: {},
      create: {
        titulo:        'Zancadas',
        descripcion:   'Da un paso al frente y baja la rodilla trasera casi hasta el suelo. Alterna piernas.',
        grupoMuscular: GrupoMuscular.GLUTEOS,
      },
    }),
  ]);
  console.log(`✅ ${ejercicios.length} ejercicios creados`);

  // ── 5. Rutina semanal de prueba ───────────────────────────────────────────────
  // Semana actual: lunes al domingo

  const hoy = new Date();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7)); // lunes de esta semana
  lunes.setHours(0, 0, 0, 0);

  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  const dia = (offset: number) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + offset);
    return d;
  };

  const rutina = await prisma.rutina.upsert({
    where: { id: 1 },
    update: {},
    create: {
      usuarioId:   usuario.id,
      coachId:     coach.id,
      fechaInicio: lunes,
      fechaFin:    domingo,
      tipoPeriodo: TipoPeriodo.SEMANAL,
      activa:      true,
    },
  });
  console.log('✅ Rutina semanal creada');

  // Día 1 — Lunes: Pecho + Abdomen
  const dia1 = await prisma.rutinaDia.upsert({
    where:  { rutinaId_fecha: { rutinaId: rutina.id, fecha: dia(0) } },
    update: {},
    create: { rutinaId: rutina.id, fecha: dia(0) },
  });

  await prisma.rutinaDiaEjercicio.upsert({
    where:  { rutinaDiaId_orden: { rutinaDiaId: dia1.id, orden: 1 } },
    update: {},
    create: { rutinaDiaId: dia1.id, ejercicioId: ejercicios[1].id, orden: 1, repeticionesObj: 12, comentarioCoach: 'Controla la bajada, 3 series' },
  });
  await prisma.rutinaDiaEjercicio.upsert({
    where:  { rutinaDiaId_orden: { rutinaDiaId: dia1.id, orden: 2 } },
    update: {},
    create: { rutinaDiaId: dia1.id, ejercicioId: ejercicios[2].id, orden: 2, tiempoObjetivoSeg: 45, comentarioCoach: '3 series de 45 segundos' },
  });

  // Día 2 — Miércoles: Piernas + Glúteos
  const dia2 = await prisma.rutinaDia.upsert({
    where:  { rutinaId_fecha: { rutinaId: rutina.id, fecha: dia(2) } },
    update: {},
    create: { rutinaId: rutina.id, fecha: dia(2) },
  });

  await prisma.rutinaDiaEjercicio.upsert({
    where:  { rutinaDiaId_orden: { rutinaDiaId: dia2.id, orden: 1 } },
    update: {},
    create: { rutinaDiaId: dia2.id, ejercicioId: ejercicios[0].id, orden: 1, repeticionesObj: 15, comentarioCoach: '4 series. Mantén la rodilla alineada con el pie' },
  });
  await prisma.rutinaDiaEjercicio.upsert({
    where:  { rutinaDiaId_orden: { rutinaDiaId: dia2.id, orden: 2 } },
    update: {},
    create: { rutinaDiaId: dia2.id, ejercicioId: ejercicios[5].id, orden: 2, repeticionesObj: 12, comentarioCoach: '3 series por pierna' },
  });

  // Día 3 — Viernes: Espalda + Hombros
  const dia3 = await prisma.rutinaDia.upsert({
    where:  { rutinaId_fecha: { rutinaId: rutina.id, fecha: dia(4) } },
    update: {},
    create: { rutinaId: rutina.id, fecha: dia(4) },
  });

  await prisma.rutinaDiaEjercicio.upsert({
    where:  { rutinaDiaId_orden: { rutinaDiaId: dia3.id, orden: 1 } },
    update: {},
    create: { rutinaDiaId: dia3.id, ejercicioId: ejercicios[3].id, orden: 1, repeticionesObj: 10, comentarioCoach: '3 series por brazo' },
  });
  await prisma.rutinaDiaEjercicio.upsert({
    where:  { rutinaDiaId_orden: { rutinaDiaId: dia3.id, orden: 2 } },
    update: {},
    create: { rutinaDiaId: dia3.id, ejercicioId: ejercicios[4].id, orden: 2, repeticionesObj: 12, comentarioCoach: '3 series, no bloquees los codos arriba' },
  });

  console.log('✅ Rutina con 3 días y ejercicios creada');

  console.log('\n🎉 Seed completado.\n');
  console.log('  ADMINISTRADOR → admin@fitness.cl     / Admin123!');
  console.log('  COACH         → coach@fitness.cl     / Coach123!');
  console.log('  USUARIO       → usuario@fitness.cl   / User123!');
  console.log('  APODERADO     → apoderado@fitness.cl / Apod123!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
