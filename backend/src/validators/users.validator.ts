import { z } from 'zod';

// Validador de RUT chileno (formato: 12345678-9 o 1234567-K)
const rutRegex = /^\d{7,8}-[\dkK]$/;

export const completarPerfilSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').max(100),
  apellido: z.string().min(2, 'Apellido debe tener al menos 2 caracteres').max(100),
  rut: z.string().regex(rutRegex, 'RUT inválido (formato: 12345678-9)'),
  telefonoContacto: z.string().min(8, 'Teléfono debe tener al menos 8 dígitos').max(20),
});

export const updatePerfilSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  apellido: z.string().min(2).max(100).optional(),
  telefonoContacto: z.string().min(8).max(20).optional(),
  lesiones: z.string().max(2000).optional(),
  // RUT no es editable una vez asignado
});

export const updateLesionesSchema = z.object({
  lesiones: z.string().max(2000),
});

export const cambiarPasswordSchema = z.object({
  passwordActual: z.string().min(1, 'La contraseña actual es requerida'),
  passwordNueva: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
});

export const createUsuarioAdminSchema = z.object({
  correo: z.string().email('Correo inválido'),
  tipoUsuario: z.enum(['ADMINISTRADOR', 'COACH', 'APODERADO', 'USUARIO']),
  nombre: z.string().min(2).max(100).optional(),
  apellido: z.string().min(2).max(100).optional(),
  rut: z.string().regex(rutRegex, 'RUT inválido').optional(),
  telefonoContacto: z.string().min(8).max(20).optional(),
  coachId: z.number().int().positive().optional(), // Solo para tipo USUARIO
});

export const updateUsuarioAdminSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  apellido: z.string().min(2).max(100).optional(),
  rut: z.string().regex(rutRegex, 'RUT inválido').optional(),
  telefonoContacto: z.string().min(8).max(20).optional(),
  tipoUsuario: z.enum(['ADMINISTRADOR', 'COACH', 'APODERADO', 'USUARIO']).optional(),
  activo: z.boolean().optional(),
  coachId: z.number().int().positive().nullable().optional(),
});

export type CompletarPerfilInput = z.infer<typeof completarPerfilSchema>;
export type CreateUsuarioAdminInput = z.infer<typeof createUsuarioAdminSchema>;
export type UpdateUsuarioAdminInput = z.infer<typeof updateUsuarioAdminSchema>;
