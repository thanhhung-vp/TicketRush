import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import VietnamAddressFields, { getAddressPayload } from '../components/VietnamAddressFields.jsx';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter.jsx';
import { isPasswordAtLeastMedium } from '../utils/passwordStrength.js';
import { findProvinceByName, findWardByName } from '../utils/vietnamAddress.js';

const AVATAR_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const AVATAR_SOURCE_MAX_BYTES = 12 * 1024 * 1024;
const AVATAR_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
const AVATAR_COMPRESS_IF_LARGER_THAN = 1600;
const AVATAR_TARGET_MAX_DIMENSION = 1024;
const AVATAR_COMPRESS_IF_BYTES_OVER = 2.5 * 1024 * 1024;

function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight, image });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Invalid image'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

async function compressAvatarIfNeeded(file) {
  const { width, height, image } = await getImageDimensions(file);
  const longestSide = Math.max(width, height);
  const shouldCompress = longestSide > AVATAR_COMPRESS_IF_LARGER_THAN || file.size > AVATAR_COMPRESS_IF_BYTES_OVER;
  if (!shouldCompress) return file;

  const scale = Math.min(1, AVATAR_TARGET_MAX_DIMENSION / longestSide);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.86);
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'avatar';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

function birthYearToDate(year) {
  if (!year) return '';
  return `${year}-01-01`;
}

function getUserBirthDate(user) {
  if (user?.birth_date) return String(user.birth_date).slice(0, 10);
  return birthYearToDate(user?.birth_year);
}

function loadLocal(key, fallback = '') {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function saveLocal(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}

function getInitialAddress(user) {
  const provinceCode = user?.address_province_code || findProvinceByName(user?.address_province_name)?.code || '';
  const wardCode = user?.address_ward_code || findWardByName(provinceCode, user?.address_ward_name)?.code || '';

  return {
    provinceCode,
    wardCode,
    hamlet: user?.address_hamlet || '',
    street: user?.address_line || loadLocal('profile_street'),
  };
}

function FieldLabel({ children }) {
  return <label className="mb-1.5 block text-sm font-normal text-label-secondary">{children}</label>;
}

function TextInput({ ...props }) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border-0 bg-fill-tertiary px-4 py-3 text-sm text-label-primary placeholder:text-label-tertiary transition focus:outline-none focus:ring-2 focus:ring-pink-300/50"
    />
  );
}

