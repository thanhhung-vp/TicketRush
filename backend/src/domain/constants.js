export const SEAT_STATUS = Object.freeze({ AVAILABLE: 'available', LOCKED: 'locked', SOLD: 'sold' });
export const ORDER_STATUS = Object.freeze({ PENDING: 'pending', PAID: 'paid', CANCELLED: 'cancelled' });
export const EVENT_STATUS = Object.freeze({ DRAFT: 'draft', ON_SALE: 'on_sale', ENDED: 'ended' });
export const USER_ROLE = Object.freeze({ CUSTOMER: 'customer', ADMIN: 'admin' });
export const PAYMENT_METHOD = Object.freeze({ MOCK: 'mock', VNPAY: 'vnpay', MOMO: 'momo' });
export const CATEGORIES = Object.freeze(['music', 'sports', 'arts', 'conference', 'comedy', 'festival', 'other']);
export const MAX_SEATS_PER_HOLD = 10;
export const QUEUE_BATCH_SIZE = 50;
