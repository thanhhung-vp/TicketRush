import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';

export default function AdminEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [form, setForm] = useState({
    title: '', description: '', venue: '', event_date: '', poster_url: '', status: 'draft',
  });
  const [zones, setZones] = useState([]);
  const [newZone, setNewZone] = useState({ name: '', rows: '', cols: '', price: '', color: '#3B82F6' });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isNew) {
      api.get(`/events/${id}`).then(r => {
        const { zones: z, ...ev } = r.data;
        setForm({
          ...ev,
          event_date: ev.event_date ? new Date(ev.event_date).toISOString().slice(0, 16) : '',
        });
        setZones(z || []);
      }).finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setZ = (k) => (e) => setNewZone(z => ({ ...z, [k]: e.target.value }));

  const saveEvent = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      if (isNew) {
        const { data } = await api.post('/events', form);
        navigate(`/admin/events/${data.id}`, { replace: true });
      } else {
        await api.patch(`/events/${id}`, form);
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
    try {
      const { data } = await api.post(`/events/${id}/zones`, {
        ...newZone, rows: Number(newZone.rows), cols: Number(newZone.cols), price: Number(newZone.price),
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

  if (loading) return <div className="text-center py-20 text-gray-400">Đang tải...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white">← Quay lại</button>
        <h1 className="text-xl font-bold">{isNew ? 'Tạo sự kiện mới' : 'Chỉnh sửa sự kiện'}</h1>
      </div>

      {/* Event form */}
      <form onSubmit={saveEvent} className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
        <h2 className="font-semibold">Thông tin sự kiện</h2>
        {error && <p className="text-red-400 text-sm bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>}
        {success && <p className="text-green-400 text-sm bg-green-950/30 px-3 py-2 rounded-lg">{success}</p>}
        <Field label="Tên sự kiện *" value={form.title} onChange={set('title')} required />
        <Field label="Mô tả" value={form.description} onChange={set('description')} as="textarea" />
        <Field label="Địa điểm *" value={form.venue} onChange={set('venue')} required />
        <Field label="Thời gian *" type="datetime-local" value={form.event_date} onChange={set('event_date')} required />
        <Field label="URL poster" value={form.poster_url} onChange={set('poster_url')} placeholder="https://..." />
        <div>
          <label className="block text-sm text-gray-400 mb-1">Trạng thái</label>
          <select value={form.status} onChange={set('status')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
            <option value="draft">Nháp</option>
            <option value="on_sale">Mở bán</option>
            <option value="ended">Kết thúc</option>
          </select>
        </div>
        <button type="submit" disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition">
          {saving ? 'Đang lưu...' : isNew ? 'Tạo sự kiện' : 'Lưu thay đổi'}
        </button>
      </form>

      {/* Zones (only after event is created) */}
      {!isNew && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
          <h2 className="font-semibold">Khu vực ghế ngồi</h2>
          {zones.length === 0 ? (
            <p className="text-gray-500 text-sm">Chưa có khu vực nào.</p>
          ) : (
            <div className="space-y-2">
              {zones.map(z => (
                <div key={z.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-sm" style={{ backgroundColor: z.color }} />
                    <div>
                      <p className="font-medium">{z.name}</p>
                      <p className="text-xs text-gray-400">{z.rows} hàng × {z.cols} cột = {z.rows * z.cols} ghế</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-blue-400 text-sm font-medium">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(z.price)}
                    </span>
                    <button onClick={() => deleteZone(z.id)} className="text-red-400 hover:text-red-300 text-sm">Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addZone} className="border border-gray-700 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-gray-300">Thêm khu mới</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tên khu (VD: Khu A)" value={newZone.name} onChange={setZ('name')} required maxLength={50} />
              <Field label="Màu" type="color" value={newZone.color} onChange={setZ('color')} />
              <Field label="Số hàng" type="number" min="1" max="50" value={newZone.rows} onChange={setZ('rows')} required />
              <Field label="Ghế/hàng" type="number" min="1" max="50" value={newZone.cols} onChange={setZ('cols')} required />
              <Field label="Giá vé (VNĐ)" type="number" min="1000" step="1000" value={newZone.price} onChange={setZ('price')} required wrapperClass="col-span-2" placeholder="VD: 500000" />
            </div>
            <button type="submit" className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              + Thêm khu
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, as, wrapperClass = '', ...props }) {
  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500';
  return (
    <div className={wrapperClass}>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      {as === 'textarea'
        ? <textarea {...props} className={inputCls + ' resize-none h-20'} />
        : <input {...props} className={inputCls} />}
    </div>
  );
}
