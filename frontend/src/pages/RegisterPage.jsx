import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import VietnamAddressFields, { getAddressPayload } from '../components/VietnamAddressFields.jsx';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter.jsx';
import { isPasswordAtLeastMedium } from '../utils/passwordStrength.js';
import {
  AuthBg, AuthCard, IconInput, PinkButton, AuthDivider, SocialAuthButtons, Checkbox,
  EnvelopeIcon, LockIcon, EyeIcon, EyeOffIcon, UserIcon,
} from '../components/AuthLayout.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm: '',
    gender: '',
    birth_date: '',
    address: { provinceCode: '', wardCode: '', hamlet: '', street: '' },
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError(t('auth.passwordMismatch')); return; }
    if (!isPasswordAtLeastMedium(form.password)) { setError(t('passwordStrength.minimumRequired')); return; }
    if (!agreed) { setError(t('auth.agreeTermsRequired')); return; }
    setError(''); setLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        ...(form.gender && { gender: form.gender }),
        ...(form.birth_date && { birth_date: form.birth_date }),
        ...getAddressPayload(form.address),
      });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <AuthBg>
        <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-2xl px-8 py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t('auth.registerSuccessTitle')}</h2>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            {t('auth.registerSuccessDesc')}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition"
          >
            {t('auth.backToLogin')}
          </button>
        </div>
      </AuthBg>
    );
  }

  return (
    <AuthBg>
      <AuthCard title={t('auth.registerTitle')}>
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handle} className="space-y-3.5">
          <IconInput
            icon={<UserIcon />}
            type="text"
            placeholder={t('auth.namePlaceholder')}
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            required
            minLength={2}
            autoFocus
          />
          <IconInput
            icon={<EnvelopeIcon />}
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
          />
          <IconInput
            icon={<LockIcon />}
            type={showPw ? 'text' : 'password'}
            placeholder={t('auth.passwordPlaceholder')}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
            minLength={6}
            rightEl={
              <button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-400 hover:text-gray-600 transition">
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          />
          <PasswordStrengthMeter password={form.password} />
          <IconInput
            icon={<LockIcon />}
            type={showConfirm ? 'text' : 'password'}
            placeholder={t('auth.confirmPwPlaceholder')}
            value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            required
            rightEl={
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-gray-400 hover:text-gray-600 transition">
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={form.gender}
              onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
              className="w-full rounded-2xl bg-gray-100 px-4 py-3.5 text-sm text-gray-800 transition focus:outline-none focus:ring-2 focus:ring-pink-300/60"
            >
              <option value="">{t('profile.genderPlaceholder')}</option>
              <option value="male">{t('profile.genderMale')}</option>
              <option value="female">{t('profile.genderFemale')}</option>
              <option value="other">{t('profile.genderOther')}</option>
            </select>
            <input
              type="date"
              value={form.birth_date}
              onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
              min="1900-01-01"
              max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-2xl bg-gray-100 px-4 py-3.5 text-sm text-gray-800 transition focus:outline-none focus:ring-2 focus:ring-pink-300/60"
              aria-label={t('profile.birthDate')}
            />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
            <p className="mb-3 text-sm font-semibold text-gray-700">{t('auth.addressTitle')}</p>
            <VietnamAddressFields
              value={form.address}
              onChange={address => setForm(f => ({ ...f, address }))}
              labels={{
                province: t('profile.province'),
                provincePlaceholder: t('profile.provinceDefault'),
                ward: t('profile.ward'),
                wardPlaceholder: t('profile.wardPlaceholder'),
                hamlet: t('profile.hamlet'),
                hamletPlaceholder: t('profile.hamletPlaceholder'),
                street: t('profile.street'),
                streetPlaceholder: t('profile.streetPlaceholder'),
              }}
              inputClassName="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-300/50 disabled:bg-gray-100 disabled:text-gray-400"
              labelClassName="mb-1 block text-xs font-medium text-gray-500"
              gridClassName="grid gap-2.5"
            />
          </div>

          <Checkbox
            checked={agreed}
            onChange={setAgreed}
            label={
              <span className="text-sm text-gray-600">
                {t('auth.agreeWith')}{' '}
                <Link to="/terms" target="_blank" className="text-blue-500 hover:underline">{t('auth.termsLink')}</Link>
              </span>
            }
          />

          <div className="pt-1">
            <PinkButton type="submit" disabled={loading}>
              {loading ? t('auth.registering') : t('auth.continueBtn')}
            </PinkButton>
          </div>
        </form>

        <AuthDivider text={t('auth.orRegisterWith')} />
        <SocialAuthButtons />

        <p className="mt-5 text-center text-sm text-gray-500">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-blue-500 hover:text-blue-600 font-semibold transition">
            {t('auth.loginNow')}
          </Link>
        </p>
      </AuthCard>
    </AuthBg>
  );
}
