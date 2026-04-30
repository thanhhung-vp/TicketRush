import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-navy text-gray-400 pt-12 pb-8 mt-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Logo + slogan */}
          <div>
            <Link to="/" className="text-xl font-bold inline-block mb-3">
              <span className="text-primary">Ticket</span>
              <span className="text-white">Rush</span>
            </Link>
            <p className="text-sm leading-relaxed">
              Nền tảng mua vé sự kiện trực tuyến hàng đầu Việt Nam.
              Âm nhạc, thể thao, hội nghị và nhiều hơn nữa.
            </p>
          </div>

          {/* Về chúng tôi */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Về chúng tôi</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition">Giới thiệu</Link></li>
              <li><Link to="/" className="hover:text-white transition">Điều khoản sử dụng</Link></li>
              <li><Link to="/" className="hover:text-white transition">Chính sách bảo mật</Link></li>
            </ul>
          </div>

          {/* Hỗ trợ */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Hỗ trợ</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition">Hướng dẫn mua vé</Link></li>
              <li><Link to="/" className="hover:text-white transition">Câu hỏi thường gặp</Link></li>
              <li><Link to="/" className="hover:text-white transition">Chính sách hoàn vé</Link></li>
            </ul>
          </div>

          {/* Liên hệ */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Liên hệ</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">📧 support@ticketrush.vn</li>
              <li className="flex items-center gap-2">📞 1900-xxxx</li>
              <li className="flex items-center gap-2">📍 Hà Nội, Việt Nam</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-500">© 2026 TicketRush. All rights reserved.</p>
          <div className="flex items-center gap-4 text-lg">
            <a href="#" className="hover:text-white transition" title="Facebook">📘</a>
            <a href="#" className="hover:text-white transition" title="Instagram">📸</a>
            <a href="#" className="hover:text-white transition" title="YouTube">🎬</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
