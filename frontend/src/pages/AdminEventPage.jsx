import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../lib/api.js';
import MerchManager from '../components/MerchManager.jsx';
import SeatDesigner from '../components/SeatDesigner.jsx';

const CATEGORY_VALUES = [
  'music', 'fan_meeting', 'merchandise', 'arts', 'sports',
  'conference', 'education', 'nightlife', 'livestream', 'travel', 'other',
];

const GENDER_COLORS = { male: '#3b82f6', female: '#ec4899', other: '#a78bfa', unknown: '#94a3b8' };
const AGE_COLOR = '#6366f1';

export default function AdminEventPage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { t }       = useTranslation();
  const isNew       = id === 'new';
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '', description: '', venue: '', event_date: '',
    poster_url: '', status: 'draft', category: 'other', is_featured: false,
  });
  const [zones,       setZones]       = useState([]);
  const [audience,    setAudience]    = useState(null);
  const [layoutJson,  setLayoutJson]  = useState(null);
  const [newZone,     setNewZone]     = useState({ name: '', rows: '', cols: '', price: '', color: '#3B82F6' });
  const [loading,     setLoading]     = useState(!isNew);
  const [saving,      setSaving]      = useState(false);
  const [savingLayout,setSavingLayout]= useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [deleting,    setDeleting]    = useState(false);
  const [activeTab,   setActiveTab]   = useState('info');

  const getGenderLabel = (gender) => {
    if (gender === 'male')   return t('adminEvent.genderMale');
    if (gender === 'female') return t('adminEvent.genderFemale');
    if (gender === 'other')  return t('adminEvent.genderOther');
    return t('adminEvent.genderUnknown');
  };

  useEffect(() => {
    if (!isNew) {
      api.get(`/events/${id}`).then(r => {
        const { zones: z, ...ev } = r.data;
        setForm({
          ...ev,
          description: ev.description || '',
          event_date: ev.event_date ? new Date(ev.event_date).toISOString().slice(0, 16) : '',
          poster_url: ev.poster_url || '',
          is_featured: Boolean(ev.is_featured),
        });
        setZones(z || []);
        setLayoutJson(ev.layout_json || null);
      }).finally(() => setLoading(false));
      api.get(`/admin/events/${id}/audience`)
        .then(r => setAudience(r.data))
        .catch(() => setAudience(null));
    }
  }, [id, isNew]);

  const set  = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setChecked = k => e => setForm(f => ({ ...f, [k]: e.target.checked }));

  const uploadImage = async (file) => {
    setUploading(true); setError('');
    const fd = new FormData();
    fd.append('image', file);
    try {
      const { data } = await api.post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(f => ({ ...f, poster_url: data.url }));
      setSuccess(t('adminEvent.uploadSuccess'));
    } catch (err) {
      setError(err.response?.data?.error || t('adminEvent.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const saveEvent = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const payload = {
        ...form,
        event_date: new Date(form.event_date).toISOString(),
      };
      if (isNew) {
        const { data } = await api.post('/events', payload);
        navigate(`/admin/events/${data.id}`, { replace: true });
      } else {
        await api.patch(`/events/${id}`, payload);
        setSuccess(t('adminEvent.saveSuccess'));
      }
    } catch (err) {
      setError(err.response?.data?.error || t('adminEvent.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const addZone = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post(`/events/${id}/zones`, {
        ...newZone,
        rows: Number(newZone.rows), cols: Number(newZone.cols), price: Number(newZone.price),
      });
      setZones(prev => [...prev, data.zone]);
      setNewZone({ name: '', rows: '', cols: '', price: '', color: '#3B82F6' });
    } catch (err) {
      setError(err.response?.data?.error || t('adminEvent.addZoneError'));
    }
  };

  const deleteZone = async (zoneId) => {
    await api.delete(`/events/${id}/zones/${zoneId}`);
    setZones(prev => prev.filter(z => z.id !== zoneId));
  };

  const saveLayout = async (zones, stages, canvas) => {
    setSavingLayout(true); setError(''); setSuccess('');
    try {
      const { data } = await api.put(`/events/${id}/layout`, { zones, stages, canvas });
      setZones(data.layout.zones.map(z => ({
        ...z, id: z.dbId ?? z.id, rows: Number(z.rows), cols: Number(z.cols),
      })));
      setLayoutJson(data.layout);
      setSuccess(t('adminEvent.saveLayoutSuccess', {
        zones: data.zones_created,
        seats: zones.reduce((s, z) => s + z.rows * z.cols, 0),
      }));
    } catch (err) {
      setError(err.response?.data?.error || t('adminEvent.saveLayoutError'));
    } finally {
      setSavingLayout(false);
    }
  };

  const deleteEvent = async () => {
    if (!window.confirm(t('adminEvent.deleteConfirm'))) return;
    setDeleting(true);
    try {
      await api.delete(`/events/${id}`);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || t('adminEvent.deleteError'));
      setDeleting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>;

  const TABS = [
    { key: 'info',   label: t('adminEvent.tabInfo') },
    ...(isNew ? [] : [
      { key: 'design',   label: t('adminEvent.tabDesign') },
      { key: 'audience', label: t('adminEvent.tabAudience') },
      { key: 'merch',    label: t('adminEvent.tabMerch') },
    ]),
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-800 transition font-medium">
            {t('adminEvent.backBtn')}
          </button>
          <h1 className="text-xl font-bold text-gray-800">
            {isNew ? t('adminEvent.newEventTitle') : form.title || t('adminEvent.editEventTitle')}
          </h1>
          {!isNew && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              form.status === 'on_sale' ? 'bg-green-50 text-green-700 border border-green-200'
              : form.status === 'ended' ? 'bg-gray-100 text-gray-500'
              : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            }`}>
              {form.status === 'on_sale' ? t('admin.statusOnSale') : form.status === 'ended' ? t('admin.statusEnded') : t('admin.statusDraft')}
            </span>
          )}
        </div>
        {!isNew && (
          <button onClick={deleteEvent} disabled={deleting}
            className="text-sm text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition font-medium">
            {deleting ? t('adminEvent.deletingBtn') : t('adminEvent.deleteBtn')}
          </button>
        )}
      </div>

      {/* Tabs */}
      {TABS.length > 1 && (
        <div className="border-b border-gray-200">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition -mb-px ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Global messages */}
      {error   && <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-3 rounded-xl">{error}</p>}
      {success && <p className="text-emerald-600 text-sm bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl">{success}</p>}

      {/* ── Tab: Info ── */}
      {activeTab === 'info' && (
        <form onSubmit={saveEvent} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-5">
          <h2 className="font-semibold border-b border-gray-200 pb-3 text-gray-700">{t('adminEvent.infoSectionTitle')}</h2>

          <Field label={`${t('adminEvent.titleLabel')} *`} value={form.title} onChange={set('title')} required />
          <Field label={t('adminEvent.descLabel')} value={form.description} onChange={set('description')} as="textarea" />
          <Field label={`${t('adminEvent.venueLabel')} *`} value={form.venue} onChange={set('venue')} required />
          <Field label={`${t('adminEvent.dateLabel')} *`} type="datetime-local" value={form.event_date} onChange={set('event_date')} required />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-medium">{t('adminEvent.categoryLabel')}</label>
              <select value={form.category} onChange={set('category')}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800">
                {CATEGORY_VALUES.map(v => (
                  <option key={v} value={v}>{t(`event.categories.${v}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-medium">{t('adminEvent.statusLabel')}</label>
              <select value={form.status} onChange={set('status')}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800">
                <option value="draft">{t('admin.statusDraft')}</option>
                <option value="on_sale">{t('admin.statusOnSale')}</option>
                <option value="ended">{t('admin.statusEnded')}</option>
              </select>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(form.is_featured)}
              onChange={setChecked('is_featured')}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              <span className="block font-semibold text-gray-800">{t('adminEvent.featuredLabel')}</span>
              <span className="block text-xs text-gray-500">{t('adminEvent.featuredDesc')}</span>
            </span>
          </label>

          {/* Poster upload */}
          <div>
            <label className="block text-sm text-gray-600 mb-2 font-medium">{t('adminEvent.posterLabel')}</label>
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input value={form.poster_url} onChange={set('poster_url')}
                  placeholder={t('adminEvent.posterPlaceholder')}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-800" />
              </div>
              <button type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-gray-100 hover:bg-gray-200 border border-gray-300 px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap disabled:opacity-50 text-gray-700">
                {uploading ? t('adminEvent.uploadingBtn') : t('adminEvent.uploadBtn')}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files[0] && uploadImage(e.target.files[0])} />
            </div>
            {form.poster_url && (
              <img src={form.poster_url} alt="Preview"
                className="mt-3 h-32 rounded-xl object-cover border border-gray-200" />
            )}
          </div>

          <button type="submit" disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-lg shadow-blue-500/25">
            {saving ? t('adminEvent.savingBtn') : isNew ? t('adminEvent.createBtn') : t('adminEvent.saveBtn')}
          </button>
        </form>
      )}

      {/* ── Tab: Design ── */}
      {activeTab === 'design' && !isNew && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-200">
            <div>
              <h2 className="font-bold text-gray-800 text-base">{t('adminEvent.designTitle')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{t('adminEvent.designHint')}</p>
            </div>
            {zones.length > 0 && (
              <div className="text-right text-xs text-gray-400">
                <p className="font-semibold text-gray-700">
                  {zones.length} {t('adminEvent.zonesLabel')} · {zones.reduce((s,z)=>s+(z.rows||0)*(z.cols||0),0)} {t('adminEvent.seatsLabel')}
                </p>
                <p>{t('adminEvent.savedInDB')}</p>
              </div>
            )}
          </div>
          <SeatDesigner
            initialLayout={layoutJson}
            onSave={saveLayout}
            saving={savingLayout}
          />
        </div>
      )}

      {/* ── Tab: Audience ── */}
      {activeTab === 'audience' && !isNew && (
        <AudiencePanel audience={audience} t={t} getGenderLabel={getGenderLabel} />
      )}

      {/* ── Tab: Merch ── */}
      {activeTab === 'merch' && !isNew && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">{t('adminEvent.merchTitle')}</h2>
            <Link
              to={`/admin/events/${id}/checkin`}
              className="text-sm bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-lg transition font-medium"
            >
              {t('adminEvent.checkinLink')}
            </Link>
          </div>
          <MerchManager eventId={id} />
        </div>
      )}
    </div>
  );
}

