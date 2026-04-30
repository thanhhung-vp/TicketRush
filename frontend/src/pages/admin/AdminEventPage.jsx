import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventService } from '../../services/event.service.js';
import { adminService } from '../../services/admin.service.js';
import { Button, Input, Select, Alert } from '../../components/ui/index.js';
import { PageSpinner } from '../../components/ui/index.js';
import { PageContainer } from '../../components/layout/PageContainer.jsx';
import { CATEGORIES } from '../../utils/constants.js';
import { formatVND } from '../../utils/format.js';

export default function AdminEventPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isNew    = id === 'new';
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title:       '',
    description: '',
    venue:       '',
    event_date:  '',
    poster_url:  '',
    status:      'draft',
    category:    'other',
  });
  const [zones,     setZones]     = useState([]);
  const [newZone,   setNewZone]   = useState({ name: '', rows: '', cols: '', price: '', color: '#3B82F6' });
  const [loading,   setLoading]   = useState(!isNew);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  useEffect(() => {
    if (!isNew) {
      eventService.getById(id)
        .then(ev => {
          const { zones: z, ...rest } = ev;
          setForm({
            ...rest,
            event_date: rest.event_date
              ? new Date(rest.event_date).toISOString().slice(0, 16)
              : '',
            poster_url: rest.poster_url || '',
          });
          setZones(z || []);
        })
        .catch(() => setError('Không thể tải thông tin sự kiện.'))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const set  = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setZ = (k) => (e) => setNewZone(z => ({ ...z, [k]: e.target.value }));

  const uploadPoster = async (file) => {
    setUploading(true);
    setError('');
    try {
      const data = await adminService.uploadImage(file);
      setForm(f => ({ ...f, poster_url: data.url }));
      setSuccess('Ảnh đã được tải lên!');
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi tải ảnh lên');
    } finally {
      setUploading(false);
    }
  };

  const saveEvent = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...form,
        event_date: new Date(form.event_date).toISOString(),
      };
      if (isNew) {
        const data = await eventService.create(payload);
        navigate(`/admin/events/${data.id}`, { replace: true });
      } else {
        await eventService.update(id, payload);
        setSuccess('Đã lưu thay đổi thành công.');
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
      const data = await eventService.addZone(id, {
        ...newZone,
        rows:  Number(newZone.rows),
        cols:  Number(newZone.cols),
        price: Number(newZone.price),
      });
      setZones(prev => [...prev, data.zone ?? data]);
      setNewZone({ name: '', rows: '', cols: '', price: '', color: '#3B82F6' });
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi thêm khu vực');
    }
  };

  const deleteZone = async (zoneId) => {
    try {
      await eventService.removeZone(id, zoneId);
      setZones(prev => prev.filter(z => z.id !== zoneId));
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi xóa khu vực');
    }
  };

  const deleteEvent = async () => {
    if (!window.confirm('Xóa sự kiện này? Hành động không thể hoàn tác.')) return;
    setDeleting(true);
    try {
      await eventService.remove(id);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi xóa sự kiện');
      setDeleting(false);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <PageContainer maxWidth="max-w-3xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="text-gray-400 hover:text-white transition text-sm"
          >
            Quay lại
          </button>
          <h1 className="text-xl font-bold">
            {isNew ? 'Tạo sự kiện mới' : 'Chỉnh sửa sự kiện'}
          </h1>
        </div>
        {!isNew && form.status === 'draft' && (
          <Button
            variant="danger"
            onClick={deleteEvent}
            disabled={deleting}
            className="text-sm"
          >
            {deleting ? 'Đang xóa...' : 'Xóa sự kiện'}
          </Button>
        )}
      </div>

      {/* Event form */}
      <form onSubmit={saveEvent} className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-5 mb-8">
        <h2 className="font-semibold border-b border-gray-800 pb-3 text-gray-200">
          Thông tin sự kiện
        </h2>

        {error   && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <FormField label="Tên sự kiện *">
          <Input
            type="text"
            required
            value={form.title}
            onChange={set('title')}
            placeholder="VD: Đêm nhạc Acoustic 2026"
          />
        </FormField>

        <FormField label="Mô tả">
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            placeholder="Mô tả chi tiết về sự kiện..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 resize-none text-sm"
          />
        </FormField>

        <FormField label="Địa điểm *">
          <Input
            type="text"
            required
            value={form.venue}
            onChange={set('venue')}
            placeholder="VD: Nhà hát Lớn, Hà Nội"
          />
        </FormField>

        <FormField label="Thời gian *">
          <Input
            type="datetime-local"
            required
            value={form.event_date}
            onChange={set('event_date')}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Danh mục">
            <Select value={form.category} onChange={set('category')}>
              {CATEGORIES.filter(c => c.value !== '').map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Trạng thái">
            <Select value={form.status} onChange={set('status')}>
              <option value="draft">Nháp</option>
              <option value="on_sale">Mở bán</option>
              <option value="ended">Kết thúc</option>
            </Select>
          </FormField>
        </div>

        {/* Poster upload */}
        <FormField label="Ảnh poster">
          <div className="flex gap-3 items-start">
            <Input
              type="text"
              value={form.poster_url}
              onChange={set('poster_url')}
              placeholder="https://… hoặc tải ảnh lên"
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-shrink-0"
            >
              {uploading ? 'Đang tải...' : 'Chọn ảnh'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files[0] && uploadPoster(e.target.files[0])}
            />
          </div>
          {form.poster_url && (
            <img
              src={form.poster_url}
              alt="Poster preview"
              className="mt-3 h-32 rounded-xl object-cover border border-gray-700"
            />
          )}
        </FormField>

        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? 'Đang lưu...' : isNew ? 'Tạo sự kiện' : 'Lưu thay đổi'}
        </Button>
      </form>

      {/* Zone management (only after event is created) */}
      {!isNew && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-5">
          <h2 className="font-semibold border-b border-gray-800 pb-3 text-gray-200">
            Khu vực ghế ngồi
          </h2>

          {/* Existing zones */}
          {zones.length === 0 ? (
            <p className="text-gray-500 text-sm">Chưa có khu vực nào. Thêm khu bên dưới.</p>
          ) : (
            <div className="space-y-2">
              {zones.map(z => (
                <div
                  key={z.id}
                  className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: z.color }}
                    />
                    <div>
                      <p className="font-medium text-sm">{z.name}</p>
                      <p className="text-xs text-gray-400">
                        {z.rows} hàng × {z.cols} ghế = {z.rows * z.cols} ghế
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-blue-400 text-sm font-medium">
                      {formatVND(z.price)}
                    </span>
                    <button
                      onClick={() => deleteZone(z.id)}
                      className="text-red-400 hover:text-red-300 text-sm transition"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add zone form */}
          <form
            onSubmit={addZone}
            className="border border-gray-700 rounded-xl p-4 space-y-4"
          >
            <p className="text-sm font-medium text-gray-300">Thêm khu vực mới</p>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tên khu *">
                <Input
                  type="text"
                  required
                  maxLength={50}
                  value={newZone.name}
                  onChange={setZ('name')}
                  placeholder="VD: Khu VIP"
                />
              </FormField>

              <FormField label="Màu sắc">
                <input
                  type="color"
                  value={newZone.color}
                  onChange={setZ('color')}
                  className="w-full h-10 bg-gray-800 border border-gray-700 rounded-xl px-2 cursor-pointer"
                />
              </FormField>

              <FormField label="Số hàng *">
                <Input
                  type="number"
                  required
                  min={1}
                  max={50}
                  value={newZone.rows}
                  onChange={setZ('rows')}
                  placeholder="VD: 10"
                />
              </FormField>

              <FormField label="Ghế / hàng *">
                <Input
                  type="number"
                  required
                  min={1}
                  max={50}
                  value={newZone.cols}
                  onChange={setZ('cols')}
                  placeholder="VD: 20"
                />
              </FormField>

              <div className="col-span-2">
                <FormField label="Giá vé (VND) *">
                  <Input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={newZone.price}
                    onChange={setZ('price')}
                    placeholder="VD: 500000"
                  />
                </FormField>
              </div>
            </div>

            <Button type="submit" variant="success">
              Thêm khu vực
            </Button>
          </form>
        </div>
      )}
    </PageContainer>
  );
}

function FormField({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}
