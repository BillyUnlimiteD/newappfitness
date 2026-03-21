import bcrypt from 'bcryptjs';
import { TempPasswordResult } from '../types';

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Genera una contraseña temporal aleatoria (8 chars: letras + números)
export const generateTempPassword = async (): Promise<TempPasswordResult> => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const password = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  const hash = await hashPassword(password);
  return { password, hash };
};
