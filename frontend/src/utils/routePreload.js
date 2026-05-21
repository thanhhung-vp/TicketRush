export const routeLoaders = {
  home: () => import('../pages/HomePage.jsx'),
  search: () => import('../pages/SearchPage.jsx'),
  newsDetail: () => import('../pages/NewsDetailPage.jsx'),
  eventDetail: () => import('../pages/EventDetailPage.jsx'),
  login: () => import('../pages/LoginPage.jsx'),
  register: () => import('../pages/RegisterPage.jsx'),
  googleCallback: () => import('../pages/GoogleAuthCallbackPage.jsx'),
  facebookCallback: () => import('../pages/FacebookAuthCallbackPage.jsx'),
  forgotPassword: () => import('../pages/ForgotPasswordPage.jsx'),
  waitingRoom: () => import('../pages/WaitingRoomPage.jsx'),
  checkout: () => import('../pages/CheckoutPage.jsx'),
  tickets: () => import('../pages/TicketsPage.jsx'),
  myTickets: () => import('../pages/MyTicketsPage.jsx'),
  profile: () => import('../pages/ProfilePage.jsx'),
  faq: () => import('../pages/FAQPage.jsx'),
  terms: () => import('../pages/TermsPage.jsx'),
  about: () => import('../pages/AboutPage.jsx'),
  feedback: () => import('../pages/FeedbackPage.jsx'),
  admin: () => import('../pages/AdminPage.jsx'),
  adminEvent: () => import('../pages/AdminEventPage.jsx'),
  adminCheckin: () => import('../pages/AdminCheckinPage.jsx'),
};

function normalizePathname(pathname) {
  if (!pathname || pathname === '') return '/';
  return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
}

export function getRouteLoaderKey(pathname) {
  const path = normalizePathname(pathname);
  if (path === '/') return 'home';
  if (path === '/search') return 'search';
  if (path.startsWith('/news/')) return 'newsDetail';
  if (path.startsWith('/events/')) return 'eventDetail';
  if (path === '/login') return 'login';
  if (path === '/register') return 'register';
  if (path === '/auth/google/callback') return 'googleCallback';
  if (path === '/auth/facebook/callback') return 'facebookCallback';
  if (path === '/forgot-password') return 'forgotPassword';
  if (path.startsWith('/queue/')) return 'waitingRoom';
  if (path === '/checkout') return 'checkout';
  if (path.startsWith('/orders/') && path.endsWith('/tickets')) return 'tickets';
  if (path === '/my-tickets') return 'myTickets';
  if (path === '/profile') return 'profile';
  if (path === '/faq') return 'faq';
  if (path === '/terms') return 'terms';
  if (path === '/about') return 'about';
  if (path === '/support' || path === '/feedback') return 'feedback';
  if (path === '/admin') return 'admin';
  if (/^\/admin\/events\/[^/]+\/checkin$/.test(path)) return 'adminCheckin';
  if (path.startsWith('/admin/events/')) return 'adminEvent';
  return null;
}

export function createRoutePreloader(loaders = routeLoaders) {
  const pending = new Map();

  return function preloadRoute(pathname) {
    const key = getRouteLoaderKey(pathname);
    const loader = key ? loaders[key] : null;
    if (!loader) return false;
    if (!pending.has(key)) {
      pending.set(key, Promise.resolve().then(loader).catch(error => {
        pending.delete(key);
        throw error;
      }));
    }
    return true;
  };
}

export const preloadAppRoute = createRoutePreloader();
