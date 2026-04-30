import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  AuthBg, AuthCard, IconInput, PinkButton, AuthDivider, GoogleAuthButton, Checkbox,
  EnvelopeIcon, LockIcon, EyeIcon, EyeOffIcon,
} from '../components/AuthLayout.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBg>
      <AuthCard title="Đăng nhập">
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handle} className="space-y-3.5">
          <IconInput
            icon={<EnvelopeIcon />}
            type="email"
            placeholder="Nhập địa chỉ email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
            autoFocus
          />
          <IconInput
            icon={<LockIcon />}
            type={showPw ? 'text' : 'password'}
            placeholder="Nhập mật khẩu"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
            rightEl={
              <button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-400 hover:text-gray-600 transition">
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          />

          <div className="flex items-center justify-between pt-0.5">
            <Checkbox
              checked={remember}
              onChange={setRemember}
              label={<span className="text-sm text-gray-600">Tự động đăng nhập</span>}
            />
            <Link to="/forgot-password" className="text-sm text-blue-500 hover:text-blue-600 font-medium transition">
              Quên mật khẩu?
            </Link>
          </div>

          <div className="pt-1">
            <PinkButton type="submit" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </PinkButton>
          </div>
        </form>

        <AuthDivider text="Hoặc đăng nhập với" />
        <GoogleAuthButton />

        <p className="mt-5 text-center text-sm text-gray-500">
          Bạn chưa có tài khoản?{' '}
          <Link to="/register" className="text-blue-500 hover:text-blue-600 font-semibold transition">
            Đăng ký ngay
          </Link>
        </p>
      </AuthCard>
    </AuthBg>
  );
}
