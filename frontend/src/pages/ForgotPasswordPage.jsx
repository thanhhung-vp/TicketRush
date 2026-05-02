import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import {
  AuthBg, AuthCard, IconInput, PinkButton,
  EnvelopeIcon, LockIcon, EyeIcon, EyeOffIcon, ShieldIcon,
} from '../components/AuthLayout.jsx';

function StepIndicator({ step }) {
  return (
    <div className="flex items-center justify-center gap-2.5 mb-6 -mt-2">
      <div className="flex items-center gap-1.5">
        <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
          step >= 1 ? 'bg-blue-500 text-white' : 'border-2 border-gray-300 text-gray-400'
        }`}>
          {step > 1 ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : '1'}
        </span>
        <span className={`text-xs font-medium ${step === 1 ? 'text-gray-700' : 'text-gray-400'}`}>
          Xác thực tài khoản
        </span>
      </div>
      <span className="text-gray-300 text-base">›</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border-2 ${
          step === 2 ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 text-gray-400'
        }`}>2</span>
        <span className={`text-xs font-medium ${step === 2 ? 'text-gray-700' : 'text-gray-400'}`}>
          Đổi mật khẩu
        </span>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const sendOtp = async () => {
    if (!email) { setError('Vui lòng nhập email trước'); return; }
    setSending(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể gửi mã, vui lòng thử lại');
    } finally {
      setSending(false);
    }
  };

  const goStep2 = (e) => {
    e.preventDefault();
    if (!otpSent) { setError('Vui lòng nhấn "Gửi mã" trước'); return; }
    if (otp.length < 6) { setError('Vui lòng nhập đủ 6 số mã xác minh'); return; }
    setError('');
    setStep(2);
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setError('Mật khẩu xác nhận không khớp'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { email, otp, new_password: newPw });
      setSuccess('Đặt lại mật khẩu thành công! Đang chuyển hướng...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Mã xác minh không hợp lệ hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBg>
      <AuthCard title="Đổi mật khẩu">
        <StepIndicator step={step} />

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 text-sm text-green-600 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
            {success}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={goStep2} className="space-y-3.5">
            <IconInput
              icon={<EnvelopeIcon />}
              type="email"
              placeholder="Nhập địa chỉ email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            <IconInput
              icon={<ShieldIcon />}
              type="text"
              inputMode="numeric"
              placeholder={otpSent ? 'Nhập mã 6 số' : 'Nhấn "Gửi mã", sau đó vui lòng kiểm tra hộp thư đến ...'}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              rightEl={
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={sending}
                  className="text-blue-500 hover:text-blue-600 font-semibold text-sm transition whitespace-nowrap disabled:opacity-50"
                >
                  {sending ? '...' : 'Gửi mã'}
                </button>
              }
            />
            <p className="text-xs text-gray-400 px-1 -mt-1">
              Nhấn "Gửi mã", sau đó vui lòng kiểm tra hộp thư đến và làm theo hướng dẫn.
            </p>
            <div className="pt-1">
              <PinkButton type="submit" disabled={!otpSent || otp.length < 6}>
                Tiếp tục
              </PinkButton>
            </div>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-3.5">
            <IconInput
              icon={<LockIcon />}
              type={showPw ? 'text' : 'password'}
              placeholder="Mật khẩu mới"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              required
              minLength={6}
              autoFocus
              rightEl={
                <button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-400 hover:text-gray-600 transition">
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />
            <IconInput
              icon={<LockIcon />}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Xác nhận mật khẩu mới"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              required
              rightEl={
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-gray-400 hover:text-gray-600 transition">
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />
            <div className="pt-1">
              <PinkButton type="submit" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Tiếp tục'}
              </PinkButton>
            </div>
          </form>
        )}

        <div className="mt-5 text-center">
          <Link to="/login" className="text-sm text-blue-500 hover:text-blue-600 font-medium transition">
            Trở về Đăng nhập
          </Link>
        </div>
      </AuthCard>
    </AuthBg>
  );
}
