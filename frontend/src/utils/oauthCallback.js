const LOCAL_AUTH_CODE_PATTERN = /^[a-f0-9]{64}$/i;
const FORWARDED_OAUTH_PARAMS = ['code', 'state', 'error', 'error_reason', 'error_description'];

export function isLocalAuthCode(code) {
  return typeof code === 'string' && LOCAL_AUTH_CODE_PATTERN.test(code);
}

export function shouldForwardProviderCallback(searchParams) {
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  return Boolean(state && (error || (code && !isLocalAuthCode(code))));
}

export function buildProviderCallbackPath(provider, searchParams) {
  const params = new URLSearchParams();

  FORWARDED_OAUTH_PARAMS.forEach((key) => {
    const value = searchParams.get(key);
    if (value) params.set(key, value);
  });

  return `/api/auth/${provider}/callback?${params.toString()}`;
}
