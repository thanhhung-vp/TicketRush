import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const FAQS_VI = [
  {
    category: 'Đặt vé',
    items: [
      {
        q: 'Làm thế nào để đặt vé trên TicketRush?',
        a: 'Chọn sự kiện bạn muốn tham dự, chọn khu vực và ghế ngồi trên sơ đồ, nhấn "Giữ ghế", chọn phương thức thanh toán rồi xác nhận. Vé điện tử kèm mã QR sẽ có ngay sau khi thanh toán thành công.',
      },
      {
        q: 'Tôi có thể đặt tối đa bao nhiêu ghế?',
        a: 'Mỗi lần đặt, bạn có thể chọn tối đa 8 ghế. Ghế sẽ được giữ trong 10 phút để bạn hoàn tất thanh toán.',
      },
      {
        q: 'Ghế tôi chọn có bị người khác lấy không?',
        a: 'Không. Khi bạn nhấn "Giữ ghế", hệ thống khóa ghế đó riêng cho bạn trong 10 phút. Nếu bạn không thanh toán đúng hạn, ghế sẽ được mở lại.',
      },
      {
        q: 'Làm sao tôi biết vé đã đặt thành công?',
        a: 'Sau khi thanh toán, bạn sẽ nhận được email xác nhận kèm thông tin đơn hàng. Vé QR cũng xuất hiện trong mục "Vé của tôi" trên tài khoản.',
      },
    ],
  },
  {
    category: 'Thanh toán',
    items: [
      {
        q: 'TicketRush hỗ trợ những phương thức thanh toán nào?',
        a: 'TicketRush hỗ trợ thanh toán mô phỏng cho demo, VNPay và ví điện tử MoMo trong môi trường sandbox. Các giao dịch được xử lý qua kênh thanh toán tương ứng.',
      },
      {
        q: 'Thanh toán thất bại nhưng tiền đã bị trừ thì sao?',
        a: 'Vui lòng liên hệ bộ phận hỗ trợ kèm mã giao dịch và email tài khoản. Với cổng thanh toán thật, thời gian đối soát và hoàn tiền phụ thuộc vào nhà cung cấp thanh toán.',
      },
      {
        q: 'Tôi có thể hủy vé và nhận lại tiền không?',
        a: 'Chính sách hoàn tiền tùy thuộc từng sự kiện. Bạn nên kiểm tra điều khoản sự kiện trước khi đặt vé.',
      },
    ],
  },
  {
    category: 'Vé điện tử',
    items: [
      {
        q: 'Vé QR Code được sử dụng như thế nào?',
        a: 'Tại cổng vào sự kiện, nhân viên sẽ quét mã QR trên điện thoại của bạn. Hãy đảm bảo màn hình đủ sáng. Mỗi mã QR chỉ sử dụng một lần.',
      },
      {
        q: 'Tôi có thể in vé ra giấy không?',
        a: 'Có, bạn có thể tải và in vé QR từ trang "Vé của tôi". Tuy vậy, vé điện tử trên điện thoại thường tiện hơn và giảm rủi ro thất lạc.',
      },
      {
        q: 'Vé điện tử của tôi ở đâu sau khi mua?',
        a: 'Đăng nhập vào TicketRush, vào "Vé của tôi", chọn đơn hàng để xem mã QR từng vé. Bạn cũng có thể tải vé dưới dạng ảnh PNG.',
      },
    ],
  },
  {
    category: 'Tài khoản',
    items: [
      {
        q: 'Tôi cần tài khoản để mua vé không?',
        a: 'Có, bạn cần đăng ký tài khoản để đặt và quản lý vé. Việc đăng ký miễn phí và chỉ mất vài giây.',
      },
      {
        q: 'Quên mật khẩu thì làm gì?',
        a: 'Nhấn "Quên mật khẩu?" trên trang đăng nhập, nhập email của bạn và làm theo hướng dẫn để đặt lại mật khẩu.',
      },
      {
        q: 'Tôi có thể dùng một tài khoản để mua vé cho nhiều người không?',
        a: 'Có. Bạn có thể chọn nhiều ghế trong một lần đặt, tối đa 8 ghế. Mỗi ghế sẽ có một mã QR riêng.',
      },
    ],
  },
  {
    category: 'Sự kiện & vật phẩm',
    items: [
      {
        q: 'Tôi có thể mua vật phẩm cùng với vé không?',
        a: 'Có. Nếu sự kiện có bán vật phẩm như áo, lightstick hoặc album, mục mua thêm sẽ xuất hiện trong bước thanh toán.',
      },
      {
        q: 'Làm sao để nhận thông báo khi sự kiện mở bán vé?',
        a: 'Nhấn biểu tượng trái tim trên trang sự kiện để lưu vào danh sách yêu thích. Hệ thống sẽ thông báo khi sự kiện mở bán.',
      },
      {
        q: 'Trẻ em có được vào không?',
        a: 'Quy định độ tuổi phụ thuộc từng sự kiện. Vui lòng đọc kỹ thông tin sự kiện hoặc liên hệ ban tổ chức để được hỗ trợ.',
      },
    ],
  },
];

