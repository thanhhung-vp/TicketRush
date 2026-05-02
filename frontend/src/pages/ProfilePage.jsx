import { useState, useEffect } from 'react';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const PROVINCES = [
  'An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh',
  'Bến Tre','Bình Định','Bình Dương','Bình Phước','Bình Thuận','Cà Mau',
  'Cần Thơ','Cao Bằng','Đà Nẵng','Đắk Lắk','Đắk Nông','Điện Biên',
  'Đồng Nai','Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh',
  'Hải Dương','Hải Phòng','Hậu Giang','Hòa Bình','Hưng Yên','Khánh Hòa',
  'Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai',
  'Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ',
  'Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị',
  'Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa',
  'Thừa Thiên Huế','Tiền Giang','TP. Hồ Chí Minh','Trà Vinh',
  'Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái',
];

function birthYearToDate(year) {
  if (!year) return '';
  return `${year}-01-01`;
}

function dateToYear(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).getFullYear();
}

function loadLocal(key, fallback = '') {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function saveLocal(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}

function FieldLabel({ children }) {
  return <label className="block text-sm text-gray-700 mb-1.5 font-normal">{children}</label>;
}

function TextInput({ ...props }) {
  return (
    <input
      {...props}
      className="w-full bg-gray-100 border-0 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300/50 transition"
    />
  );
}

function SelectInput({ children, ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        className="w-full appearance-none bg-gray-100 border-0 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-300/50 transition pr-10"
      >
        {children}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-base font-semibold text-gray-800 mb-4">{children}</h2>;
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    full_name:  user?.full_name || '',
    birth_date: birthYearToDate(user?.birth_year),
    phone:      loadLocal('profile_phone'),
    province:   loadLocal('profile_province'),
    district:   loadLocal('profile_district'),
    ward:       loadLocal('profile_ward'),
    street:     loadLocal('profile_street'),
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState('');
  const [error, setError]   = useState('');

  // Password change state
  const [pw, setPw]       = useState({ old: '', new: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg]   = useState('');
  const [pwError, setPwError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(''); setError('');
    try {
      const payload = { full_name: form.full_name };
      const yr = dateToYear(form.birth_date);
      if (yr) payload.birth_year = yr;

      const { data } = await api.patch('/auth/profile', payload);
      updateUser(data);

      // Save local-only fields
      saveLocal('profile_phone',    form.phone);
      saveLocal('profile_province', form.province);
      saveLocal('profile_district', form.district);
      saveLocal('profile_ward',     form.ward);
      saveLocal('profile_street',   form.street);

      setMsg('Lưu thay đổi thành công!');
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setForm({
      full_name:  user?.full_name || '',
      birth_date: birthYearToDate(user?.birth_year),
      phone:      loadLocal('profile_phone'),
      province:   loadLocal('profile_province'),
      district:   loadLocal('profile_district'),
      ward:       loadLocal('profile_ward'),
      street:     loadLocal('profile_street'),
    });
    setMsg(''); setError('');
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (pw.new !== pw.confirm) { setPwError('Mật khẩu mới không khớp'); return; }
    setPwSaving(true); setPwMsg(''); setPwError('');
    try {
      await api.patch('/auth/change-password', { old_password: pw.old, new_password: pw.new });
      setPwMsg('Đổi mật khẩu thành công');
      setPw({ old: '', new: '', confirm: '' });
    } catch (err) {
      setPwError(err.response?.data?.error || 'Lỗi đổi mật khẩu');
    } finally {
      setPwSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-xl font-semibold text-gray-800 text-center mb-8">Cài đặt tài khoản</h1>

      {/* ─── Thông tin cá nhân ─── */}
      <form onSubmit={save} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-6 mb-5">
        <SectionTitle>Thông tin cá nhân</SectionTitle>

        {msg   && <div className="mb-4 text-sm text-green-600 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">{msg}</div>}
        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</div>}

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <button type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-600 hover:bg-gray-200 transition font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Đổi ảnh đại diện
          </button>
        </div>

        <div className="space-y-4">
          {/* Họ tên */}
          <div>
            <FieldLabel>Họ tên</FieldLabel>
            <TextInput
              type="text" placeholder="Nhập họ tên"
              value={form.full_name} onChange={set('full_name')}
              required minLength={2}
            />
          </div>

          {/* Ngày sinh */}
          <div>
            <FieldLabel>Ngày sinh</FieldLabel>
            <div className="relative">
              <TextInput
                type="date"
                value={form.birth_date} onChange={set('birth_date')}
                max={`${new Date().getFullYear() - 5}-12-31`}
                min="1920-01-01"
              />
            </div>
          </div>

          {/* Số điện thoại */}
          <div>
            <FieldLabel>Số điện thoại</FieldLabel>
            <div className="flex gap-2">
              <div className="w-24 shrink-0">
                <SelectInput defaultValue="+84">
                  <option value="+84">🇻🇳 +84</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                </SelectInput>
              </div>
              <TextInput
                type="tel" placeholder="Nhập số điện thoại"
                value={form.phone} onChange={set('phone')}
              />
            </div>
          </div>
        </div>

        {/* ─── Địa chỉ ─── */}
        <div className="mt-6 mb-4">
          <SectionTitle>Địa chỉ</SectionTitle>
        </div>

        <div className="space-y-4">
          {/* Tỉnh / Thành phố */}
          <div>
            <FieldLabel>Tỉnh/Thành phố</FieldLabel>
            <SelectInput value={form.province} onChange={set('province')}>
              <option value="">Chọn Tỉnh/Thành phố</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </SelectInput>
          </div>

          {/* Quận / Huyện */}
          <div>
            <FieldLabel>Quận/Huyện</FieldLabel>
            <TextInput
              type="text" placeholder="Chọn Quận/Huyện"
              value={form.district} onChange={set('district')}
            />
          </div>

          {/* Phường / Xã */}
          <div>
            <FieldLabel>Phường/Xã</FieldLabel>
            <TextInput
              type="text" placeholder="Chọn Phường/Xã"
              value={form.ward} onChange={set('ward')}
            />
          </div>

          {/* Số nhà, tên đường */}
          <div>
            <FieldLabel>Số nhà, tên đường</FieldLabel>
            <TextInput
              type="text" placeholder="Nhập số nhà, tên đường"
              value={form.street} onChange={set('street')}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={cancel}
            className="px-5 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-600 hover:bg-gray-200 transition font-medium">
            Hủy
          </button>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50 hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, #f9a8d4, #ec4899)' }}
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>

      {/* ─── Đổi mật khẩu ─── */}
      <form onSubmit={changePw} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-6">
        <SectionTitle>Đổi mật khẩu</SectionTitle>

        {pwMsg   && <div className="mb-4 text-sm text-green-600 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">{pwMsg}</div>}
        {pwError && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{pwError}</div>}

        <div className="space-y-4">
          <div>
            <FieldLabel>Mật khẩu hiện tại</FieldLabel>
            <TextInput type="password" placeholder="••••••••" required
              value={pw.old} onChange={e => setPw(p => ({ ...p, old: e.target.value }))} />
          </div>
          <div>
            <FieldLabel>Mật khẩu mới</FieldLabel>
            <TextInput type="password" placeholder="Ít nhất 6 ký tự" required minLength={6}
              value={pw.new} onChange={e => setPw(p => ({ ...p, new: e.target.value }))} />
          </div>
          <div>
            <FieldLabel>Xác nhận mật khẩu mới</FieldLabel>
            <TextInput type="password" placeholder="••••••••" required minLength={6}
              value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button type="submit" disabled={pwSaving}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50 hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, #f9a8d4, #ec4899)' }}
          >
            {pwSaving ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
          </button>
        </div>
      </form>
    </div>
  );
}
