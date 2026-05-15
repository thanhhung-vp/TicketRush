import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthBg, AuthCard } from '../components/AuthLayout.jsx';

export default function GoogleAuthCallbackPage() {
  const { completeGoogleLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function finishGoogleLogin() {
      const code = searchParams.get('code');
      if (!code) {
        setError(t('auth.googleFailed'));
        return;
      }

      try {
        const user = await completeGoogleLogin(code);
        if (!cancelled) navigate(user.role === 'admin' ? '/admin' : '/', { replace: true });
      } catch {
        if (!cancelled) setError(t('auth.googleFailed'));
      }
    }

    finishGoogleLogin();

    return () => {
      cancelled = true;
    };
  }, [completeGoogleLogin, navigate, searchParams, t]);

  return (
    <AuthBg>
      <AuthCard title={t('auth.googleCallbackTitle')}>
        {error ? (
          <div className="space-y-4 text-center">
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
            <Link to="/login" className="inline-flex text-sm font-semibold text-blue-500 hover:text-blue-600">
              {t('auth.backToLogin')}
            </Link>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500">{t('auth.googleCallbackDesc')}</p>
        )}
      </AuthCard>
    </AuthBg>
  );
}
