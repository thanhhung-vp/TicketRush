import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', gender: '', birth_year: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register({
        ...form,
        birth_year: form.birth_year ? Number(form.birth_year) : undefined,
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mt-2">
            <span className="text-primary">Ticket</span><span className="text-gray-800">Rush</span>
          </h1>
          <p className="text-gray-500 mt-1">Tạo tài khoản mới</p>
        </div>
        <form onSubmit={handle} className="bg-white rounded-2xl p-8 space-y-5 border border-gray-200 shadow-lg">
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <Field label="Họ và tên *" type="text" value={form.full_name} onChange={set('full_name')} required minLength={2} maxLength={100} placeholder="Nguyễn Văn A" />
          <Field label="Email *" type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
          <Field label="Mật khẩu *" type="password" value={form.password} onChange={set('password')} required minLength={6} placeholder="Ít nhất 6 ký tự" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Giới tính</label>
              <select value={form.gender} onChange={set('gender')}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition">
                <option value="">-- Chọn --</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <Field label="Năm sinh" type="number" value={form.birth_year} onChange={set('birth_year')}
              min={1900} max={new Date().getFullYear() - 5} placeholder="1990" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#E6007E] hover:bg-[#c4006a] disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition">
            {loading ? 'Đang đăng ký...' : 'Đăng ký tài khoản'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">Đăng nhập</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm text-gray-500 mb-1">{label}</label>
      <input {...props}
        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
      />
    </div>
  );
}