function AudiencePanel({ audience, t, getGenderLabel }) {
  const summary = audience?.summary || {};
  const genderData = (audience?.by_gender || []).map(g => ({
    name: getGenderLabel(g.gender),
    value: Number(g.count || 0),
    color: GENDER_COLORS[g.gender] || GENDER_COLORS.unknown,
  }));
  const ageData = (audience?.by_age || []).map(a => ({
    age: a.age_group,
    count: Number(a.count || 0),
  }));

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">{t('adminEvent.totalTicketsSold')}</p>
          <p className="mt-1 text-3xl font-extrabold text-gray-900">
            {Number(summary.total_tickets || 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">{t('adminEvent.customers')}</p>
          <p className="mt-1 text-3xl font-extrabold text-gray-900">
            {Number(summary.total_customers || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <h2 className="font-semibold mb-4 text-gray-700">{t('adminEvent.genderDist')}</h2>
          {genderData.length === 0 ? (
            <p className="text-gray-400 text-sm">{t('adminEvent.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={genderData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={82}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {genderData.map((entry, i) => <Cell key={entry.name + i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <h2 className="font-semibold mb-4 text-gray-700">{t('adminEvent.ageDist')}</h2>
          {ageData.length === 0 ? (
            <p className="text-gray-400 text-sm">{t('adminEvent.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ageData}>
                <XAxis dataKey="age" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill={AGE_COLOR} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, as, wrapperClass = '', ...props }) {
  const cls = 'w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800';
  return (
    <div className={wrapperClass}>
      <label className="block text-sm text-gray-600 mb-1 font-medium">{label}</label>
      {as === 'textarea'
        ? <textarea {...props} className={cls + ' resize-none h-20'} />
        : <input {...props} className={cls} />}
    </div>
  );
}
