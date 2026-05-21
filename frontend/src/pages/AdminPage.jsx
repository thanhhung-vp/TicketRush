import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchAdminPageData, getCachedAdminPageData } from '../services/adminPageCache.js';
import { getEventOccupancyPercent, getOccupancyPage, OCCUPANCY_PAGE_SIZE } from '../utils/adminDashboard.js';
import { clampPage, getCompactPaginationItems, getPageItems, getTotalPages } from '../utils/homeSections.js';

const ADMIN_PAGE_SIZE = 8;
const SUPPORT_PAGE_SIZE = 8;

const ADMIN_COPY = {
  'vi-VN': {
    adminTitle: 'Quản trị',
    showingEvents: 'Hiển thị',
    ofEvents: 'sự kiện',
    searchEvents: 'Tìm sự kiện...',
    search: 'Tìm',
    clear: 'Xóa',
    noEvents: 'Chưa có dữ liệu sự kiện.',
    noMatchingEvents: 'Không tìm thấy sự kiện phù hợp.',
    previousPage: 'Trang trước',
    nextPage: 'Trang sau',
    virtualQueue: 'Phòng chờ',
    queueOn: 'Đang bật',
    queueOff: 'Đang tắt',
    processing: 'Đang xử lý...',
    turnOff: 'Tắt',
    turnOn: 'Bật',
    autoBatch: 'Tự động cấp lượt',
    actionFailed: 'Không thể thực hiện thao tác.',
    deleteEventConfirm: title => `Xóa sự kiện "${title}"? Hành động không thể hoàn tác.`,
    deleteEventSuccess: title => `Đã xóa sự kiện "${title}".`,
    queueEnabled: title => `Đã bật phòng chờ cho "${title}".`,
    queueDisabled: title => `Đã tắt phòng chờ cho "${title}".`,
    deleteEvent: 'Xóa sự kiện',
    cannotDeleteEvent: 'Không thể xóa vì sự kiện đã có lịch sử đơn/vé',
    deleting: 'Đang xóa...',
    delete: 'Xóa',
    supportTab: 'Hỗ trợ',
    supportBadge: count => `${count} yêu cầu cần xử lý`,
    supportLoadError: 'Không thể tải yêu cầu hỗ trợ.',
    supportActionError: 'Không thể cập nhật yêu cầu.',
    supportEmpty: 'Chưa có yêu cầu phù hợp.',
    supportPending: 'Cần xử lý',
    supportRefunds: 'Hoàn vé',
    supportRequests: 'Hỗ trợ khách hàng',
    supportResolved: 'Đã xử lý',
    supportAll: 'Tất cả',
    requestType: 'Phân loại',
    requester: 'Người gửi',
    requestContent: 'Nội dung',
    createdAt: 'Thời gian',
    status: 'Trạng thái',
    actions: 'Thao tác',
    refundRequest: 'Yêu cầu hoàn vé',
    supportRequest: 'Yêu cầu hỗ trợ',
    note: 'Ghi chú',
    approve: 'Duyệt hoàn vé',
    reject: 'Từ chối',
    markProgress: 'Đang xử lý',
    markResolved: 'Hoàn tất',
    pending: 'Chờ xử lý',
    approved: 'Đã duyệt',
    rejected: 'Đã từ chối',
    open: 'Mới',
    in_progress: 'Đang xử lý',
    resolved: 'Đã xử lý',
    closed: 'Đã đóng',
  },
  'en-US': {
    adminTitle: 'Admin',
    showingEvents: 'Showing',
    ofEvents: 'events',
    searchEvents: 'Search events...',
    search: 'Search',
    clear: 'Clear',
    noEvents: 'No event data yet.',
    noMatchingEvents: 'No matching events found.',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    virtualQueue: 'Virtual Queue',
    queueOn: 'Enabled',
    queueOff: 'Disabled',
    processing: 'Processing...',
    turnOff: 'Turn off',
    turnOn: 'Turn on',
    autoBatch: 'Auto release batches',
    actionFailed: 'Unable to complete this action.',
    deleteEventConfirm: title => `Delete event "${title}"? This action cannot be undone.`,
    deleteEventSuccess: title => `Deleted event "${title}".`,
    queueEnabled: title => `Virtual queue enabled for "${title}".`,
    queueDisabled: title => `Virtual queue disabled for "${title}".`,
    deleteEvent: 'Delete event',
    cannotDeleteEvent: 'Cannot delete because this event has order/ticket history',
    deleting: 'Deleting...',
    delete: 'Delete',
    supportTab: 'Support',
    supportBadge: count => `${count} requests need attention`,
    supportLoadError: 'Cannot load support requests.',
    supportActionError: 'Cannot update request.',
    supportEmpty: 'No matching requests.',
    supportPending: 'Needs action',
    supportRefunds: 'Refunds',
    supportRequests: 'Customer support',
    supportResolved: 'Resolved',
    supportAll: 'All',
    requestType: 'Type',
    requester: 'Requester',
    requestContent: 'Content',
    createdAt: 'Created',
    status: 'Status',
    actions: 'Actions',
    refundRequest: 'Refund request',
    supportRequest: 'Support request',
    note: 'Note',
    approve: 'Approve refund',
    reject: 'Reject',
    markProgress: 'In progress',
    markResolved: 'Resolve',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    open: 'New',
    in_progress: 'In progress',
    resolved: 'Resolved',
    closed: 'Closed',
  },
};

