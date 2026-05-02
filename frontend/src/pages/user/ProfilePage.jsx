import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/auth.context.jsx';
import { authService } from '../../services/auth.service.js';
import { Button, Input, Select, Alert } from '../../components/ui/index.js';
import { PageContainer } from '../../components/layout/PageContainer.jsx';
import { GENDER_LABELS } from '../../utils/constants.js';
import { formatDateShort } from '../../utils/format.js';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name:  user?.full_name  || '',
    gender:     user?.gender     || '',
    birth_year: user?.birth_year || '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      const payload = {
        full_name: form.full_name,
        ...(form.gender     && { gender: form.gender }),
        ...(form.birth_year && { birth_year: Number(form.birth_year) }),
      };
      const result = await authService.updateProfile(payload);
      updateUser(result);
      setSuccess('Cập nhật thông tin thành công!');
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Lỗi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setForm({
      full_name:  user?.full_name  || '',
      gender:     user?.gender     || '',
      birth_year: user?.birth_year || '',
    });
    setError('');
    setEditing(false);
  };

  if (!user) return null;

  const initials = user.full_name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <PageContainer maxWidth="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Tài khoản của tôi</h1>

      {/* Avatar + identity */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-800 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-xl truncate">{user.full_name}</p>
            <p className="text-sm text-gray-400 truncate">{user.email}</p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1.5 inline-block border ${
                user.role === 'admin'
                  ? 'bg-yellow-900/40 text-yellow-400 border-yellow-800'
                  : 'bg-blue-900/40 text-blue-400 border-blue-800'
              }`}
            >
              {user.role === 'admin' ? 'Admin' : 'Thành viên'}
            </span>
          </div>
        </div>

        {/* Details / Edit form */}
        <div className="p-6">
          {success && <Alert type="success" className="mb-4">{success}</Alert>}
          {error   && <Alert type="error"   className="mb-4">{error}</Alert>}

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-400">Họ tên *</label>
                <Input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={form.full_name}
                  onChange={set('full_name')}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-400">Giới tính</label>
                <Select value={form.gender} onChange={set('gender')}>
                  <option value="">— Chưa chọn —</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-400">Năm sinh</label>
                <Input
                  type="number"
                  min={1900}
                  max={2010}
                  value={form.birth_year}
                  onChange={set('birth_year')}
                  placeholder="VD: 1998"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
                <Button type="button" variant="secondary" onClick={cancelEdit} className="flex-1">
                  Hủy
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <InfoRow label="Họ tên"     value={user.full_name} />
              <InfoRow label="Email"      value={user.email} />
              <InfoRow label="Giới tính"  value={GENDER_LABELS[user.gender] || '—'} />
              <InfoRow label="Năm sinh"   value={user.birth_year || '—'} />
              <InfoRow
                label="Thành viên từ"
                value={user.created_at ? formatDateShort(user.created_at) : '—'}
              />
              <Button
                variant="secondary"
                onClick={() => setEditing(true)}
                className="mt-4 w-full"
              >
                Chỉnh sửa thông tin
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <QuickLink to="/my-tickets" label="Vé của tôi" />
        {user.role === 'admin' && <QuickLink to="/admin" label="Quản trị hệ thống" />}
        <QuickLink to="/" label="Khám phá sự kiện" />
      </div>
    </PageContainer>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-800/60 pb-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function QuickLink({ to, label }) {
  return (
    <Link
      to={to}
      className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3 hover:border-gray-600 hover:bg-gray-800/50 transition"
    >
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}
