import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api.js';
import MerchManager from '../components/MerchManager.jsx';
import SeatDesigner from '../components/SeatDesigner.jsx';

const CATEGORIES = [
  { value: 'music',       label: 'Nhạc sống' },
  { value: 'fan_meeting', label: 'Fan Meeting' },
  { value: 'merchandise', label: 'Merchandise' },
  { value: 'arts',        label: 'Sân khấu & Nghệ thuật' },
  { value: 'sports',      label: 'Thể thao' },
  { value: 'conference',  label: 'Hội thảo & Cộng đồng' },
  { value: 'education',   label: 'Khoá học' },
  { value: 'nightlife',   label: 'Nightlife' },
  { value: 'livestream',  label: 'Livestream' },
  { value: 'travel',      label: 'Tham quan du lịch' },
  { value: 'other',       label: 'Khác' },
];

export default function AdminEventPage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const isNew       = id === 'new';
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '', description: '', venue: '', event_date: '',
    poster_url: '', status: 'draft', category: 'other',
  });
  const [zones,       setZones]       = useState([]);
  const [layoutJson,  setLayoutJson]  = useState(null);
  const [newZone,     setNewZone]     = useState({ name: '', rows: '', cols: '', price: '', color: '#3B82F6' });
  const [loading,     setLoading]     = useState(!isNew);
  const [saving,      setSaving]      = useState(false);
  const [savingLayout,setSavingLayout]= useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [deleting,    setDeleting]    = useState(false);
  const [activeTab,   setActiveTab]   = useState('info'); // 'info' | 'design' | 'merch'

  useEffect(() => {
    if (!isNew) {
      api.get(`/events/${id}`).then(r => {
        const { zones: z, ...ev } = r.data;
        setForm({
          ...ev,
          event_date: ev.event_date ? new Date(ev.event_date).toISOString().slice(0, 16) : '',
          poster_url: ev.poster_url || '',
        });
        setZones(z || []);
        setLayoutJson(ev.layout_json || null);
      }).finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const set  = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setZ = k => e => setNewZone(z => ({ ...z, [k]: e.target.value }));

  const uploadImage = async (file) => {
    setUploading(true); setError('');
    const fd = new FormData();
    fd.append('image', file);
    try {
      const { data } = await api.post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(f => ({ ...f, poster_url: data.url }));
      setSuccess('Ảnh đã được tải lên!');
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi tải ảnh');
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
        setSuccess('Đã lưu thay đổi');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi lưu sự kiện');
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
      setError(err.response?.data?.error || 'Lỗi thêm khu');
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
      setSuccess(`Đã lưu sơ đồ: ${data.zones_created} khu, ${zones.reduce((s,z)=>s+z.rows*z.cols,0)} ghế`);
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi lưu sơ đồ');
    } finally {
      setSavingLayout(false);
    }
  };

  const deleteEvent = async () => {
    if (!window.confirm('Xóa sự kiện này? Hành động không thể hoàn tác.')) return;
    setDeleting(true);
    try {
      await api.delete(`/events/${id}`);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi xóa sự kiện');
      setDeleting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Đang tải...</div>;

  const TABS = [
    { key: 'info',   label: 'Thông tin' },
    ...(isNew ? [] : [
      { key: 'design', label: '🎨 Thiết kế sơ đồ' },
      { key: 'merch',  label: '🛍 Merchandise' },
    ]),
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-800 transition font-medium">← Quay lại</button>
          <h1 className="text-xl font-bold text-gray-800">{isNew ? 'Tạo sự kiện mới' : form.title || 'Chỉnh sửa sự kiện'}</h1>
          {!isNew && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              form.status === 'on_sale' ? 'bg-green-50 text-green-700 border border-green-200'
              : form.status === 'ended' ? 'bg-gray-100 text-gray-500'
              : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            }`}>
              {form.status === 'on_sale' ? 'Đang mở bán' : form.status === 'ended' ? 'Đã kết thúc' : 'Nháp'}
            </span>
          )}
        </div>
        {!isNew && form.status === 'draft' && (
          <button onClick={deleteEvent} disabled={deleting}
            className="text-sm text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition font-medium">
            {deleting ? 'Đang xóa...' : '🗑 Xóa sự kiện'}
          </button>
        )}
      </div>

      {/* Tabs */}
      {TABS.length > 1 && (
        <div className="border-b border-gray-200">
          <div className="flex gap-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-5 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition -mb-px ${
                  activeTab === t.key
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Global messages */}
      {error   && <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-3 rounded-xl">{error}</p>}
      {success && <p className="text-emerald-600 text-sm bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl">{success}</p>}

      {/* ── Tab: Thông tin ── */}
      {activeTab === 'info' && (
        <form onSubmit={saveEvent} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-5">
          <h2 className="font-semibold border-b border-gray-200 pb-3 text-gray-700">Thông tin sự kiện</h2>

          <Field label="Tên sự kiện *" value={form.title} onChange={set('title')} required />
          <Field label="Mô tả" value={form.description} onChange={set('description')} as="textarea" />
          <Field label="Địa điểm *" value={form.venue} onChange={set('venue')} required />
          <Field label="Thời gian *" type="datetime-local" value={form.event_date} onChange={set('event_date')} required />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-medium">Danh mục</label>
              <select value={form.category} onChange={set('category')}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-medium">Trạng thái</label>
              <select value={form.status} onChange={set('status')}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800">
                <option value="draft">Nháp</option>
                <option value="on_sale">Mở bán</option>
                <option value="ended">Kết thúc</option>
              </select>
            </div>
          </div>

          {/* Poster upload */}
          <div>
            <label className="block text-sm text-gray-600 mb-2 font-medium">Ảnh poster</label>
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input value={form.poster_url} onChange={set('poster_url')}
                  placeholder="https://… hoặc tải ảnh lên →"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-800" />
              </div>
              <button type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-gray-100 hover:bg-gray-200 border border-gray-300 px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap disabled:opacity-50 text-gray-700">
                {uploading ? '⏳ Tải lên...' : '📤 Chọn ảnh'}
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
            {saving ? 'Đang lưu...' : isNew ? '+ Tạo sự kiện' : '✓ Lưu thay đổi'}
          </button>
        </form>
      )}

      {/* ── Tab: Thiết kế sơ đồ ── */}
      {activeTab === 'design' && !isNew && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-200">
            <div>
              <h2 className="font-bold text-gray-800 text-base">Thiết kế sơ đồ ghế ngồi</h2>
              <p className="text-xs text-gray-400 mt-0.5">Kéo để di chuyển khu · Kéo góc/cạnh để thay đổi kích thước · Click để chọn và chỉnh thuộc tính</p>
            </div>
            {zones.length > 0 && (
              <div className="text-right text-xs text-gray-400">
                <p className="font-semibold text-gray-700">{zones.length} khu · {zones.reduce((s,z)=>s+(z.rows||0)*(z.cols||0),0)} ghế</p>
                <p>đã lưu trong DB</p>
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

      {/* ── Tab: Merchandise ── */}
      {activeTab === 'merch' && !isNew && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">🛍️ Vật phẩm (Merchandise)</h2>
            <Link
              to={`/admin/events/${id}/checkin`}
              className="text-sm bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-lg transition font-medium"
            >
              ✅ Trang Check-in
            </Link>
          </div>
          <MerchManager eventId={id} />
        </div>
      )}
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
