import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 text-gray-600 pt-12 pb-8 mt-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Logo + slogan */}
          <div>
            <Link to="/" className="text-xl font-bold inline-block mb-3">
              <span className="text-primary">Ticket</span>
              <span className="text-gray-900">Rush</span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-500">
              Nền tảng mua vé sự kiện trực tuyến hàng đầu Việt Nam.
              Âm nhạc, thể thao, hội nghị và nhiều hơn nữa.
            </p>
          </div>

          {/* Về chúng tôi */}
          <div>
            <h4 className="text-gray-900 font-bold mb-4 text-sm uppercase tracking-wide">Về chúng tôi</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-primary transition">Giới thiệu</Link></li>
              <li><Link to="/" className="hover:text-primary transition">Điều khoản sử dụng</Link></li>
              <li><Link to="/" className="hover:text-primary transition">Chính sách bảo mật</Link></li>
            </ul>
          </div>

          {/* Hỗ trợ */}
          <div>
            <h4 className="text-gray-900 font-bold mb-4 text-sm uppercase tracking-wide">Hỗ trợ</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-primary transition">Hướng dẫn mua vé</Link></li>
              <li><Link to="/" className="hover:text-primary transition">Câu hỏi thường gặp</Link></li>
              <li><Link to="/" className="hover:text-primary transition">Chính sách hoàn vé</Link></li>
            </ul>
          </div>

          {/* Liên hệ */}
          <div>
            <h4 className="text-gray-900 font-bold mb-4 text-sm uppercase tracking-wide">Liên hệ</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-lg">📧</span> support@ticketrush.vn
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">📞</span> 1900-xxxx
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">📍</span> Hà Nội, Việt Nam
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-500">© 2026 TicketRush. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xl">
            <a href="#" className="hover:text-blue-600 transition opacity-80 hover:opacity-100" title="Facebook">📘</a>
            <a href="#" className="hover:text-pink-600 transition opacity-80 hover:opacity-100" title="Instagram">📸</a>
            <a href="#" className="hover:text-red-600 transition opacity-80 hover:opacity-100" title="YouTube">🎬</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
