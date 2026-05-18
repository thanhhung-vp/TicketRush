import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthBg, AuthCard } from '../components/AuthLayout.jsx';
import { buildProviderCallbackPath, shouldForwardProviderCallback } from '../utils/oauthCallback.js';

const LOGIN_REQUEST_CACHE_MS = 2 * 60 * 1000;
const facebookLoginRequests = new Map();

function completeFacebookLoginOnce(code, completeFacebookLogin) {
  const existing = facebookLoginRequests.get(code);
  if (existing) return existing.request;

  const request = completeFacebookLogin(code).catch((err) => {
    facebookLoginRequests.delete(code);
    throw err;
  });
  const timeoutId = window.setTimeout(() => {
    facebookLoginRequests.delete(code);
  }, LOGIN_REQUEST_CACHE_MS);

  facebookLoginRequests.set(code, { request, timeoutId });

  request.catch(() => {
    const existing = facebookLoginRequests.get(code);
    if (existing?.timeoutId === timeoutId) {
      window.clearTimeout(timeoutId);
      facebookLoginRequests.delete(code);
    }
  });

  return request;
}

export default function FacebookAuthCallbackPage() {
  const { completeFacebookLogin, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function finishFacebookLogin() {
      if (shouldForwardProviderCallback(searchParams)) {
        window.location.replace(buildProviderCallbackPath('facebook', searchParams));
        return;
      }

      const code = searchParams.get('code');
      if (!code) {
        setError(t('auth.facebookFailed'));
        return;
      }

      try {
        const user = await completeFacebookLoginOnce(code, completeFacebookLogin);
        if (!cancelled) navigate(user.role === 'admin' ? '/admin' : '/', { replace: true });
      } catch (err) {
        if (cancelled) return;
        if (window.localStorage.getItem('accessToken')) {
          navigate(currentUser?.role === 'admin' ? '/admin' : '/', { replace: true });
          return;
        }
        setError(err.response?.data?.error || t('auth.facebookFailed'));
      }
    }

    finishFacebookLogin();

    return () => {
      cancelled = true;
    };
  }, [completeFacebookLogin, currentUser, navigate, searchParams, t]);

  return (
    <AuthBg>
      <AuthCard title={t('auth.facebookCallbackTitle')}>
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
          <p className="text-center text-sm text-gray-500">{t('auth.facebookCallbackDesc')}</p>
        )}
      </AuthCard>
    </AuthBg>
  );
}
