import { Link } from 'react-router-dom';

const STATS = [
  { value: '500+', label: 'Sự kiện mỗi năm' },
  { value: '2M+',  label: 'Vé đã bán' },
  { value: '63',   label: 'Tỉnh/Thành phố' },
  { value: '99%',  label: 'Khách hàng hài lòng' },
];

const VALUES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Tin cậy & Bảo mật',
    desc: 'Mọi giao dịch được mã hóa SSL/TLS 256-bit. Vé điện tử chống giả mạo với mã QR độc nhất.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Nhanh chóng & Tiện lợi',
    desc: 'Đặt vé chỉ trong 60 giây. Nhận vé QR ngay lập tức. Không cần xếp hàng, không cần in ấn.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Công bằng & Minh bạch',
    desc: 'Hệ thống hàng chờ ảo đảm bảo mọi người có cơ hội như nhau. Không có vé ưu tiên ngầm.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: 'Vì người dùng',
    desc: 'Dịch vụ hỗ trợ 7 ngày/tuần. Chính sách hoàn tiền rõ ràng. Luôn lắng nghe phản hồi.',
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">

      {/* Hero */}
      <div className="text-center mb-16">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Về chúng tôi</p>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
          Nền tảng bán vé sự kiện<br />
          <span className="text-primary">hàng đầu Việt Nam</span>
        </h1>
        <p className="text-gray-500 text-base max-w-2xl mx-auto leading-relaxed">
          TicketRush ra đời với sứ mệnh đơn giản hóa trải nghiệm mua vé — từ các concert âm nhạc,
          giải thể thao, đến hội nghị chuyên ngành trên khắp 63 tỉnh thành Việt Nam.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        {STATS.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
            <p className="text-3xl font-extrabold text-primary mb-1">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Story */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-10 mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Câu chuyện của chúng tôi</h2>
        <div className="prose prose-sm max-w-none text-gray-600 space-y-3 leading-relaxed">
          <p>
            TicketRush được thành lập năm 2026 bởi một nhóm kỹ sư và người yêu âm nhạc,
            với nỗi trăn trở về hành trình mua vé phức tạp, chậm chạp và không công bằng
            cho fan tại Việt Nam.
          </p>
          <p>
            Chúng tôi xây dựng nền tảng với công nghệ hàng chờ ảo <em>(waiting room)</em> tiên tiến,
            đảm bảo mọi người có cơ hội mua vé như nhau — dù là fan kỳ cựu hay người mới.
            Vé điện tử QR Code giúp loại bỏ hoàn toàn vé giả và trải nghiệm check-in mượt mà.
          </p>
          <p>
            Đến nay, TicketRush đã phục vụ hơn <strong>2 triệu lượt mua vé</strong> cho hàng trăm
            nghệ sĩ, câu lạc bộ thể thao và ban tổ chức sự kiện trên toàn quốc.
          </p>
        </div>
      </div>

      {/* Values */}
      <h2 className="text-xl font-bold text-gray-900 mb-6">Giá trị cốt lõi</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-14">
        {VALUES.map(v => (
          <div key={v.title} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              {v.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">{v.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Contact CTA */}
      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Hợp tác với TicketRush</h2>
        <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">
          Bạn là ban tổ chức sự kiện, nghệ sĩ hoặc câu lạc bộ thể thao?
          Hãy liên hệ để đưa sự kiện của bạn lên TicketRush.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="mailto:partner@ticketrush.vn"
            className="px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition">
            partner@ticketrush.vn
          </a>
          <Link to="/faq"
            className="px-6 py-2.5 rounded-full border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
            Xem FAQ
          </Link>
        </div>
      </div>
    </div>
  );
}
