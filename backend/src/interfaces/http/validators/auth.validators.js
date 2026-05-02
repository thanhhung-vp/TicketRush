import { z } from 'zod';

export const registerSchema = z.object({
  email:      z.string().email(),
  password:   z.string().min(6),
  full_name:  z.string().min(2).max(100),
  gender:     z.enum(['male', 'female', 'other']).optional(),
  birth_year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
});

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const profileSchema = z.object({
  full_name:  z.string().min(2).max(100).optional(),
  gender:     z.enum(['male', 'female', 'other']).optional(),
  birth_year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
});
