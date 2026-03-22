import { z } from 'zod';

// Regla compartida de contraseña segura
const passwordSegura = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña no puede superar los 128 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número');

export const loginSchema = z.object({
  correo: z.string().email('Correo inválido').max(255),
  password: z.string().min(1, 'La contraseña es requerida').max(128),
});

export const registerSchema = z.object({
  correo: z.string().email('Correo inválido').max(255),
  password: passwordSegura,
  confirmPassword: z.string(),
  tipoUsuario: z.enum(['ADMINISTRADOR', 'COACH', 'APODERADO', 'USUARIO']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  passwordActual: z.string().min(1, 'La contraseña actual es requerida').max(128),
  passwordNueva: passwordSegura,
  confirmPassword: z.string(),
}).refine((data) => data.passwordNueva === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
