import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { adminService } from '../../services/admin.service.js';
import { StatsCard } from '../../components/features/admin/StatsCard.jsx';
import { PageSpinner, Alert } from '../../components/ui/index.js';
import { PageContainer } from '../../components/layout/PageContainer.jsx';
import { formatVND, formatDateShort } from '../../utils/format.js';
import { getEventOccupancyPercent, getOccupancyPage, OCCUPANCY_PAGE_SIZE } from '../../utils/adminDashboard.js';

const GENDER_COLORS = {
  male:   '#3b82f6',
  female: '#ec4899',
  other:  '#a78bfa',
  null:   '#6b7280',
};

const chartTooltipStyle = {
  background: 'var(--bg-surface-elevated)',
  border: '1px solid var(--border-separator)',
  color: 'var(--text-label-primary)',
};

function formatChartDay(d) {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function AdminPage() {
  const [tab, setTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [audience, setAudience] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      adminService.dashboard(),
      adminService.audience(),
      adminService.events(),
    ])
      .then(([d, a, e]) => {
        setDashboard(d);
        setAudience(a);
        setEvents(Array.isArray(e) ? e : []);
      })
      .catch(() => setError('Không thể tải dữ liệu dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  const dashEvents = dashboard?.events || [];
  const revenueByDay = dashboard?.revenue_by_day || [];
  const totalRevenue = dashEvents.reduce((s, e) => s + Number(e.total_revenue), 0);
  const totalOrders = dashEvents.reduce((s, e) => s + Number(e.orders_paid), 0);
  const totalSold = dashEvents.reduce((s, e) => s + Number(e.sold_seats), 0);

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Link
          to="/admin/events/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
        >
          + Tạo sự kiện
        </Link>
      </div>

      {error && <Alert type="error" className="mb-6">{error}</Alert>}

      <div className="mb-6 flex w-fit gap-1 rounded-xl border border-separator bg-surface-elevated p-1 shadow-1">
        {[
          ['dashboard', 'Tổng quan'],
          ['events', 'Sự kiện'],
          ['audience', 'Khán giả'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === k
                ? 'bg-accent text-white'
                : 'text-label-secondary hover:bg-fill-quaternary hover:text-label-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <DashboardTab
          totalRevenue={totalRevenue}
          totalOrders={totalOrders}
          totalSold={totalSold}
          events={dashEvents}
          revenueByDay={revenueByDay}
        />
      )}
      {tab === 'events' && <EventsTab events={events} />}
      {tab === 'audience' && <AudienceTab audience={audience} />}
    </PageContainer>
  );
}

function DashboardTab({ totalRevenue, totalOrders, totalSold, events, revenueByDay }) {
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard label="Tổng doanh thu" value={formatVND(totalRevenue)} />
        <StatsCard label="Đơn hàng thành công" value={totalOrders.toLocaleString()} />
        <StatsCard label="Vé đã bán" value={totalSold.toLocaleString()} />
      </div>

      <div className="rounded-xl border border-separator bg-surface p-5 shadow-1">
        <h2 className="mb-4 text-sm font-semibold text-label-primary">Doanh thu 30 ngày gần nhất</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={revenueByDay.map(r => ({ ...r, revenue: Number(r.revenue) }))}>
            <XAxis dataKey="day" tickFormatter={formatChartDay} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tickFormatter={v => formatVND(v, true)} tick={{ fontSize: 11, fill: '#6b7280' }} width={72} />
            <Tooltip formatter={v => formatVND(v)} labelFormatter={formatChartDay} contentStyle={chartTooltipStyle} />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-separator bg-surface p-5 shadow-1">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-label-secondary">Sức chứa sự kiện</p>
            {events.length > 0 && (
              <p className="mt-1 text-xs text-label-secondary">
                Hiển thị {occupancy.totalItems} / {events.length} sự kiện
              </p>
            )}
          </div>
          <form onSubmit={submitSearch} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              type="search"
              value={searchDraft}
              onChange={event => setSearchDraft(event.target.value)}
              placeholder="Tìm sự kiện..."
              className="min-w-0 rounded-lg border border-transparent bg-fill-tertiary px-3 py-2 text-sm text-label-primary placeholder:text-label-tertiary transition focus:border-info focus:outline-none focus:shadow-focus sm:w-64"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Tìm
            </button>
            {occupancyQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-lg border border-separator px-3 py-2 text-sm font-medium text-label-secondary transition hover:bg-fill-quaternary hover:text-label-primary"
              >
                Xóa
              </button>
            )}
          </form>
        </div>
        <h2 className="mb-4 text-sm font-semibold text-label-primary">Tỷ lệ lấp đầy theo sự kiện</h2>
        {events.length === 0 ? (
          <p className="text-sm text-label-secondary">Chưa có dữ liệu sự kiện.</p>
        ) : occupancy.items.length === 0 ? (
          <p className="text-sm text-label-secondary">Không tìm thấy sự kiện phù hợp.</p>
        ) : (
          <>
            <div className="space-y-3">
              {occupancy.items.map(e => {
                const pct = getEventOccupancyPercent(e);
                return (
                  <div key={e.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="max-w-xs truncate text-label-primary">{e.title}</span>
                      <span className="ml-2 flex-shrink-0 text-label-secondary">
                        {pct}% ({e.sold_seats}/{e.total_seats})
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-fill-tertiary">
                      <div className="h-full rounded-full bg-info transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {occupancy.totalPages > 1 && (
              <div className="mt-5 flex flex-col gap-2 border-t border-separator pt-4 text-xs text-label-secondary sm:flex-row sm:items-center sm:justify-between">
                <span>Trang {occupancy.currentPage} / {occupancy.totalPages}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOccupancyPage(page => page - 1)}
                    disabled={occupancy.currentPage <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-separator px-3 py-1.5 font-medium transition hover:bg-fill-quaternary hover:text-label-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Trước
                  </button>
                  <button
                    type="button"
                    onClick={() => setOccupancyPage(page => page + 1)}
                    disabled={occupancy.currentPage >= occupancy.totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-separator px-3 py-1.5 font-medium transition hover:bg-fill-quaternary hover:text-label-primary disabled:cursor-not-allowed disabled:opacity-40"
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

function StatusBadge({ status }) {
  const MAP = {
    draft: 'bg-fill-tertiary text-label-secondary border-separator',
    on_sale: 'bg-success-tint text-success border-success/30',
    ended: 'bg-danger-tint text-danger border-danger/30',
  };
  const LABEL = { draft: 'Nháp', on_sale: 'Đang bán', ended: 'Kết thúc' };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${MAP[status] || MAP.draft}`}>
      {LABEL[status] || status}
    </span>
  );
}

function EventsTab({ events }) {
  if (events.length === 0) {
    return (
      <div className="py-16 text-center text-label-secondary">
        <p>Chưa có sự kiện nào.</p>
        <Link to="/admin/events/new" className="mt-2 inline-block text-sm text-accent hover:underline">
          Tạo sự kiện đầu tiên
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-separator bg-surface shadow-1">
      <table className="w-full text-sm">
        <thead className="border-b border-separator text-label-secondary">
          <tr>
            {['Sự kiện', 'Trạng thái', 'Đã bán / Tổng', 'Doanh thu', ''].map(h => (
              <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map(e => (
            <tr key={e.id} className="border-b border-separator transition hover:bg-fill-quaternary">
              <td className="px-4 py-3">
                <p className="font-medium text-label-primary">{e.title}</p>
                <p className="text-xs text-label-secondary">
                  {e.event_date ? formatDateShort(e.event_date) : '-'}
                </p>
              </td>
              <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
              <td className="px-4 py-3 text-label-secondary">
                {e.sold_seats} / {e.total_seats}
                {e.locked_seats > 0 && (
                  <span className="ml-1 text-label-tertiary">({e.locked_seats} đang giữ)</span>
                )}
              </td>
              <td className="px-4 py-3 font-medium text-info">{formatVND(e.total_revenue)}</td>
              <td className="px-4 py-3">
                <Link to={`/admin/events/${e.id}`} className="text-xs text-accent transition hover:underline">
                  Chi tiết
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AudienceTab({ audience }) {
  const genderData = (audience?.by_gender || []).map(g => ({
    name: g.gender === 'male' ? 'Nam' : g.gender === 'female' ? 'Nữ' : 'Khác',
    value: Number(g.count),
    color: GENDER_COLORS[g.gender] ?? GENDER_COLORS.null,
  }));

  const ageData = (audience?.by_age || []).map(a => ({
    age: a.age_group,
    count: Number(a.count),
  }));

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="rounded-xl border border-separator bg-surface p-5 shadow-1">
        <h2 className="mb-4 text-sm font-semibold text-label-primary">Phân bố giới tính</h2>
        {genderData.length === 0 ? (
          <p className="text-sm text-label-secondary">Chưa có dữ liệu.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={genderData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {genderData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl border border-separator bg-surface p-5 shadow-1">
        <h2 className="mb-4 text-sm font-semibold text-label-primary">Phân bố độ tuổi</h2>
        {ageData.length === 0 ? (
          <p className="text-sm text-label-secondary">Chưa có dữ liệu.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ageData}>
              <XAxis dataKey="age" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
