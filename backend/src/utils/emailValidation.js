import { z } from 'zod';

const GMAIL_DOMAIN = 'gmail.com';
const GMAIL_LOCAL_PART_PATTERN = /^[a-z0-9.]+$/;

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function hasValidGmailAccountFormat(email) {
  const normalizedEmail = normalizeEmail(email);
  const parts = normalizedEmail.split('@');
  if (parts.length !== 2) return true;

  const [localPart, domain] = parts;
  if (domain !== GMAIL_DOMAIN) return true;

  return (
    localPart.length >= 6 &&
    localPart.length <= 30 &&
    GMAIL_LOCAL_PART_PATTERN.test(localPart) &&
    !localPart.startsWith('.') &&
    !localPart.endsWith('.') &&
    !localPart.includes('..')
  );
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'Invalid email format' })
  .refine(hasValidGmailAccountFormat, {
    message: 'Invalid Gmail account format',
  });
