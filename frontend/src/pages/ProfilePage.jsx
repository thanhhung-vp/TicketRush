import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const GENDER_LABELS = { male: 'Nam', female: 'Nữ', other: 'Khác' };

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name:  user?.full_name || '',
    gender:     user?.gender || '',
    birth_year: user?.birth_year || '',
  });
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');
  const [error, setError]     = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(''); setError('');
    try {
      const payload = {
        full_name: form.full_name,
        ...(form.gender && { gender: form.gender }),
        ...(form.birth_year && { birth_year: Number(form.birth_year) }),
      };
      const { data } = await api.patch('/auth/profile', payload);
      updateUser(data);
      setMsg('Cập nhật thành công!');
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Tài khoản của tôi</h1>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        {/* Avatar + name */}
        <div className="p-6 border-b border-gray-200 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
            {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-bold text-xl text-gray-900">{user.full_name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
              user.role === 'admin' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}>
              {user.role === 'admin' ? 'Admin' : 'Thành viên'}
            </span>
          </div>
        </div>

        {/* Details / Edit form */}
        <div className="p-6">
          {msg && <p className="mb-4 text-sm bg-green-50 text-green-600 border border-green-200 px-3 py-2 rounded-lg">{msg}</p>}
          {error && <p className="mb-4 text-sm bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}

          {editing ? (
            <form onSubmit={save} className="space-y-4">
              <Field label="Họ tên" value={form.full_name} onChange={set('full_name')} required />

              <div>
                <label className="block text-sm text-gray-500 mb-1">Giới tính</label>
                <select value={form.gender} onChange={set('gender')}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition">
                  <option value="">— Chưa chọn —</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <Field label="Năm sinh" type="number" min="1900" max="2010"
                value={form.birth_year} onChange={set('birth_year')} placeholder="VD: 1998" />

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#E6007E] hover:bg-[#c4006a] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition">
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button type="button" onClick={() => { setEditing(false); setError(''); }}
                  className="flex-1 border border-gray-300 text-gray-600 hover:text-gray-900 py-2.5 rounded-xl transition">
                  Hủy
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <InfoRow label="Họ tên" value={user.full_name} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Giới tính" value={GENDER_LABELS[user.gender] || '—'} />
              <InfoRow label="Năm sinh" value={user.birth_year || '—'} />
              <InfoRow
                label="Thành viên từ"
                value={new Date(user.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              />
              <button onClick={() => setEditing(true)}
                className="mt-4 w-full bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 py-2.5 rounded-xl transition font-medium">
                Chỉnh sửa thông tin
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <QuickLink to="/my-tickets" icon="🎟" label="Vé của tôi" />
        {user.role === 'admin' && <QuickLink to="/admin" icon="⚙️" label="Quản trị" />}
        <QuickLink to="/" icon="🎭" label="Khám phá sự kiện" />
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-700">{value}</span>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm text-gray-500 mb-1">{label}</label>
      <input {...props}
        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" />
    </div>
  );
}

function QuickLink({ to, icon, label }) {
  return (
    <Link to={to} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:border-gray-400 hover:shadow-sm transition">
      <span className="text-2xl">{icon}</span>
      <span className="font-medium text-sm text-gray-700">{label}</span>
    </Link>
  );
}
