import { z } from 'zod';
import { PAYMENT_METHOD } from '../../../domain/constants.js';

export const initiateSchema = z.object({
  seat_ids: z.array(z.string().uuid()).min(1).max(10),
  method:   z.enum([PAYMENT_METHOD.MOCK, PAYMENT_METHOD.VNPAY, PAYMENT_METHOD.MOMO]).default('mock'),
});

export const confirmSchema = z.object({
  order_id: z.string().uuid(),
  method:   z.enum([PAYMENT_METHOD.MOCK, PAYMENT_METHOD.VNPAY, PAYMENT_METHOD.MOMO]).default('mock'),
});
