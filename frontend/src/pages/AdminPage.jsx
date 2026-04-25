import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(n);
}
function formatDate(d) {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

const GENDER_COLORS = { male: '#3b82f6', female: '#ec4899', other: '#a78bfa', null: '#6b7280' };
const AGE_COLOR = '#3b82f6';

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [audience, setAudience] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/stats/audience'),
      api.get('/admin/events'),
    ]).then(([d, a, e]) => {
      setDashboard(d.data);
      setAudience(a.data);
      setEvents(e.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Đang tải...</div>;

  const totalRevenue = dashboard?.events?.reduce((s, e) => s + Number(e.total_revenue), 0) || 0;
  const totalOrders  = dashboard?.events?.reduce((s, e) => s + Number(e.orders_paid), 0) || 0;
  const totalSold    = dashboard?.events?.reduce((s, e) => s + Number(e.sold_seats), 0) || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Link to="/admin/events/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Tạo sự kiện
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6 w-fit border border-gray-800">
        {[['dashboard', 'Tổng quan'], ['events', 'Sự kiện'], ['audience', 'Khán giả']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === k ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {label}
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
        />
      )}
      {tab === 'events' && <EventsTab events={events} />}
      {tab === 'audience' && <AudienceTab audience={audience} />}
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

function DashboardTab({ totalRevenue, totalOrders, totalSold, events, revenueByDay }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Tổng doanh thu" value={formatVND(totalRevenue)} />
        <StatCard label="Đơn hàng thành công" value={totalOrders.toLocaleString()} />
        <StatCard label="Vé đã bán" value={totalSold.toLocaleString()} />
      </div>

      {/* Revenue chart */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="font-semibold mb-4">Doanh thu 30 ngày gần nhất</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={revenueByDay.map(r => ({ ...r, revenue: Number(r.revenue) }))}>
            <XAxis dataKey="day" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tickFormatter={v => formatVND(v)} tick={{ fontSize: 11, fill: '#6b7280' }} width={70} />
            <Tooltip formatter={(v) => formatVND(v)} labelFormatter={formatDate} contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Per-event occupancy */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="font-semibold mb-4">Tỷ lệ lấp đầy theo sự kiện</h2>
        <div className="space-y-3">
          {events.map(e => {
            const pct = e.total_seats > 0 ? Math.round((e.sold_seats / e.total_seats) * 100) : 0;
            return (
              <div key={e.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="truncate max-w-xs">{e.title}</span>
                  <span className="text-gray-400 ml-2">{pct}% ({e.sold_seats}/{e.total_seats})</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EventsTab({ events }) {
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
            <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="px-4 py-3">
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-gray-500">{new Date(e.event_date).toLocaleDateString('vi-VN')}</p>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={e.status} />
              </td>
              <td className="px-4 py-3">
                {e.sold_seats} / {e.total_seats}
                <span className="text-gray-600 ml-1">({e.locked_seats} đang giữ)</span>
              </td>
              <td className="px-4 py-3 text-blue-400 font-medium">
                {formatVND(e.total_revenue)}
              </td>
              <td className="px-4 py-3">
                <Link to={`/admin/events/${e.id}`} className="text-blue-400 hover:underline text-xs">Chi tiết →</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const MAP = {
    draft:    'bg-gray-800 text-gray-400',
    on_sale:  'bg-green-900/50 text-green-400',
    ended:    'bg-red-900/50 text-red-400',
  };
  const LABEL = { draft: 'Nháp', on_sale: 'Đang bán', ended: 'Kết thúc' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MAP[status]}`}>{LABEL[status]}</span>;
}

function AudienceTab({ audience }) {
  const genderData = audience?.by_gender?.map(g => ({
    name: g.gender === 'male' ? 'Nam' : g.gender === 'female' ? 'Nữ' : 'Khác',
    value: Number(g.count),
    color: GENDER_COLORS[g.gender] || GENDER_COLORS.null,
  })) || [];

  const ageData = audience?.by_age || [];

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="font-semibold mb-4">Phân bố giới tính</h2>
        {genderData.length === 0 ? (
          <p className="text-gray-500 text-sm">Chưa có dữ liệu</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {genderData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="font-semibold mb-4">Phân bố độ tuổi</h2>
        {ageData.length === 0 ? (
          <p className="text-gray-500 text-sm">Chưa có dữ liệu</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ageData.map(a => ({ age: a.age_group, count: Number(a.count) }))}>
              <XAxis dataKey="age" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
              <Bar dataKey="count" fill={AGE_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
