import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api.js';
import MerchManager from '../components/MerchManager.jsx';

const CATEGORIES = [
  { value: 'music',      label: '🎵 Âm nhạc' },
  { value: 'sports',     label: '⚽ Thể thao' },
  { value: 'arts',       label: '🎨 Nghệ thuật' },
  { value: 'conference', label: '🎤 Hội nghị' },
  { value: 'comedy',     label: '😂 Hài kịch' },
  { value: 'festival',   label: '🎪 Lễ hội' },
  { value: 'other',      label: '✨ Khác' },
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
  const [zones,     setZones]     = useState([]);
  const [newZone,   setNewZone]   = useState({ name: '', rows: '', cols: '', price: '', color: '#3B82F6' });
  const [loading,   setLoading]   = useState(!isNew);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [deleting,  setDeleting]  = useState(false);

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-800 transition font-medium">← Quay lại</button>
          <h1 className="text-xl font-bold text-gray-800">{isNew ? 'Tạo sự kiện mới' : 'Chỉnh sửa sự kiện'}</h1>
        </div>
        {!isNew && form.status === 'draft' && (
          <button onClick={deleteEvent} disabled={deleting}
            className="text-sm text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition font-medium">
            {deleting ? 'Đang xóa...' : '🗑 Xóa sự kiện'}
          </button>
        )}
      </div>

      {/* Event form */}
      <form onSubmit={saveEvent} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-5">
        <h2 className="font-semibold border-b border-gray-200 pb-3 text-gray-700">Thông tin sự kiện</h2>

        {error   && <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}
        {success && <p className="text-emerald-600 text-sm bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">{success}</p>}

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

      {/* Zones (only after event is created) */}
      {!isNew && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
          <h2 className="font-semibold border-b border-gray-200 pb-3 text-gray-700">Khu vực ghế ngồi</h2>

          {zones.length === 0 ? (
            <p className="text-gray-400 text-sm">Chưa có khu vực nào.</p>
          ) : (
            <div className="space-y-2">
              {zones.map(z => (
                <div key={z.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-sm flex-shrink-0 shadow-sm" style={{ backgroundColor: z.color }} />
                    <div>
                      <p className="font-medium text-gray-800">{z.name}</p>
                      <p className="text-xs text-gray-500">{z.rows}×{z.cols} = {z.rows * z.cols} ghế</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-blue-600 text-sm font-semibold">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(z.price)}
                    </span>
                    <button onClick={() => deleteZone(z.id)} className="text-red-500 hover:text-red-600 text-sm transition font-medium">
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addZone} className="border border-gray-200 bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Thêm khu mới</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tên khu (VD: Khu VIP)" value={newZone.name} onChange={setZ('name')} required maxLength={50} />
              <Field label="Màu sắc" type="color" value={newZone.color} onChange={setZ('color')} />
              <Field label="Số hàng" type="number" min="1" max="50" value={newZone.rows} onChange={setZ('rows')} required />
              <Field label="Ghế / hàng" type="number" min="1" max="50" value={newZone.cols} onChange={setZ('cols')} required />
              <Field label="Giá vé (VNĐ)" type="number" min="0" step="1000" value={newZone.price} onChange={setZ('price')} required wrapperClass="col-span-2" placeholder="VD: 500000" />
            </div>
            <button type="submit"
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-md shadow-emerald-500/25">
              + Thêm khu
            </button>
          </form>
        </div>
      )}

      {/* Merchandise section */}
      {!isNew && (
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