const FAQS_EN = [
  {
    category: 'Booking',
    items: [
      {
        q: 'How do I book tickets on TicketRush?',
        a: 'Select an event, choose a zone and seat on the seat map, click "Hold Seat", choose a payment method, then confirm. Your QR e-ticket is issued after successful payment.',
      },
      {
        q: 'How many seats can I book at once?',
        a: 'You can select up to 8 seats per booking. Seats are held for 10 minutes while you complete payment.',
      },
      {
        q: 'Can someone else take the seat I selected?',
        a: 'No. When you hold a seat, the system reserves it for you for 10 minutes. If payment is not completed in time, the seat is released.',
      },
      {
        q: 'How do I know my booking was successful?',
        a: 'After payment, you receive a confirmation email with order details. QR tickets also appear under "My Tickets" in your account.',
      },
    ],
  },
  {
    category: 'Payment',
    items: [
      {
        q: 'What payment methods does TicketRush support?',
        a: 'TicketRush supports simulated demo payment, VNPay, and MoMo in sandbox mode. Transactions are handled by the selected payment provider.',
      },
      {
        q: 'My payment failed but money was deducted. What should I do?',
        a: 'Contact support with your transaction ID and account email. Reconciliation and refund timing depend on the payment provider.',
      },
      {
        q: 'Can I cancel my ticket and get a refund?',
        a: 'Refund policies depend on each event. Please check the event terms before booking.',
      },
    ],
  },
  {
    category: 'E-tickets',
    items: [
      {
        q: 'How do I use my QR code ticket?',
        a: 'At the event entrance, staff scan the QR code on your phone. Keep your screen bright enough. Each QR code can be used once.',
      },
      {
        q: 'Can I print my ticket?',
        a: 'Yes, you can download and print your QR ticket from "My Tickets", though using the phone ticket is usually more convenient.',
      },
      {
        q: 'Where are my e-tickets after purchase?',
        a: 'Log in, open "My Tickets", and select an order to view each ticket QR code. You can also download tickets as PNG images.',
      },
    ],
  },
  {
    category: 'Account',
    items: [
      {
        q: 'Do I need an account to buy tickets?',
        a: 'Yes, you need an account to book and manage tickets. Registration is free and only takes a few seconds.',
      },
      {
        q: 'What do I do if I forget my password?',
        a: 'Click "Forgot password?" on the login page, enter your email, and follow the reset instructions.',
      },
      {
        q: 'Can I use one account to buy tickets for multiple people?',
        a: 'Yes. You can select multiple seats in one booking, up to 8 seats. Each seat gets its own QR code.',
      },
    ],
  },
  {
    category: 'Events & Merchandise',
    items: [
      {
        q: 'Can I buy merchandise together with my ticket?',
        a: 'Yes. If an event sells merchandise, the add-on section appears during checkout.',
      },
      {
        q: 'How can I get notified when an event goes on sale?',
        a: 'Click the heart icon on the event page to save it to your wishlist. You will be notified when tickets go on sale.',
      },
      {
        q: 'Are children allowed to attend?',
        a: 'Age requirements depend on each event. Please read the event details or contact the organizer for support.',
      },
    ],
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-separator last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-start justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-medium text-label-primary">{q}</span>
        <span className={`shrink-0 text-lg text-label-secondary transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-label-secondary">{a}</p>
      )}
    </div>
  );
}

export default function FAQPage() {
  const { t, i18n } = useTranslation();
  const FAQS = i18n.language === 'vi' ? FAQS_VI : FAQS_EN;
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="mb-2 text-3xl font-bold text-label-primary">{t('faq.title')}</h1>
        <p className="text-label-secondary">{t('faq.subtitle')}</p>
      </div>

      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {FAQS.map((g, idx) => (
          <button
            key={g.category}
            onClick={() => setActiveIdx(idx)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeIdx === idx
                ? 'bg-accent text-white'
                : 'bg-fill-tertiary text-label-secondary hover:bg-fill-quaternary hover:text-label-primary'
            }`}
          >
            {g.category}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-separator bg-surface px-6 py-2 shadow-1">
        {FAQS[activeIdx].items.map((item) => (
          <FAQItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-accent/10 bg-accent-tint p-6 text-center">
        <p className="mb-1 text-sm text-label-secondary">{t('faq.notFound')}</p>
        <p className="font-semibold text-label-primary">
          {t('faq.contactLabel')} <span className="text-accent">support@ticketrush.vn</span>
        </p>
      </div>
    </div>
  );
}
