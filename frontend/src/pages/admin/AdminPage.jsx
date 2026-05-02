import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { adminService } from '../../services/admin.service.js';
import { StatsCard } from '../../components/features/admin/StatsCard.jsx';
import { PageSpinner, Alert } from '../../components/ui/index.js';
import { PageContainer } from '../../components/layout/PageContainer.jsx';
import { formatVND, formatDateShort } from '../../utils/format.js';

const GENDER_COLORS = {
  male:   '#3b82f6',
  female: '#ec4899',
  other:  '#a78bfa',
  null:   '#6b7280',
};

function formatChartDay(d) {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function AdminPage() {
  const [tab, setTab]           = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [audience, setAudience]   = useState(null);
  const [events, setEvents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

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

  const dashEvents     = dashboard?.events || [];
  const revenueByDay   = dashboard?.revenue_by_day || [];
  const totalRevenue   = dashEvents.reduce((s, e) => s + Number(e.total_revenue), 0);
  const totalOrders    = dashEvents.reduce((s, e) => s + Number(e.orders_paid), 0);
  const totalSold      = dashEvents.reduce((s, e) => s + Number(e.sold_seats), 0);

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Link
          to="/admin/events/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + Tạo sự kiện
        </Link>
      </div>

      {error && <Alert type="error" className="mb-6">{error}</Alert>}

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6 w-fit border border-gray-800">
        {[
          ['dashboard', 'Tổng quan'],
          ['events',    'Sự kiện'],
          ['audience',  'Khán giả'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === k ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
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
      {tab === 'events'    && <EventsTab    events={events} />}
      {tab === 'audience'  && <AudienceTab  audience={audience} />}
    </PageContainer>
  );
}

/* ---- Sub-tabs ---- */

function DashboardTab({ totalRevenue, totalOrders, totalSold, events, revenueByDay }) {
  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard label="Tổng doanh thu"       value={formatVND(totalRevenue)} />
        <StatsCard label="Đơn hàng thành công"  value={totalOrders.toLocaleString()} />
        <StatsCard label="Vé đã bán"            value={totalSold.toLocaleString()} />
      </div>

      {/* Revenue line chart */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="font-semibold mb-4 text-sm text-gray-300">Doanh thu 30 ngày gần nhất</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={revenueByDay.map(r => ({ ...r, revenue: Number(r.revenue) }))}>
            <XAxis
              dataKey="day"
              tickFormatter={formatChartDay}
              tick={{ fontSize: 11, fill: '#6b7280' }}
            />
            <YAxis
              tickFormatter={v => formatVND(v, true)}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              width={72}
            />
            <Tooltip
              formatter={v => formatVND(v)}
              labelFormatter={formatChartDay}
              contentStyle={{ background: '#111827', border: '1px solid #374151' }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Per-event occupancy */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="font-semibold mb-4 text-sm text-gray-300">Tỷ lệ lấp đầy theo sự kiện</h2>
        {events.length === 0 ? (
          <p className="text-gray-500 text-sm">Chưa có dữ liệu sự kiện.</p>
        ) : (
          <div className="space-y-3">
            {events.map(e => {
              const pct = e.total_seats > 0
                ? Math.round((e.sold_seats / e.total_seats) * 100)
                : 0;
              return (
                <div key={e.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate max-w-xs text-gray-300">{e.title}</span>
                    <span className="text-gray-500 ml-2 flex-shrink-0">
                      {pct}% ({e.sold_seats}/{e.total_seats})
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const MAP = {
    draft:   'bg-gray-800 text-gray-400 border-gray-700',
    on_sale: 'bg-green-900/50 text-green-400 border-green-800',
    ended:   'bg-red-900/50 text-red-400 border-red-800',
  };
  const LABEL = { draft: 'Nháp', on_sale: 'Đang bán', ended: 'Kết thúc' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${MAP[status] || MAP.draft}`}>
      {LABEL[status] || status}
    </span>
  );
}

function EventsTab({ events }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>Chưa có sự kiện nào.</p>
        <Link to="/admin/events/new" className="mt-2 inline-block text-blue-400 hover:underline text-sm">
          Tạo sự kiện đầu tiên
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-800 text-gray-500">
          <tr>
            {['Sự kiện', 'Trạng thái', 'Đã bán / Tổng', 'Doanh thu', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map(e => (
            <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-200">{e.title}</p>
                <p className="text-xs text-gray-500">
                  {e.event_date ? formatDateShort(e.event_date) : '—'}
                </p>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={e.status} />
              </td>
              <td className="px-4 py-3 text-gray-400">
                {e.sold_seats} / {e.total_seats}
                {e.locked_seats > 0 && (
                  <span className="text-gray-600 ml-1">({e.locked_seats} đang giữ)</span>
                )}
              </td>
              <td className="px-4 py-3 text-blue-400 font-medium">
                {formatVND(e.total_revenue)}
              </td>
              <td className="px-4 py-3">
                <Link
                  to={`/admin/events/${e.id}`}
                  className="text-blue-400 hover:text-blue-300 hover:underline text-xs transition"
                >
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
    name:  g.gender === 'male' ? 'Nam' : g.gender === 'female' ? 'Nữ' : 'Khác',
    value: Number(g.count),
    color: GENDER_COLORS[g.gender] ?? GENDER_COLORS.null,
  }));

  const ageData = (audience?.by_age || []).map(a => ({
    age:   a.age_group,
    count: Number(a.count),
  }));

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {/* Gender pie */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="font-semibold mb-4 text-sm text-gray-300">Phân bố giới tính</h2>
        {genderData.length === 0 ? (
          <p className="text-gray-500 text-sm">Chưa có dữ liệu.</p>
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
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Age bar */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="font-semibold mb-4 text-sm text-gray-300">Phân bố độ tuổi</h2>
        {ageData.length === 0 ? (
          <p className="text-gray-500 text-sm">Chưa có dữ liệu.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ageData}>
              <XAxis dataKey="age"   tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis               tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
