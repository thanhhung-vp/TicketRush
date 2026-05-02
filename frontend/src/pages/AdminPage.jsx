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

const GENDER_COLORS = { male: '#3b82f6', female: '#ec4899', other: '#a78bfa', null: '#94a3b8' };
const AGE_COLOR = '#6366f1';

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
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <Link to="/admin/events/new"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg shadow-blue-500/25">
          + Tạo sự kiện
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1 rounded-xl mb-6 w-fit border border-gray-200 shadow-sm">
        {[['dashboard', 'Tổng quan'], ['events', 'Sự kiện'], ['audience', 'Khán giả']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === k ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
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

function StatCard({ label, value, sub, gradient }) {
  return (
    <div className={`rounded-xl p-5 text-white shadow-lg ${gradient}`}>
      <p className="text-sm font-medium text-white/80 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
    </div>
  );
}

function DashboardTab({ totalRevenue, totalOrders, totalSold, events, revenueByDay }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Tổng doanh thu" value={formatVND(totalRevenue)} gradient="bg-gradient-to-br from-blue-500 to-blue-700" />
        <StatCard label="Đơn hàng thành công" value={totalOrders.toLocaleString()} gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" />
        <StatCard label="Vé đã bán" value={totalSold.toLocaleString()} gradient="bg-gradient-to-br from-violet-500 to-violet-700" />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <h2 className="font-semibold mb-4 text-gray-700">📈 Doanh thu 30 ngày gần nhất</h2>
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

      {/* Per-event occupancy */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <h2 className="font-semibold mb-4 text-gray-700">🎯 Tỷ lệ lấp đầy theo sự kiện</h2>
        <div className="space-y-3">
          {events.map(e => {
            const pct = e.total_seats > 0 ? Math.round((e.sold_seats / e.total_seats) * 100) : 0;
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
      </div>
    </div>
  );
}

function EventsTab({ events }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            {['Sự kiện', 'Trạng thái', 'Đã bán / Tổng', 'Doanh thu', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map(e => (
            <tr key={e.id} className="border-b border-gray-100 hover:bg-blue-50/50 transition">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-800">{e.title}</p>
                <p className="text-xs text-gray-500">{new Date(e.event_date).toLocaleDateString('vi-VN')}</p>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={e.status} />
              </td>
              <td className="px-4 py-3 text-gray-700">
                {e.sold_seats} / {e.total_seats}
                <span className="text-gray-400 ml-1">({e.locked_seats} đang giữ)</span>
              </td>
              <td className="px-4 py-3 text-blue-600 font-semibold">
                {formatVND(e.total_revenue)}
              </td>
              <td className="px-4 py-3">
                <Link to={`/admin/events/${e.id}`} className="text-blue-600 hover:text-blue-700 hover:underline text-xs font-medium transition">Chi tiết →</Link>
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
    draft:    'bg-gray-100 text-gray-600 border border-gray-300',
    on_sale:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
    ended:    'bg-red-50 text-red-600 border border-red-200',
  };
  const LABEL = { draft: 'Nháp', on_sale: 'Đang bán', ended: 'Kết thúc' };
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${MAP[status]}`}>{LABEL[status]}</span>;
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
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <h2 className="font-semibold mb-4 text-gray-700">👥 Phân bố giới tính</h2>
        {genderData.length === 0 ? (
          <p className="text-gray-400 text-sm">Chưa có dữ liệu</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {genderData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <h2 className="font-semibold mb-4 text-gray-700">📊 Phân bố độ tuổi</h2>
        {ageData.length === 0 ? (
          <p className="text-gray-400 text-sm">Chưa có dữ liệu</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ageData.map(a => ({ age: a.age_group, count: Number(a.count) }))}>
              <XAxis dataKey="age" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="count" fill={AGE_COLOR} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
