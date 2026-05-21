import api from '../lib/api.js';
import { createRequestCache } from '../utils/prefetchCache.js';

const ADMIN_PAGE_CACHE_KEY = 'admin-page';
const ADMIN_PAGE_TTL_MS = 30_000;
const adminPageCache = createRequestCache({ ttlMs: ADMIN_PAGE_TTL_MS });

function normalizeAdminPayload({ dashboard, events, newsPosts, pendingRefunds, pendingSupport }) {
  const pendingRefundCount = Array.isArray(pendingRefunds) ? pendingRefunds.length : 0;
  const pendingSupportCount = Array.isArray(pendingSupport) ? pendingSupport.length : 0;

  return {
    dashboard,
    events: Array.isArray(events) ? events : [],
    newsPosts: Array.isArray(newsPosts) ? newsPosts : [],
    supportBadgeCount: pendingRefundCount + pendingSupportCount,
  };
}

async function requestAdminPageData({ signal } = {}) {
  const [dashboard, events, news, pendingRefunds, pendingSupport] = await Promise.all([
    api.get('/admin/dashboard', { signal }),
    api.get('/admin/events', { signal }),
    api.get('/admin/news', { signal }),
    api.get('/admin/refunds', { params: { status: 'pending' }, signal }),
    api.get('/admin/support-requests', { params: { status: 'open' }, signal }),
  ]);

  return normalizeAdminPayload({
    dashboard: dashboard.data,
    events: events.data,
    newsPosts: news.data,
    pendingRefunds: pendingRefunds.data,
    pendingSupport: pendingSupport.data,
  });
}

export function getCachedAdminPageData() {
  return adminPageCache.get(ADMIN_PAGE_CACHE_KEY);
}

export function fetchAdminPageData({ signal, force = false } = {}) {
  return adminPageCache.fetch(
    ADMIN_PAGE_CACHE_KEY,
    () => requestAdminPageData({ signal }),
    { force }
  );
}

export function prefetchAdminPageData() {
  fetchAdminPageData().catch(() => {});
  return true;
}

export function clearAdminPageCache() {
  adminPageCache.clear();
}
