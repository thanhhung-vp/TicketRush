import { describe, expect, it } from 'vitest';
import { buildPasswordResetOtpEmail, resolveEmailProvider } from '../services/email.js';

describe('Email service configuration', () => {
  it('prefers Resend when RESEND_API_KEY is set', () => {
    expect(resolveEmailProvider({ RESEND_API_KEY: 're_test' })).toBe('resend');
  });

  it('falls back to configured SMTP when Resend is missing', () => {
    expect(resolveEmailProvider({
      SMTP_HOST: 'smtp.example.com',
      SMTP_USER: 'user',
      SMTP_PASS: 'pass',
    })).toBe('smtp');
  });

  it('reports no provider when email configuration is missing', () => {
    expect(resolveEmailProvider({})).toBe('none');
  });

  it('escapes OTP email HTML content', () => {
    const html = buildPasswordResetOtpEmail({ otp: '<123456>' });

    expect(html).toContain('&lt;123456&gt;');
    expect(html).not.toContain('<123456>');
  });
});
