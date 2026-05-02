import { useState, useEffect } from 'react';
import api from '../lib/api.js';

function formatVND(n) {
  return new Intl.NumberFormat('vi-VN').format(Number(n)) + '₫';
}

const EMPTY = { name: '', description: '', price: '', stock: '', image_url: '' };

export default function MerchManager({ eventId }) {
  const [items, setItems]   = useState([]);
  const [form, setForm]     = useState(EMPTY);
  const [editing, setEditing] = useState(null); // merch id being edited
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const fetchItems = () => {
    api.get(`/merchandise/${eventId}`).then(r => setItems(r.data)).catch(() => {});
  };

  useEffect(() => { fetchItems(); }, [eventId]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.stock) { setError('Tên, giá và số lượng là bắt buộc'); return; }
    setSaving(true); setError('');
    const payload = {
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      stock: Number(form.stock),
      image_url: form.image_url || undefined,
    };
    try {
      if (editing) {
        const { data } = await api.patch(`/merchandise/${eventId}/${editing}`, payload);
        setItems(prev => prev.map(m => m.id === editing ? data : m));
        setEditing(null);
      } else {
        const { data } = await api.post(`/merchandise/${eventId}`, payload);
        setItems(prev => [...prev, data]);
      }
      setForm(EMPTY);
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi lưu vật phẩm');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (m) => {
    setEditing(m.id);
    setForm({ name: m.name, description: m.description || '', price: m.price, stock: m.stock, image_url: m.image_url || '' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa vật phẩm này?')) return;
    await api.delete(`/merchandise/${eventId}/${id}`);
    setItems(prev => prev.filter(m => m.id !== id));
  };

  const cancelEdit = () => { setEditing(null); setForm(EMPTY); setError(''); };

  const cls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <div className="space-y-4">
      {/* Existing items */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              {m.image_url
                ? <img src={m.image_url} alt={m.name} className="w-10 h-10 rounded-lg object-cover border" />
                : <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-lg">🎁</div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{m.name}</p>
                <p className="text-xs text-gray-400">{formatVND(m.price)} · Còn {m.stock}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(m)} className="text-xs text-blue-600 hover:underline">Sửa</button>
                <button onClick={() => handleDelete(m.id)} className="text-xs text-red-500 hover:underline">Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="border border-gray-200 bg-gray-50 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">{editing ? 'Chỉnh sửa vật phẩm' : '+ Thêm vật phẩm mới'}</p>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Tên vật phẩm *</label>
            <input value={form.name} onChange={set('name')} placeholder="VD: Lightstick, Áo thun..." className={cls} required />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Giá (VNĐ) *</label>
            <input type="number" min="0" value={form.price} onChange={set('price')} placeholder="VD: 150000" className={cls} required />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Số lượng *</label>
            <input type="number" min="0" value={form.stock} onChange={set('stock')} placeholder="VD: 100" className={cls} required />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Mô tả</label>
            <input value={form.description} onChange={set('description')} placeholder="Mô tả ngắn..." className={cls} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">URL hình ảnh</label>
            <input type="url" value={form.image_url} onChange={set('image_url')} placeholder="https://..." className={cls} />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving}
            className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition">
            {saving ? 'Đang lưu...' : editing ? 'Cập nhật' : '+ Thêm'}
          </button>
          {editing && (
            <button type="button" onClick={cancelEdit} className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2">
              Hủy
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
