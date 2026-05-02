import { useState } from 'react';

const TYPES = ['Góp ý sản phẩm', 'Báo lỗi', 'Khiếu nại đơn hàng', 'Hợp tác kinh doanh', 'Khác'];

export default function FeedbackPage() {
  const [form, setForm] = useState({ name: '', email: '', type: '', message: '' });
  const [sent, setSent] = useState(false);

  const handle = (e) => {
    e.preventDefault();
    setSent(true);
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  if (sent) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Cảm ơn bạn!</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Phản hồi của bạn đã được ghi nhận. Chúng tôi sẽ xem xét và phản hồi qua email trong vòng 2 ngày làm việc.
        </p>
        <button onClick={() => { setSent(false); setForm({ name: '', email: '', type: '', message: '' }); }}
          className="px-6 py-2.5 rounded-full border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition">
          Gửi phản hồi khác
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Phản hồi</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Danh sách phản ánh / góp ý</h1>
        <p className="text-sm text-gray-500">
          Ý kiến của bạn giúp TicketRush ngày càng tốt hơn. Chúng tôi đọc mọi phản hồi.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-8">
        <form onSubmit={handle} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5 font-medium">Họ và tên *</label>
              <input type="text" required value={form.name} onChange={set('name')}
                placeholder="Nguyễn Văn A"
                className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300/50 transition placeholder-gray-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5 font-medium">Email *</label>
              <input type="email" required value={form.email} onChange={set('email')}
                placeholder="you@example.com"
                className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300/50 transition placeholder-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5 font-medium">Loại phản hồi *</label>
            <div className="relative">
              <select required value={form.type} onChange={set('type')}
                className="w-full appearance-none bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300/50 transition text-gray-700">
                <option value="">-- Chọn loại phản hồi --</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5 font-medium">Nội dung *</label>
            <textarea required rows={5} value={form.message} onChange={set('message')}
              placeholder="Mô tả chi tiết phản hồi của bạn..."
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300/50 transition placeholder-gray-400 resize-none" />
          </div>

          <button type="submit"
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm transition hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, #f9a8d4, #ec4899)' }}>
            Gửi phản hồi
          </button>
        </form>
      </div>

      {/* Contact info */}
      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Email hỗ trợ', value: 'support@ticketrush.vn' },
          { label: 'Hotline',      value: '1800 6789 (miễn phí)' },
          { label: 'Giờ làm việc', value: 'T2–T7 · 8:00–21:00' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 px-4 py-3 text-center shadow-sm">
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-gray-800">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