function SelectInput({ children, ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        className="w-full appearance-none rounded-xl border-0 bg-fill-tertiary px-4 py-3 pr-10 text-sm text-label-primary transition focus:outline-none focus:ring-2 focus:ring-pink-300/50"
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-label-secondary">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mb-4 text-base font-semibold text-label-primary">{children}</h2>;
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    full_name:  user?.full_name || '',
    gender:     user?.gender || '',
    birth_date: getUserBirthDate(user),
    phone:      loadLocal('profile_phone'),
    address:    getInitialAddress(user),
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState('');
  const [error, setError]   = useState('');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [pw, setPw]       = useState({ old: '', new: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg]   = useState('');
  const [pwError, setPwError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    setAvatarPreview(user?.avatar_url || '');
  }, [user?.avatar_url]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(''); setError('');
    try {
      const payload = {
        full_name: form.full_name,
        gender: form.gender || null,
        birth_date: form.birth_date || null,
      };
      Object.assign(payload, getAddressPayload(form.address));

      const { data } = await api.patch('/auth/profile', payload);
      updateUser(data);

      saveLocal('profile_phone',    form.phone);

      setMsg(t('profile.saveSuccess'));
    } catch (err) {
      setError(err.response?.data?.error || t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setForm({
      full_name:  user?.full_name || '',
      gender:     user?.gender || '',
      birth_date: getUserBirthDate(user),
      phone:      loadLocal('profile_phone'),
      address:    getInitialAddress(user),
    });
    setMsg(''); setError('');
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (pw.new !== pw.confirm) { setPwError(t('profile.pwMismatch')); return; }
    if (pw.old === pw.new) { setPwError(t('passwordStrength.sameAsOld')); return; }
    if (!isPasswordAtLeastMedium(pw.new)) { setPwError(t('passwordStrength.minimumRequired')); return; }
    setPwSaving(true); setPwMsg(''); setPwError('');
    try {
      await api.patch('/auth/change-password', { old_password: pw.old, new_password: pw.new });
      setPwMsg(t('profile.changePasswordSuccess'));
      setPw({ old: '', new: '', confirm: '' });
    } catch (err) {
      setPwError(err.response?.data?.error || t('profile.changePasswordError'));
    } finally {
      setPwSaving(false);
    }
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setMsg('');
    setError('');

    if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
      setError(t('profile.avatarInvalidType'));
      return;
    }
    if (file.size > AVATAR_SOURCE_MAX_BYTES) {
      setError(t('profile.avatarTooLarge'));
      return;
    }

    setAvatarUploading(true);
    try {
      const avatarFile = await compressAvatarIfNeeded(file);
      if (avatarFile.size > AVATAR_UPLOAD_MAX_BYTES) {
        setError(t('profile.avatarTooLarge'));
        return;
      }

      const formData = new FormData();
      formData.append('image', avatarFile);
      const { data } = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const nextUser = data.user || { avatar_url: data.avatar_url };
      updateUser(nextUser);
      setAvatarPreview(nextUser.avatar_url || data.avatar_url || '');
      setMsg(t('profile.avatarUploadSuccess'));
    } catch (err) {
      setError(err.response?.data?.error || t('profile.avatarUploadError'));
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="mb-8 text-center text-xl font-semibold text-label-primary">{t('profile.pageTitle')}</h1>

      <form onSubmit={save} className="mb-5 rounded-2xl border border-separator bg-surface px-6 py-6 shadow-1">
        <SectionTitle>{t('profile.personalInfo')}</SectionTitle>

        {msg   && <div className="mb-4 text-sm text-green-600 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">{msg}</div>}
        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</div>}

        <div className="flex items-center gap-4 mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={uploadAvatar}
            className="hidden"
          />
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-separator bg-fill-tertiary shadow-1">
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <svg className="w-7 h-7 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="flex items-center gap-2 rounded-xl bg-fill-tertiary px-4 py-2 text-sm font-medium text-label-secondary transition hover:bg-fill-quaternary hover:text-label-primary disabled:cursor-wait disabled:opacity-60"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {avatarUploading ? t('profile.avatarUploading') : t('profile.changeAvatar')}
            </button>
            <p className="mt-1.5 text-xs text-label-tertiary">{t('profile.avatarHint')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <FieldLabel>{t('profile.fullName')}</FieldLabel>
            <TextInput
              type="text" placeholder={t('profile.fullNamePlaceholder')}
              value={form.full_name} onChange={set('full_name')}
              required minLength={2}
            />
          </div>

          <div>
            <FieldLabel>{t('profile.gender')}</FieldLabel>
            <SelectInput value={form.gender} onChange={set('gender')}>
              <option value="">{t('profile.genderPlaceholder')}</option>
              <option value="male">{t('profile.genderMale')}</option>
              <option value="female">{t('profile.genderFemale')}</option>
              <option value="other">{t('profile.genderOther')}</option>
            </SelectInput>
          </div>

          <div>
            <FieldLabel>{t('profile.birthDate')}</FieldLabel>
            <div className="relative">
              <TextInput
                type="date"
                value={form.birth_date} onChange={set('birth_date')}
                max={new Date().toISOString().slice(0, 10)}
                min="1900-01-01"
              />
            </div>
          </div>

          <div>
            <FieldLabel>{t('profile.phoneNumber')}</FieldLabel>
            <div className="flex gap-2">
              <div className="w-24 shrink-0">
                <SelectInput defaultValue="+84">
                  <option value="+84">🇻🇳 +84</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                </SelectInput>
              </div>
              <TextInput
                type="tel" placeholder={t('profile.phonePlaceholder')}
                value={form.phone} onChange={set('phone')}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 mb-4">
          <SectionTitle>{t('profile.addressSection')}</SectionTitle>
        </div>

        <div className="space-y-4">
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
            inputClassName="w-full rounded-xl border-0 bg-fill-tertiary px-4 py-3 text-sm text-label-primary placeholder:text-label-tertiary transition focus:outline-none focus:ring-2 focus:ring-pink-300/50 disabled:text-label-tertiary"
            labelClassName="mb-1.5 block text-sm font-normal text-label-secondary"
            gridClassName="space-y-4"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={cancel}
            className="rounded-xl bg-fill-tertiary px-5 py-2.5 text-sm font-medium text-label-secondary transition hover:bg-fill-quaternary hover:text-label-primary">
            {t('profile.cancelBtn')}
          </button>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50 hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, #f9a8d4, #ec4899)' }}
          >
            {saving ? t('profile.savingText') : t('profile.saveChanges')}
          </button>
        </div>
      </form>

      <form onSubmit={changePw} className="rounded-2xl border border-separator bg-surface px-6 py-6 shadow-1">
        <SectionTitle>{t('profile.changePasswordSection')}</SectionTitle>

        {pwMsg   && <div className="mb-4 text-sm text-green-600 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">{pwMsg}</div>}
        {pwError && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{pwError}</div>}

        <div className="space-y-4">
          <div>
            <FieldLabel>{t('profile.currentPasswordLabel')}</FieldLabel>
            <TextInput type="password" placeholder="••••••••" required
              value={pw.old} onChange={e => setPw(p => ({ ...p, old: e.target.value }))} />
          </div>
          <div>
            <FieldLabel>{t('profile.newPasswordLabel')}</FieldLabel>
            <TextInput type="password" placeholder={t('profile.minPasswordHint')} required minLength={6}
              value={pw.new} onChange={e => setPw(p => ({ ...p, new: e.target.value }))} />
            <PasswordStrengthMeter password={pw.new} />
          </div>
          <div>
            <FieldLabel>{t('profile.confirmNewPasswordLabel')}</FieldLabel>
            <TextInput type="password" placeholder="••••••••" required minLength={6}
              value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button type="submit" disabled={pwSaving}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50 hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, #f9a8d4, #ec4899)' }}
          >
            {pwSaving ? t('profile.processingText') : t('profile.updatePasswordBtn')}
          </button>
        </div>
      </form>
    </div>
  );
}
