import { z } from 'zod';
import { CATEGORIES } from '../../../domain/constants.js';

export const createEventSchema = z.object({
  title:       z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  venue:       z.string().min(3).max(300),
  event_date:  z.string().datetime({ offset: true }),
  poster_url:  z.string().url().optional().or(z.literal('')),
  category:    z.enum(CATEGORIES).default('other'),
  status:      z.enum(['draft', 'on_sale', 'ended']).optional(),
});

export const zoneSchema = z.object({
  name:  z.string().min(1).max(50),
  rows:  z.number().int().min(1).max(50),
  cols:  z.number().int().min(1).max(50),
  price: z.number().min(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});
