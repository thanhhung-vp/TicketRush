import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.context.jsx';
import { Button, Input, Select, Alert, Card, CardBody } from '../../components/ui/index.js';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm] = useState({
    full_name:  '',
    email:      '',
    password:   '',
    gender:     '',
    birth_year: '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        full_name:  form.full_name,
        email:      form.email,
        password:   form.password,
        ...(form.gender     && { gender: form.gender }),
        ...(form.birth_year && { birth_year: Number(form.birth_year) }),
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-600/40 mb-4">
            <span className="text-3xl">🎫</span>
          </div>
          <h1 className="text-3xl font-bold">Tạo tài khoản</h1>
          <p className="text-gray-400 mt-2">Tham gia TicketRush để đặt vé ngay hôm nay</p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <Alert type="error">{error}</Alert>}

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-400">Họ và tên *</label>
                <Input
                  type="text"
                  required
                  autoFocus
                  minLength={2}
                  maxLength={100}
                  value={form.full_name}
                  onChange={set('full_name')}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-400">Email *</label>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={set('email')}
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-400">Mật khẩu *</label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Ít nhất 6 ký tự"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-400">Giới tính</label>
                  <Select value={form.gender} onChange={set('gender')}>
                    <option value="">-- Chọn --</option>
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
                    max={new Date().getFullYear() - 5}
                    value={form.birth_year}
                    onChange={set('birth_year')}
                    placeholder="1990"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
              </Button>

              <p className="text-center text-sm text-gray-400">
                Đã có tài khoản?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 hover:underline transition">
                  Đăng nhập
                </Link>
              </p>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
