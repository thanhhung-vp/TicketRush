import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import {
  AuthBg, AuthCard, IconInput, PinkButton, AuthDivider, GoogleAuthButton, Checkbox,
  EnvelopeIcon, LockIcon, EyeIcon, EyeOffIcon,
} from '../components/AuthLayout.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.error || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBg>
      <AuthCard title={t('auth.loginTitle')}>
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handle} className="space-y-3.5">
          <IconInput
            icon={<EnvelopeIcon />}
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
            autoFocus
          />
          <IconInput
            icon={<LockIcon />}
            type={showPw ? 'text' : 'password'}
            placeholder={t('auth.passwordPlaceholder')}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
            rightEl={
              <button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-400 hover:text-gray-600 transition">
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          />

          <div className="flex items-center justify-between pt-0.5">
            <Checkbox
              checked={remember}
              onChange={setRemember}
              label={<span className="text-sm text-gray-600">{t('auth.rememberMe')}</span>}
            />
            <Link to="/forgot-password" className="text-sm text-blue-500 hover:text-blue-600 font-medium transition">
              {t('auth.forgotPassword')}
            </Link>
          </div>

          <div className="pt-1">
            <PinkButton type="submit" disabled={loading}>
              {loading ? t('auth.loggingIn') : t('auth.loginTitle')}
            </PinkButton>
          </div>
        </form>

        <AuthDivider text={t('auth.orLoginWith')} />
        <GoogleAuthButton />

        <p className="mt-5 text-center text-sm text-gray-500">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-blue-500 hover:text-blue-600 font-semibold transition">
            {t('auth.registerNow')}
          </Link>
        </p>
      </AuthCard>
    </AuthBg>
  );
}