function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(n);
}
function formatVNDLong(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n || 0));
}

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const copy = ADMIN_COPY[locale] || ADMIN_COPY['en-US'];
  const [initialAdminData] = useState(() => getCachedAdminPageData());
  const [tab, setTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(() => initialAdminData?.dashboard ?? null);
  const [events, setEvents] = useState(() => initialAdminData?.events ?? []);
  const [newsPosts, setNewsPosts] = useState(() => initialAdminData?.newsPosts ?? []);
  const [supportBadgeCount, setSupportBadgeCount] = useState(() => initialAdminData?.supportBadgeCount ?? 0);
  const [loading, setLoading] = useState(() => !initialAdminData);

  const formatDate = (d) => new Date(d).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  const formatDateTime = (d) => new Date(d).toLocaleString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const applyAdminData = (data) => {
    setDashboard(data.dashboard);
    setEvents(data.events);
    setNewsPosts(data.newsPosts);
    setSupportBadgeCount(data.supportBadgeCount);
  };

  const loadAdminData = async ({ showLoading = true, force = false } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const data = await fetchAdminPageData({ force });
      applyAdminData(data);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    loadAdminData({ showLoading: !initialAdminData }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>;

  const totalRevenue = dashboard?.events?.reduce((s, e) => s + Number(e.total_revenue), 0) || 0;
  const totalOrders  = dashboard?.events?.reduce((s, e) => s + Number(e.orders_paid), 0) || 0;
  const totalSold    = dashboard?.events?.reduce((s, e) => s + Number(e.sold_seats), 0) || 0;

  const TABS = [
    ['dashboard', t('admin.tabOverview')],
    ['events',    t('admin.tabEvents')],
    ['customers', t('admin.tabCustomers')],
    ['support',   copy.supportTab],
    ['news',      t('admin.tabNews')],
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{copy.adminTitle}</h1>
        <Link to="/admin/events/new"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg shadow-blue-500/25">
          {t('admin.createEventBtn')}
        </Link>
      </div>

      <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl mb-6 w-fit border border-gray-200 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition ${tab === k ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'}`}>
            {label}
            {k === 'support' && supportBadgeCount > 0 && (
              <span
                className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white shadow-sm"
                title={copy.supportBadge(supportBadgeCount)}
                aria-label={copy.supportBadge(supportBadgeCount)}
              >
                {supportBadgeCount > 99 ? '99+' : supportBadgeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <DashboardTab
          totalRevenue={totalRevenue}
          totalOrders={totalOrders}
          totalSold={totalSold}
          events={dashboard?.events || []}
          revenueByDay={dashboard?.revenue_by_day || []}
          formatDate={formatDate}
          t={t}
          copy={copy}
        />
      )}
      {tab === 'events' && (
        <EventsTab
          events={events}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          t={t}
          locale={locale}
          copy={copy}
          onChanged={() => loadAdminData({ showLoading: false, force: true })}
        />
      )}
      {tab === 'customers' && <CustomerManagementTab events={events} formatDateTime={formatDateTime} formatVNDLong={formatVNDLong} t={t} />}
      {tab === 'support' && <SupportTab formatDateTime={formatDateTime} formatVNDLong={formatVNDLong} t={t} copy={copy} onChanged={() => loadAdminData({ showLoading: false, force: true })} />}
      {tab === 'news' && <NewsTab posts={newsPosts} formatDateTime={formatDateTime} t={t} onChanged={() => loadAdminData({ showLoading: false, force: true })} />}
    </div>
  );
}

function StatCard({ label, value, sub, gradient }) {
  return (
    <div className={`rounded-xl p-5 text-white shadow-lg ${gradient}`}>
      <p className="text-sm font-medium text-white/80 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
    </div>
  );
}

function PaginationControls({ currentPage, totalPages, onPageChange, copy }) {
  if (totalPages <= 1) return null;

  const items = getCompactPaginationItems(totalPages, currentPage);
  const goToPage = page => onPageChange(clampPage(page, totalPages));

  return (
    <nav className="mt-5 flex items-center justify-center gap-2 border-t border-gray-100 pt-4 dark:border-white/10" aria-label="Pagination">
      <button
        type="button"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/10"
        aria-label={copy.previousPage}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      {items.map((item, index) => (
        item === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="inline-flex h-10 min-w-10 items-center justify-center rounded-2xl px-3 text-sm font-bold text-gray-400 dark:text-slate-500">...</span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => goToPage(item)}
            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-2xl px-3 text-sm font-extrabold transition ${
              item === currentPage
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10'
            }`}
            aria-current={item === currentPage ? 'page' : undefined}
          >
            {item}
          </button>
        )
      ))}
      <button
        type="button"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/10"
        aria-label={copy.nextPage}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

function DashboardTab({ totalRevenue, totalOrders, totalSold, events, revenueByDay, formatDate, t, copy }) {
  const [searchDraft, setSearchDraft] = useState('');
  const [occupancyQuery, setOccupancyQuery] = useState('');
  const [occupancyPage, setOccupancyPage] = useState(1);
  const occupancy = getOccupancyPage(events, {
    page: occupancyPage,
    pageSize: OCCUPANCY_PAGE_SIZE,
    query: occupancyQuery,
  });

  const submitSearch = (event) => {
    event.preventDefault();
    setOccupancyQuery(searchDraft);
    setOccupancyPage(1);
  };

  const clearSearch = () => {
    setSearchDraft('');
    setOccupancyQuery('');
    setOccupancyPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label={t('admin.totalRevenue')} value={formatVND(totalRevenue)} gradient="bg-gradient-to-br from-blue-500 to-blue-700" />
        <StatCard label={t('admin.successOrders')} value={totalOrders.toLocaleString()} gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" />
        <StatCard label={t('admin.ticketsSold')} value={totalSold.toLocaleString()} gradient="bg-gradient-to-br from-violet-500 to-violet-700" />
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <h2 className="font-semibold mb-4 text-gray-700">{t('admin.revenueLast30')}</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={revenueByDay.map(r => ({ ...r, revenue: Number(r.revenue) }))}>
            <XAxis dataKey="day" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tickFormatter={v => formatVND(v)} tick={{ fontSize: 11, fill: '#6b7280' }} width={70} />
            <Tooltip
              formatter={(v) => formatVND(v)}
              labelFormatter={formatDate}
              contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              labelStyle={{ color: '#374151', fontWeight: 600 }}
              itemStyle={{ color: '#3b82f6' }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-gray-700">{t('admin.occupancyByEvent')}</h2>
            <p className="mt-1 text-xs text-gray-400">Hiển thị {occupancy.totalItems} / {events.length} sự kiện</p>
          </div>
          <form onSubmit={submitSearch} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              type="search"
              value={searchDraft}
              onChange={event => setSearchDraft(event.target.value)}
              placeholder="Tìm sự kiện..."
              className="min-w-0 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-blue-500 sm:w-64"
            />
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
              <Search className="h-4 w-4" aria-hidden="true" />
              Tìm
            </button>
            {occupancyQuery && (
              <button type="button" onClick={clearSearch} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                Xóa
              </button>
            )}
          </form>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có dữ liệu sự kiện.</p>
        ) : occupancy.items.length === 0 ? (
          <p className="text-sm text-gray-400">Không tìm thấy sự kiện phù hợp.</p>
        ) : (
          <>
          <div className="space-y-3">
          {occupancy.items.map(e => {
            const pct = getEventOccupancyPercent(e);
            const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : pct >= 20 ? 'bg-amber-500' : 'bg-gray-400';
            return (
              <div key={e.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="truncate max-w-xs text-gray-700 font-medium">{e.title}</span>
                  <span className="text-gray-500 ml-2">{pct}% ({e.sold_seats}/{e.total_seats})</span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          </div>
          {occupancy.totalPages > 1 && (
            <div className="mt-5 flex flex-col gap-2 border-t border-gray-100 pt-4 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
              <span>Trang {occupancy.currentPage} / {occupancy.totalPages}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOccupancyPage(page => page - 1)}
                  disabled={occupancy.currentPage <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Truoc
                </button>
                <button
                  type="button"
                  onClick={() => setOccupancyPage(page => page + 1)}
                  disabled={occupancy.currentPage >= occupancy.totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, t }) {
  const MAP = {
    draft:   'bg-gray-100 text-gray-600 border border-gray-300',
    on_sale: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    ended:   'bg-red-50 text-red-600 border border-red-200',
  };
  const LABEL = {
    draft:   t('admin.statusDraft'),
    on_sale: t('admin.statusOnSale'),
    ended:   t('admin.statusEnded'),
  };
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${MAP[status]}`}>{LABEL[status]}</span>;
}

function canDeleteEventFromStats(event) {
  const soldSeats = Number(event.sold_seats || 0);
  const lockedSeats = Number(event.locked_seats || 0);
  const orderCount = Number(event.order_count || 0);
  const adminActionCount = Number(event.admin_action_count || 0);
  return soldSeats === 0 && lockedSeats === 0 && orderCount === 0 && adminActionCount === 0;
}

function EventsTab({ events, t, locale, copy, onChanged }) {
  const [batchSizes, setBatchSizes] = useState({});
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredEvents = normalizedQuery
    ? events.filter(event => [
      event.title,
      event.status,
      event.venue,
      event.event_date ? new Date(event.event_date).toLocaleDateString(locale) : '',
    ].some(value => String(value || '').toLowerCase().includes(normalizedQuery)))
    : events;
  const totalPages = getTotalPages(filteredEvents, ADMIN_PAGE_SIZE);
  const currentPage = clampPage(page, totalPages);
  const visibleEvents = getPageItems(filteredEvents, currentPage, ADMIN_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, events.length]);

  const submitSearch = (event) => {
    event.preventDefault();
    setQuery(searchDraft);
  };

  const clearSearch = () => {
    setSearchDraft('');
    setQuery('');
  };

  const getBatchSize = (event) => Number(batchSizes[event.id] ?? event.queue_batch_size ?? 50);

  const runAction = async (busyKey, action) => {
    setBusy(busyKey);
    setNotice('');
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể thực hiện thao tác.');
    } finally {
      setBusy('');
    }
  };

  const toggleQueue = (event) => runAction(`queue-${event.id}`, async () => {
    if (event.queue_enabled) {
      await api.post(`/queue/${event.id}/disable`);
      setNotice(`Đã tắt phòng chờ cho "${event.title}".`);
    } else {
      await api.post(`/queue/${event.id}/enable`, { batch_size: getBatchSize(event) });
      setNotice(`Đã bật phòng chờ cho "${event.title}".`);
    }
    await onChanged();
  });

  const deleteEvent = (event) => runAction(`delete-${event.id}`, async () => {
    if (!window.confirm(`Xóa sự kiện "${event.title}"? Hành động không thể hoàn tác.`)) return;
    await api.delete(`/events/${event.id}`);
    setNotice(`Đã xóa sự kiện "${event.title}".`);
    await onChanged();
  });

  return (
    <div className="space-y-3">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/80 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">
          {copy.showingEvents} {filteredEvents.length} / {events.length} {copy.ofEvents}
        </p>
        <form onSubmit={submitSearch} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <input
            type="search"
            value={searchDraft}
            onChange={event => setSearchDraft(event.target.value)}
            placeholder={copy.searchEvents}
            className="min-w-0 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-blue-500 sm:w-72 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
          />
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
            <Search className="h-4 w-4" aria-hidden="true" />
            {copy.search}
          </button>
          {query && (
            <button type="button" onClick={clearSearch} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10">
              {copy.clear}
            </button>
          )}
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {[t('admin.colEvent'), t('admin.colStatus'), t('admin.colSoldTotal'), 'Virtual Queue', t('admin.colRevenue'), ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleEvents.map(e => {
                const canDelete = canDeleteEventFromStats(e);
                const seatsEmpty = Number(e.sold_seats || 0) === 0 && Number(e.locked_seats || 0) === 0;
                const actionDisabled = busy !== '';

                return (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-blue-50/50 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{e.title}</p>
                      <p className="text-xs text-gray-500">{new Date(e.event_date).toLocaleDateString(locale)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} t={t} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {e.sold_seats} / {e.total_seats}
                      <span className="text-gray-400 ml-1">({e.locked_seats} {t('admin.held')})</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          e.queue_enabled
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                          {e.queue_enabled ? 'Đang bật' : 'Đang tắt'}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="500"
                          value={getBatchSize(e)}
                          onChange={event => setBatchSizes(prev => ({ ...prev, [e.id]: event.target.value }))}
                          className="w-20 rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Virtual queue capacity"
                        />
                        <button
                          type="button"
                          onClick={() => toggleQueue(e)}
                          disabled={actionDisabled}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                            e.queue_enabled
                              ? 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {busy === `queue-${e.id}` ? 'Đang xử lý...' : e.queue_enabled ? 'Tắt' : 'Bật'}
                        </button>
                        {e.queue_enabled && (
                          <span className="text-xs text-gray-400">
                            Tự động cấp lượt
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-blue-600 font-semibold">
                      {formatVND(e.total_revenue)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/admin/events/${e.id}`} className="text-blue-600 hover:text-blue-700 hover:underline text-xs font-medium transition">
                          {t('admin.detailsLink')}
                        </Link>
                        {seatsEmpty && (
                          <button
                            type="button"
                            onClick={() => deleteEvent(e)}
                            disabled={actionDisabled || !canDelete}
                            title={canDelete ? 'Xóa sự kiện' : 'Không thể xóa vì sự kiện đã có lịch sử đơn/vé'}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {busy === `delete-${e.id}` ? 'Đang xóa...' : 'Xóa'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {filteredEvents.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-400">
          {copy.noMatchingEvents}
        </div>
      ) : (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} copy={copy} />
      )}
    </div>
  );
}

const EMPTY_NEWS_FORM = {
  title: '',
  summary: '',
  content: '',
  image_url: '',
  status: 'published',
};

function NewsTab({ posts, formatDateTime, t, onChanged }) {
  const [form, setForm] = useState(EMPTY_NEWS_FORM);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const isEditing = Boolean(editingId);

  const setField = (key) => (event) => {
    const value = event.target.value;
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_NEWS_FORM);
    setEditingId(null);
  };

  const editPost = (post) => {
    setForm({
      title: post.title || '',
      summary: post.summary || '',
      content: post.content || '',
      image_url: post.image_url || '',
      status: post.status || 'draft',
    });
    setEditingId(post.id);
    setNotice('');
    setError('');
  };

  const submitNews = async (event) => {
    event.preventDefault();
    setBusy(isEditing ? 'save' : 'create');
    setNotice('');
    setError('');

    try {
      const payload = {
        title: form.title.trim(),
        summary: form.summary.trim(),
        content: form.content.trim(),
        image_url: form.image_url.trim(),
        status: form.status,
      };
      if (isEditing) {
        await api.patch(`/admin/news/${editingId}`, payload);
        setNotice(t('admin.newsUpdated'));
      } else {
        await api.post('/admin/news', payload);
        setNotice(t('admin.newsCreated'));
      }
      resetForm();
      await onChanged();
    } catch (err) {
      setError(err.response?.data?.error || (isEditing ? t('admin.newsUpdateError') : t('admin.newsCreateError')));
    } finally {
      setBusy('');
    }
  };

  const updateStatus = async (post, status) => {
    setBusy(`status-${post.id}`);
    setNotice('');
    setError('');
    try {
      await api.patch(`/admin/news/${post.id}`, { status });
      setNotice(t('admin.newsStatusUpdated'));
      await onChanged();
    } catch (err) {
      setError(err.response?.data?.error || t('admin.newsUpdateError'));
    } finally {
      setBusy('');
    }
  };

  const deletePost = async (post) => {
    if (!window.confirm(t('admin.newsDeleteConfirm', { title: post.title }))) return;
    setBusy(`delete-${post.id}`);
    setNotice('');
    setError('');
    try {
      await api.delete(`/admin/news/${post.id}`);
      setNotice(t('admin.newsDeleted'));
      await onChanged();
    } catch (err) {
      setError(err.response?.data?.error || t('admin.newsDeleteError'));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submitNews} className="h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
          {isEditing ? t('admin.newsEditTitle') : t('admin.newsFormTitle')}
        </h2>

        {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
        {notice && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</p>}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-200">{t('admin.newsTitleLabel')}</label>
            <input
              value={form.title}
              onChange={setField('title')}
              required
              minLength={3}
              maxLength={180}
              placeholder={t('admin.newsTitlePlaceholder')}
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-200">{t('admin.newsSummaryLabel')}</label>
            <textarea
              value={form.summary}
              onChange={setField('summary')}
              maxLength={280}
              rows={3}
              placeholder={t('admin.newsSummaryPlaceholder')}
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-200">{t('admin.newsContentLabel')}</label>
            <textarea
              value={form.content}
              onChange={setField('content')}
              required
              rows={7}
              placeholder={t('admin.newsContentPlaceholder')}
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-200">{t('admin.newsImageLabel')}</label>
            <input
              value={form.image_url}
              onChange={setField('image_url')}
              type="url"
              placeholder={t('admin.newsImagePlaceholder')}
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-200">{t('admin.newsStatusLabel')}</label>
            <select
              value={form.status}
              onChange={setField('status')}
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="published">{t('admin.newsStatusPublished')}</option>
              <option value="draft">{t('admin.newsStatusDraft')}</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            disabled={busy === 'create' || busy === 'save'}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {busy === 'save'
              ? t('admin.newsUpdating')
              : busy === 'create'
                ? t('admin.newsCreating')
                : isEditing
                  ? t('admin.newsUpdateBtn')
                  : t('admin.newsCreateBtn')}
          </button>
          {isEditing && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={resetForm}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/80">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-white/10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('admin.newsListTitle')}</h2>
        </div>

        {posts.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400 dark:text-slate-500">{t('admin.newsEmpty')}</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            {posts.map(post => {
              const isPublished = post.status === 'published';
              return (
                <article key={post.id} className="grid gap-4 px-5 py-4 md:grid-cols-[120px_1fr_auto]">
                  <div className="h-24 overflow-hidden rounded-lg border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-slate-900">
                    {post.image_url ? (
                      <img src={post.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-400 dark:text-slate-500">News</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                        isPublished
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300'
                      }`}>
                        {isPublished ? t('admin.newsStatusPublished') : t('admin.newsStatusDraft')}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {formatDateTime(post.published_at || post.created_at)}
                      </span>
                    </div>
                    <h3 className="truncate text-base font-bold text-gray-900 dark:text-white">{post.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-slate-400">{post.summary || post.content}</p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2 md:justify-end">
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => editPost(post)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => updateStatus(post, isPublished ? 'draft' : 'published')}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-wait disabled:opacity-50"
                    >
                      {isPublished ? t('admin.newsStatusDraft') : t('admin.newsStatusPublished')}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => deletePost(post)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-50"
                    >
                      {t('admin.newsDeleteBtn')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerManagementTab({ events, formatDateTime, formatVNDLong, t }) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [history, setHistory] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [seats, setSeats] = useState([]);
  const [selectedSeatId, setSelectedSeatId] = useState('');
  const [issueReason, setIssueReason] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    let active = true;
    setLoadingCustomers(true);
    const timer = setTimeout(() => {
      api.get('/admin/customers', { params: { search } })
        .then(r => {
          if (!active) return;
          const rows = Array.isArray(r.data) ? r.data : [];
          setCustomers(rows);
          setSelectedCustomerId(current => (
            current && rows.some(c => c.id === current) ? current : rows[0]?.id || null
          ));
        })
        .catch(() => active && setError(t('admin.loadCustomersError')))
        .finally(() => active && setLoadingCustomers(false));
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);

  useEffect(() => {
    if (!selectedCustomerId) { setHistory(null); return; }
    let active = true;
    setLoadingHistory(true);
    api.get(`/admin/customers/${selectedCustomerId}/history`)
      .then(r => active && setHistory(r.data))
      .catch(() => active && setError(t('admin.loadHistoryError')))
      .finally(() => active && setLoadingHistory(false));
    return () => { active = false; };
  }, [selectedCustomerId]);

  useEffect(() => {
    if (!selectedEventId) { setSeats([]); setSelectedSeatId(''); return; }
    let active = true;
    api.get(`/admin/events/${selectedEventId}/seats`)
      .then(r => {
        if (!active) return;
        const available = (Array.isArray(r.data) ? r.data : []).filter(seat => seat.status === 'available');
        setSeats(available);
        setSelectedSeatId(available[0]?.id || '');
      })
      .catch(() => active && setError(t('admin.loadSeatsError')));
    return () => { active = false; };
  }, [selectedEventId]);

  const refreshHistory = async () => {
    if (!selectedCustomerId) return;
    const { data } = await api.get(`/admin/customers/${selectedCustomerId}/history`);
    setHistory(data);
  };

  const refreshCustomers = async () => {
    const { data } = await api.get('/admin/customers', { params: { search } });
    setCustomers(Array.isArray(data) ? data : []);
  };

  const cancelTicket = async (ticket) => {
    const reason = window.prompt(t('admin.cancelReason'), '');
    if (reason === null) return;
    setBusy(ticket.ticket_id); setError(''); setNotice('');
    try {
      await api.delete(`/admin/tickets/${ticket.ticket_id}`, { data: { reason } });
      await refreshHistory();
      await refreshCustomers();
      setNotice(`${t('admin.actionCancelled')} ${ticket.zone || ''} ${ticket.label || ''}`.trim());
    } catch (err) {
      setError(err.response?.data?.error || t('admin.cancelTicketError'));
    } finally { setBusy(''); }
  };

  const issueTicket = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedSeatId) { setError(t('admin.selectCustomerAndSeat')); return; }
    setBusy('issue'); setError(''); setNotice('');
    try {
      await api.post(`/admin/customers/${selectedCustomerId}/tickets`, {
        seat_id: selectedSeatId,
        reason: issueReason || undefined,
      });
      const { data } = await api.get(`/admin/events/${selectedEventId}/seats`);
      const available = (Array.isArray(data) ? data : []).filter(seat => seat.status === 'available');
      setSeats(available);
      setSelectedSeatId(available[0]?.id || '');
      setIssueReason('');
      await refreshHistory();
      await refreshCustomers();
      setNotice(t('admin.issueTicketSuccess'));
    } catch (err) {
      setError(err.response?.data?.error || t('admin.issueTicketError'));
    } finally { setBusy(''); }
  };

  const selectedCustomer = selectedCustomerId
    ? { ...(customers.find(c => c.id === selectedCustomerId) || {}), ...(history?.customer || {}) }
    : null;

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t('admin.searchCustomer')}</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('admin.searchCustomerPlaceholder')}
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="max-h-[640px] overflow-auto">
          {loadingCustomers ? (
            <p className="p-4 text-sm text-gray-400">{t('admin.loadingCustomers')}</p>
          ) : customers.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">{t('admin.noCustomers')}</p>
          ) : customers.map(customer => (
            <button
              key={customer.id}
              onClick={() => setSelectedCustomerId(customer.id)}
              className={`block w-full text-left px-4 py-3 border-b border-gray-100 transition ${
                selectedCustomerId === customer.id ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <p className="font-semibold text-gray-800 truncate">{customer.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{customer.email}</p>
              <p className="mt-1 text-xs text-gray-400">
                {customer.ticket_count} {t('admin.ticketCountLabel')} · {customer.cancelled_ticket_count || 0} {t('admin.cancelledCountLabel')}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

        {!selectedCustomer ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-400">
            {t('admin.selectCustomerHint')}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedCustomer.full_name}</h2>
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                </div>
                <div className="text-sm text-gray-500 sm:text-right">
                  <p>{t('admin.totalSpent')} <span className="font-bold text-blue-600">{formatVNDLong(selectedCustomer.total_spent)}</span></p>
                  <p>{t('admin.createdAt')} {formatDateTime(selectedCustomer.created_at)}</p>
                </div>
              </div>
            </div>

            <form onSubmit={issueTicket} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">{t('admin.addTicketTitle')}</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <select
                  value={selectedEventId}
                  onChange={e => setSelectedEventId(e.target.value)}
                  className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.title}</option>
                  ))}
                </select>
                <select
                  value={selectedSeatId}
                  onChange={e => setSelectedSeatId(e.target.value)}
                  className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {seats.length === 0 ? (
                    <option value="">{t('admin.noSeatsLeft')}</option>
                  ) : seats.map(seat => (
                    <option key={seat.id} value={seat.id}>
                      {seat.zone_name} {seat.label} · {formatVNDLong(seat.price)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  value={issueReason}
                  onChange={e => setIssueReason(e.target.value)}
                  placeholder={t('admin.ticketNoteHint')}
                  className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={busy === 'issue' || !selectedSeatId}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy === 'issue' ? t('admin.addingTicket') : t('admin.addTicket')}
                </button>
              </div>
            </form>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">{t('admin.purchaseHistory')}</h3>
              {loadingHistory ? (
                <p className="text-sm text-gray-400">{t('admin.loadingHistory')}</p>
              ) : (history?.purchases || []).length === 0 ? (
                <p className="text-sm text-gray-400">{t('admin.noPurchaseHistory')}</p>
              ) : (
                <div className="space-y-4">
                  {history.purchases.map(order => (
                    <CustomerOrderCard
                      key={order.id}
                      order={order}
                      busy={busy}
                      onCancelTicket={cancelTicket}
                      formatDateTime={formatDateTime}
                      formatVNDLong={formatVNDLong}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">{t('admin.adminHistory')}</h3>
              {(history?.actions || []).length === 0 ? (
                <p className="text-sm text-gray-400">{t('admin.noAdminHistory')}</p>
              ) : (
                <div className="space-y-3">
                  {history.actions.map(action => (
                    <div key={action.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-semibold text-gray-800">
                          {action.action_type === 'added' ? t('admin.actionAdded') : t('admin.actionCancelled')} · {action.event_title}
                        </p>
                        <p className="text-xs text-gray-400">{formatDateTime(action.created_at)}</p>
                      </div>
                      <p className="mt-1 text-gray-600">
                        {t('admin.colEvent')}: {action.zone_name || ''} {action.seat_label || ''} · {t('admin.adminLabel')} {action.admin_name || action.admin_email}
                      </p>
                      {action.reason && <p className="mt-1 text-gray-500">{t('admin.noteLabel')} {action.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CustomerOrderCard({ order, busy, onCancelTicket, formatDateTime, formatVNDLong, t }) {
  const tickets = order.tickets || [];
  const STATUS_LABEL = {
    paid:      t('myTickets.paid'),
    pending:   t('myTickets.pending'),
    cancelled: t('myTickets.cancelled'),
  };
  const statusLabel = STATUS_LABEL[order.status] || order.status;
  const statusClass = order.status === 'paid'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : order.status === 'pending'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-red-50 text-red-600 border-red-200';

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-gray-900">{order.event_title}</p>
          <p className="text-sm text-gray-500">{order.venue}</p>
          <p className="text-xs text-gray-400">{formatDateTime(order.event_date)}</p>
        </div>
        <div className="sm:text-right">
          <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass}`}>{statusLabel}</span>
          <p className="mt-1 text-sm font-bold text-blue-600">{formatVNDLong(order.total_amount)}</p>
        </div>
      </div>

      {tickets.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tickets.map(ticket => (
            <span key={ticket.ticket_id} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
              {ticket.zone} {ticket.label}
              {order.status === 'paid' && (
                <button
                  type="button"
                  onClick={() => onCancelTicket(ticket)}
                  disabled={busy === ticket.ticket_id}
                  className="ml-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  {busy === ticket.ticket_id ? t('admin.cancellingBtn') : t('admin.cancelBtn')}
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SupportTab({ formatDateTime, formatVNDLong, t, copy, onChanged }) {
  const [refunds, setRefunds] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);

  const fetchSupportItems = async () => {
    setLoading(true);
    setError('');
    try {
      const [refundResponse, supportResponse] = await Promise.all([
        api.get('/admin/refunds', { params: { status: undefined } }),
        api.get('/admin/support-requests', { params: { status: undefined } }),
      ]);
      setRefunds(Array.isArray(refundResponse.data) ? refundResponse.data : []);
      setRequests(Array.isArray(supportResponse.data) ? supportResponse.data : []);
    } catch (err) {
      setError(copy.supportLoadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupportItems();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const handleRefundAction = async (id, action) => {
    if (action === 'approve' && !window.confirm(t('admin.approveConfirm'))) return;
    if (action === 'reject' && !window.confirm(t('admin.rejectConfirm'))) return;

    setBusy(id);
    try {
      await api.post(`/admin/refunds/${id}/${action}`);
      await fetchSupportItems();
      await onChanged();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    } finally {
      setBusy('');
    }
  };

  const handleSupportStatus = async (id, status) => {
    setBusy(id);
    try {
      await api.patch(`/admin/support-requests/${id}`, { status });
      await fetchSupportItems();
      await onChanged();
    } catch (err) {
      alert(err.response?.data?.error || copy.supportActionError);
    } finally {
      setBusy('');
    }
  };

  const allItems = [
    ...refunds.map(item => ({
      id: `refund-${item.id}`,
      sourceId: item.id,
      kind: 'refund',
      status: item.status,
      createdAt: item.created_at,
      requesterName: item.user_name,
      requesterEmail: item.user_email,
      title: item.event_title,
      detail: `${item.zone_name || ''} ${item.seat_label || ''}`.trim(),
      note: item.reason,
      amount: item.price,
    })),
    ...requests.map(item => ({
      id: `support-${item.id}`,
      sourceId: item.id,
      kind: 'support',
      status: item.status,
      createdAt: item.created_at,
      requesterName: item.name,
      requesterEmail: item.email,
      title: t(`feedback.types.${item.type}`, { defaultValue: item.type }),
      detail: item.message,
      note: '',
      amount: null,
    })),
  ].sort((a, b) => {
    const rank = value => (['pending', 'open', 'in_progress'].includes(value) ? 0 : 1);
    return rank(a.status) - rank(b.status) || new Date(b.createdAt) - new Date(a.createdAt);
  });

  const filteredItems = allItems.filter(item => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return ['pending', 'open', 'in_progress'].includes(item.status);
    if (statusFilter === 'refunds') return item.kind === 'refund';
    if (statusFilter === 'support') return item.kind === 'support';
    if (statusFilter === 'resolved') return ['approved', 'rejected', 'resolved', 'closed'].includes(item.status);
    return true;
  });
  const totalPages = getTotalPages(filteredItems, SUPPORT_PAGE_SIZE);
  const currentPage = clampPage(page, totalPages);
  const visibleItems = getPageItems(filteredItems, currentPage, SUPPORT_PAGE_SIZE);

  const filters = [
    ['pending', copy.supportPending],
    ['refunds', copy.supportRefunds],
    ['support', copy.supportRequests],
    ['resolved', copy.supportResolved],
    ['all', copy.supportAll],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map(([key, label]) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${statusFilter === key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">{t('common.loading')}</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-400">
          {copy.supportEmpty}
        </div>
      ) : (
        <>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm dark:border-white/10 dark:bg-slate-950/80">
          <table className="w-full min-w-[920px] text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">{copy.requestType}</th>
                <th className="px-4 py-3">{copy.requester}</th>
                <th className="px-4 py-3">{copy.requestContent}</th>
                <th className="px-4 py-3">{copy.createdAt}</th>
                <th className="px-4 py-3">{copy.status}</th>
                <th className="px-4 py-3 text-right">{copy.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {visibleItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800 dark:text-slate-100">{item.kind === 'refund' ? copy.refundRequest : copy.supportRequest}</p>
                    {item.amount !== null && <p className="text-xs font-semibold text-blue-600">{formatVNDLong(item.amount)}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800 dark:text-slate-100">{item.requesterName || '-'}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{item.requesterEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 dark:text-slate-100">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-slate-400">{item.detail}</p>
                    {item.note && <p className="text-xs text-amber-600 mt-1" title={item.note}>{copy.note}: {item.note}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs dark:text-slate-400">{formatDateTime(item.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      ['approved', 'resolved', 'closed'].includes(item.status) ? 'bg-emerald-50 text-emerald-600' :
                      item.status === 'rejected' ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {copy[item.status] || item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.kind === 'refund' && item.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleRefundAction(item.sourceId, 'approve')} disabled={busy === item.sourceId}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 disabled:opacity-50 transition font-medium">
                          {busy === item.sourceId ? '...' : copy.approve}
                        </button>
                        <button onClick={() => handleRefundAction(item.sourceId, 'reject')} disabled={busy === item.sourceId}
                          className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded border border-red-200 disabled:opacity-50 transition font-medium">
                          {busy === item.sourceId ? '...' : copy.reject}
                        </button>
                      </div>
                    )}
                    {item.kind === 'support' && ['open', 'in_progress'].includes(item.status) && (
                      <div className="flex justify-end gap-2">
                        {item.status === 'open' && (
                          <button onClick={() => handleSupportStatus(item.sourceId, 'in_progress')} disabled={busy === item.sourceId}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 disabled:opacity-50 transition font-medium">
                            {busy === item.sourceId ? '...' : copy.markProgress}
                          </button>
                        )}
                        <button onClick={() => handleSupportStatus(item.sourceId, 'resolved')} disabled={busy === item.sourceId}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 disabled:opacity-50 transition font-medium">
                          {busy === item.sourceId ? '...' : copy.markResolved}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} copy={copy} />
        </>
      )}
    </div>
  );
}
