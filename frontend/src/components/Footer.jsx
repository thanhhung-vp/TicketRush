import { Link } from 'react-router-dom';

const COL1 = [
  { label: 'Về chúng tôi',                   to: '/about' },
  { label: 'Quy chế hoạt động',              to: '/terms' },
  { label: 'Chính sách bảo mật thông tin',   to: '/terms#bao-mat' },
  { label: 'Chính sách bảo mật thanh toán',  to: '/terms#thanh-toan' },
  { label: 'Phương thức thanh toán',          to: '/faq' },
  { label: 'Đối tác của chúng tôi',          to: '/about' },
  { label: 'Điều khoản sử dụng',             to: '/terms' },
];

const COL2 = [
  { label: 'Dành cho Khách hàng', to: '/faq' },
  { label: 'Khuyến mại',          to: '/' },
];

const COL3 = [
  { label: 'Liên hệ chúng tôi',          to: '/faq' },
  { label: 'Câu hỏi thường gặp',         to: '/faq' },
  { label: 'Bài viết liên quan',          to: '/faq' },
  { label: 'Hướng dẫn sử dụng',          to: '/faq' },
  { label: 'Danh sách phản ánh/ góp ý',  to: '/feedback' },
];

function FooterLink({ to, label }) {
  const isExternal = to.startsWith('http');
  if (isExternal) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer"
        className="block text-sm text-gray-400 hover:text-white transition leading-relaxed">
        {label}
      </a>
    );
  }
  return (
    <Link to={to}
      className="block text-sm text-gray-400 hover:text-white transition leading-relaxed">
      {label}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#0f1117' }}>
      {/* ── Main grid ── */}
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Col 0 — Logo + tagline */}
          <div>
            <Link to="/" className="inline-flex items-center gap-0.5 mb-4">
              <span className="text-2xl font-extrabold text-primary">Ticket</span>
              <span className="text-2xl font-extrabold text-white">Rush</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Nền tảng bán vé trực tuyến hàng đầu Việt Nam.<br />
              TicketRush – Mua vé dễ dàng, nâng tầm trải nghiệm.
            </p>
          </div>

          {/* Col 1 — TicketRush xin chào! */}
          <div>
            <h4 className="text-white font-bold text-sm mb-5">TicketRush xin chào!</h4>
            <div className="space-y-3">
              {COL1.map(item => <FooterLink key={item.label} {...item} />)}
            </div>
          </div>

          {/* Col 2 — Dịch vụ và Ưu đãi */}
          <div>
            <h4 className="text-white font-bold text-sm mb-5">Dịch vụ và Ưu đãi</h4>
            <div className="space-y-3">
              {COL2.map(item => <FooterLink key={item.label} {...item} />)}
            </div>
          </div>

          {/* Col 3 — Liên hệ và Hỗ trợ */}
          <div>
            <h4 className="text-white font-bold text-sm mb-5">Liên hệ và Hỗ trợ</h4>
            <div className="space-y-3">
              {COL3.map(item => <FooterLink key={item.label} {...item} />)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Company info ── */}
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-white font-bold text-sm mb-3 tracking-wide">CÔNG TY TNHH TICKETRUSH VIỆT NAM</p>
          <div className="text-xs text-gray-500 space-y-1 leading-relaxed">
            <p>Đại diện theo pháp luật: Đỗ Thành Hưng</p>
            <p>Địa chỉ: 144 Xuân Thủy, Cầu Giấy, Hà Nội, Việt Nam</p>
            <p>Đăng ký kinh doanh số: 0312345678 do Phòng Đăng ký kinh doanh – Sở Kế hoạch và Đầu tư Hà Nội cấp ngày 01/01/2026.</p>
            <p>Hotline: 1800 6789 · Email: support@ticketrush.vn</p>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-center">
          <p className="text-xs text-gray-500">All rights reserved 2026 © TicketRush</p>
        </div>
      </div>
    </footer>
  );
}
