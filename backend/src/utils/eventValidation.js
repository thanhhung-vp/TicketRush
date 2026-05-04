import { z } from 'zod';

export const CATEGORIES = [
  'music', 'fan_meeting', 'merchandise', 'arts', 'sports',
  'conference', 'education', 'nightlife', 'livestream', 'travel', 'other',
];

const eventFields = {
  title:       z.string().min(3).max(200),
  description: z.string().max(5000).nullable().optional(),
  venue:       z.string().min(3).max(300),
  event_date:  z.string().datetime({ offset: true }),
  poster_url:  z.string().url().optional().or(z.literal('')),
  category:    z.enum(CATEGORIES).default('other'),
  status:      z.enum(['draft', 'on_sale', 'ended']).optional(),
  is_featured: z.boolean().optional(),
  queue_enabled: z.boolean().optional(),
  queue_batch_size: z.number().int().min(1).max(500).optional(),
};

export const eventSchema = z.object(eventFields);
export const eventUpdateSchema = z.object(eventFields).partial();
