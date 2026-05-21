export const PASSWORD_POLICY_ERROR = 'Mật khẩu phải có độ bảo mật từ trung bình trở lên';
export const PASSWORD_REUSE_ERROR = 'Mật khẩu mới không được trùng mật khẩu cũ';

export function evaluatePasswordStrength(password = '') {
  const value = String(password);
  const checks = {
    length: value.length >= 8,
    mixedCase: /[a-z]/.test(value) && /[A-Z]/.test(value),
    number: /\d/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
    long: value.length >= 12,
  };

  const score = Object.values(checks).filter(Boolean).length;
  const level = score >= 5 ? 'strong' : score >= 3 ? 'medium' : 'weak';

  return { level, score, checks };
}

export function isPasswordAtLeastMedium(password = '') {
  return evaluatePasswordStrength(password).score >= 3;
}
