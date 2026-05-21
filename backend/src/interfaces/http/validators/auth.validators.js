import { z } from 'zod';
import { emailSchema } from '../../../utils/emailValidation.js';
import { isPasswordAtLeastMedium, PASSWORD_POLICY_ERROR } from '../../../utils/passwordStrength.js';

const genderSchema = z.enum(['male', 'female', 'other']);
const birthYearSchema = z.number().int().min(1900).max(new Date().getFullYear());
const birthDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const registerSchema = z.object({
  email:      emailSchema,
  password:   z.string().min(1).refine(isPasswordAtLeastMedium, { message: PASSWORD_POLICY_ERROR }),
  full_name:  z.string().min(2).max(100),
  gender:     genderSchema.nullable().optional(),
  birth_date: birthDateSchema.nullable().optional(),
  birth_year: birthYearSchema.nullable().optional(),
});

export const loginSchema = z.object({
  email:    emailSchema,
  password: z.string().min(1),
});

export const profileSchema = z.object({
  full_name:  z.string().min(2).max(100).optional(),
  gender:     genderSchema.nullable().optional(),
  birth_date: birthDateSchema.nullable().optional(),
  birth_year: birthYearSchema.nullable().optional(),
});
