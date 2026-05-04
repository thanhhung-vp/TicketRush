import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const FAQS_VI = [
  {
    category: 'Đặt vé',
    items: [
      {
        q: 'Làm thế nào để đặt vé trên TicketRush?',
        a: 'Chọn sự kiện bạn muốn tham dự → Chọn khu vực và ghế ngồi trên sơ đồ → Nhấn "Giữ ghế" → Chọn phương thức thanh toán → Xác nhận. Vé điện tử (QR Code) sẽ được gửi ngay sau khi thanh toán thành công.',
      },
      {
        q: 'Tôi có thể đặt tối đa bao nhiêu ghế?',
        a: 'Mỗi lần đặt, bạn có thể chọn tối đa 8 ghế. Ghế sẽ được giữ trong 10 phút để bạn hoàn tất thanh toán.',
      },
      {
        q: 'Ghế tôi chọn có bị người khác lấy không?',
        a: 'Không. Khi bạn nhấn "Giữ ghế", hệ thống sẽ khóa ghế đó dành riêng cho bạn trong 10 phút. Nếu bạn không thanh toán trong thời gian này, ghế sẽ được mở lại.',
      },
      {
        q: 'Làm sao tôi biết vé đã đặt thành công?',
        a: 'Sau khi thanh toán, bạn sẽ nhận được email xác nhận kèm thông tin đơn hàng. Đồng thời, vé QR Code sẽ xuất hiện trong mục "Vé của tôi" trên tài khoản.',
      },
    ],
  },
  {
    category: 'Thanh toán',
    items: [
      {
        q: 'TicketRush hỗ trợ những phương thức thanh toán nào?',
        a: 'Chúng tôi hỗ trợ: Thanh toán mô phỏng (Demo), VNPay (ATM/Internet Banking), và Ví điện tử MoMo. Mọi giao dịch đều được mã hóa bảo mật chuẩn quốc tế.',
      },
      {
        q: 'Thanh toán thất bại nhưng tiền đã bị trừ thì sao?',
        a: 'Trong trường hợp này, tiền sẽ được hoàn trả về tài khoản trong 5-7 ngày làm việc. Vui lòng liên hệ bộ phận hỗ trợ kèm mã giao dịch để được xử lý nhanh nhất.',
      },
      {
        q: 'Tôi có thể hủy vé và nhận lại tiền không?',
        a: 'Chính sách hoàn tiền tùy thuộc vào từng sự kiện. Vui lòng kiểm tra điều khoản sự kiện trước khi đặt vé. Thông thường, vé đã thanh toán sẽ không được hoàn tiền trong vòng 72 giờ trước giờ diễn.',
      },
    ],
  },
  {
    category: 'Vé điện tử',
    items: [
      {
        q: 'Vé QR Code được sử dụng như thế nào?',
        a: 'Tại cổng vào sự kiện, nhân viên sẽ quét mã QR trên điện thoại của bạn. Đảm bảo màn hình điện thoại đủ sáng để quét. Mỗi mã QR chỉ được sử dụng một lần.',
      },
      {
        q: 'Tôi có thể in vé ra giấy không?',
        a: 'Có, bạn có thể tải và in vé QR từ trang "Vé của tôi". Tuy nhiên, chúng tôi khuyến khích dùng vé điện tử trên điện thoại để tiện lợi và bảo vệ môi trường.',
      },
      {
        q: 'Vé điện tử của tôi ở đâu sau khi mua?',
        a: 'Đăng nhập vào TicketRush → Vào "Vé của tôi" → Chọn đơn hàng để xem mã QR từng vé. Bạn cũng có thể tải vé về dưới dạng ảnh PNG.',
      },
    ],
  },
  {
    category: 'Tài khoản',
    items: [
      {
        q: 'Tôi cần tài khoản để mua vé không?',
        a: 'Có, bạn cần đăng ký tài khoản để đặt và quản lý vé. Việc đăng ký hoàn toàn miễn phí và chỉ mất vài giây.',
      },
      {
        q: 'Quên mật khẩu thì làm gì?',
        a: 'Nhấn "Quên mật khẩu?" trên trang đăng nhập, nhập email của bạn và làm theo hướng dẫn để đặt lại mật khẩu.',
      },
      {
        q: 'Tôi có thể dùng một tài khoản để mua vé cho nhiều người không?',
        a: 'Có. Bạn có thể chọn nhiều ghế trong một lần đặt (tối đa 8 ghế). Mỗi ghế sẽ có một mã QR riêng biệt.',
      },
    ],
  },
  {
    category: 'Sự kiện & Vật phẩm',
    items: [
      {
        q: 'Tôi có thể mua vật phẩm (merchandise) cùng với vé không?',
        a: 'Có! Trong bước thanh toán, nếu sự kiện có bán merchandise (lightstick, áo thun, album...), bạn sẽ thấy mục "Mua thêm vật phẩm" để thêm vào đơn hàng.',
      },
      {
        q: 'Làm sao để nhận thông báo khi sự kiện mở bán vé?',
        a: 'Nhấn biểu tượng trái tim ❤️ trên trang sự kiện để lưu vào danh sách yêu thích. Hệ thống sẽ thông báo khi sự kiện mở bán.',
      },
      {
        q: 'Trẻ em có được vào không?',
        a: 'Quy định về độ tuổi phụ thuộc vào từng sự kiện. Vui lòng đọc kỹ thông tin sự kiện hoặc liên hệ ban tổ chức để được hỗ trợ.',
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
        a: 'Select the event you want to attend → Choose a zone and seat on the seat map → Click "Hold Seat" → Select a payment method → Confirm. Your e-ticket (QR Code) will be delivered instantly after successful payment.',
      },
      {
        q: 'How many seats can I book at once?',
        a: 'You can select up to 8 seats per booking. Seats are held for 10 minutes for you to complete payment.',
      },
      {
        q: 'Can someone else take the seat I selected?',
        a: 'No. When you click "Hold Seat", the system locks that seat exclusively for you for 10 minutes. If you do not complete payment in time, the seat is released.',
      },
      {
        q: 'How do I know my booking was successful?',
        a: 'After payment, you will receive a confirmation email with your order details. Your QR e-tickets will also appear under "My Tickets" in your account.',
      },
    ],
  },
  {
    category: 'Payment',
    items: [
      {
        q: 'What payment methods does TicketRush support?',
        a: 'We support: Simulated payment (Demo), VNPay (ATM/Internet Banking), and MoMo e-wallet. All transactions are encrypted to international security standards.',
      },
      {
        q: 'My payment failed but money was deducted — what should I do?',
        a: 'In this case, the amount will be refunded to your account within 5–7 business days. Please contact support with your transaction ID for faster resolution.',
      },
      {
        q: 'Can I cancel my ticket and get a refund?',
        a: 'Refund policies depend on each event. Please check the event terms before booking. Generally, tickets paid for within 72 hours before the event are non-refundable.',
      },
    ],
  },
  {
    category: 'E-Tickets',
    items: [
      {
        q: 'How do I use my QR Code ticket?',
        a: 'At the event entrance, staff will scan the QR code on your phone. Make sure your screen brightness is high enough for scanning. Each QR code can only be used once.',
      },
      {
        q: 'Can I print my ticket?',
        a: 'Yes, you can download and print your QR ticket from "My Tickets". However, we encourage using the digital ticket on your phone for convenience and environmental reasons.',
      },
      {
        q: 'Where are my e-tickets after purchase?',
        a: 'Log in to TicketRush → Go to "My Tickets" → Select your order to view the QR code for each ticket. You can also download tickets as PNG images.',
      },
    ],
  },
  {
    category: 'Account',
    items: [
      {
        q: 'Do I need an account to buy tickets?',
        a: 'Yes, you need to register an account to book and manage tickets. Registration is completely free and takes just a few seconds.',
      },
      {
        q: 'What do I do if I forget my password?',
        a: 'Click "Forgot password?" on the login page, enter your email and follow the instructions to reset your password.',
      },
      {
        q: 'Can I use one account to buy tickets for multiple people?',
        a: 'Yes. You can select multiple seats in one booking (up to 8 seats). Each seat will have its own unique QR code.',
      },
    ],
  },
  {
    category: 'Events & Merchandise',
    items: [
      {
        q: 'Can I buy merchandise together with my ticket?',
        a: 'Yes! During checkout, if the event sells merchandise (lightsticks, T-shirts, albums...), you will see an "Add Merchandise" section to include items in your order.',
      },
      {
        q: 'How can I get notified when an event goes on sale?',
        a: 'Click the heart icon ❤️ on the event page to save it to your wishlist. You will be notified when tickets go on sale.',
      },
      {
        q: 'Are children allowed to attend?',
        a: 'Age requirements depend on each event. Please read the event details carefully or contact the organizer for more information.',
      },
    ],
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start justify-between py-4 text-left gap-4"
      >
        <span className="text-sm font-medium text-gray-800">{q}</span>
        <span className={`text-gray-400 text-lg shrink-0 transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <p className="text-sm text-gray-600 pb-4 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function FAQPage() {
  const { t, i18n } = useTranslation();
  const FAQS = i18n.language === 'vi' ? FAQS_VI : FAQS_EN;
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('faq.title')}</h1>
        <p className="text-gray-500">{t('faq.subtitle')}</p>
      </div>

      <div className="flex gap-2 flex-wrap mb-8 justify-center">
        {FAQS.map((g, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIdx(idx)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              activeIdx === idx
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {g.category}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-2">
        {FAQS[activeIdx].items.map((item, i) => (
          <FAQItem key={i} q={item.q} a={item.a} />
        ))}
      </div>

      <div className="mt-10 text-center p-6 bg-primary/5 rounded-2xl border border-primary/10">
        <p className="text-gray-600 text-sm mb-1">{t('faq.notFound')}</p>
        <p className="font-semibold text-gray-900">{t('faq.contactLabel')} <span className="text-primary">support@ticketrush.vn</span></p>
      </div>
    </div>
  );
}
