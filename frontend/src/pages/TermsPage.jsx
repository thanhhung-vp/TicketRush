import { useEffect, useRef, useState } from 'react';

const SECTIONS = [
  { id: 'gioi-thieu',       label: 'I. Giới thiệu' },
  { id: 'tai-khoan',        label: 'II. Đăng ký tài khoản' },
  { id: 'mua-ve',           label: 'III. Mua vé sự kiện' },
  { id: 'thanh-toan',       label: 'IV. Thanh toán' },
  { id: 'huy-hoan-tien',    label: 'V. Hủy & Hoàn tiền' },
  { id: 'bao-mat',          label: 'VI. Bảo mật thông tin' },
  { id: 'quyen-nghia-vu',   label: 'VII. Quyền & Nghĩa vụ' },
  { id: 'tranh-chap',       label: 'VIII. Giải quyết tranh chấp' },
  { id: 'lien-he',          label: 'IX. Liên hệ' },
];

function Section({ id, title, children }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">{title}</h2>
      <div className="space-y-3 text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}

function Sub({ title, children }) {
  return (
    <div className="mt-4">
      {title && <h3 className="font-semibold text-gray-700 mb-1.5">{title}</h3>}
      {children}
    </div>
  );
}

function Li({ items }) {
  return (
    <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

export default function TermsPage() {
  const [active, setActive] = useState('gioi-thieu');
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-gray-200">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">TicketRush</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Điều khoản sử dụng dịch vụ</h1>
        <p className="text-sm text-gray-500">Cập nhật lần cuối: 01/05/2026 · Có hiệu lực từ 01/01/2026</p>
      </div>

      <div className="flex gap-8 items-start">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-24 self-start">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Mục lục</p>
          <nav className="space-y-0.5">
            {SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`block w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                  active === id
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-8">

          <Section id="gioi-thieu" title="I. Giới thiệu">
            <Sub title="1. Thông tin doanh nghiệp">
              <p>
                TicketRush là nền tảng đặt vé sự kiện trực tuyến được vận hành bởi <strong>Công ty TNHH TicketRush Việt Nam</strong>.
                Chúng tôi cung cấp dịch vụ trung gian kết nối người mua vé với ban tổ chức sự kiện trên toàn quốc.
              </p>
              <p className="mt-2">
                Đại diện pháp luật: <strong>Đỗ Thành Hưng</strong><br/>
                Địa chỉ: 144 Xuân Thủy, Cầu Giấy, Hà Nội, Việt Nam<br/>
                Hotline: 1800 6789 (miễn phí) · Email: support@ticketrush.vn
              </p>
            </Sub>
            <Sub title="2. Phạm vi áp dụng">
              <p>
                Bằng việc truy cập và sử dụng website <strong>ticketrush.vn</strong> hoặc ứng dụng TicketRush,
                bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ toàn bộ các điều khoản được quy định trong tài liệu này.
                Nếu bạn không đồng ý, vui lòng ngừng sử dụng dịch vụ.
              </p>
            </Sub>
            <Sub title="3. Hàng hóa và dịch vụ">
              <p>TicketRush cung cấp các dịch vụ chính bao gồm:</p>
              <Li items={[
                'Đặt vé điện tử (e-ticket) cho các sự kiện âm nhạc, thể thao, lễ hội, hội nghị',
                'Quản lý vé và đơn hàng qua tài khoản cá nhân',
                'Hệ thống xếp hàng ảo (waiting room) cho sự kiện hot',
                'Mua thêm vật phẩm (merchandise) kèm vé',
                'Dịch vụ check-in QR Code tại cổng sự kiện',
              ]} />
            </Sub>
          </Section>

          <Section id="tai-khoan" title="II. Đăng ký tài khoản">
            <Sub title="1. Điều kiện đăng ký">
              <p>Người dùng phải đáp ứng các điều kiện sau để tạo tài khoản TicketRush:</p>
              <Li items={[
                'Từ 15 tuổi trở lên (dưới 18 tuổi cần sự đồng ý của người giám hộ)',
                'Cung cấp địa chỉ email hợp lệ và chưa được sử dụng trên hệ thống',
                'Đồng ý với Điều khoản sử dụng và Chính sách bảo mật này',
              ]} />
            </Sub>
            <Sub title="2. Trách nhiệm bảo mật tài khoản">
              <p>
                Người dùng có trách nhiệm bảo mật thông tin đăng nhập (email và mật khẩu) của mình.
                TicketRush không chịu trách nhiệm về các tổn thất phát sinh do việc bạn chia sẻ thông tin tài khoản với bên thứ ba.
                Vui lòng thông báo ngay cho chúng tôi nếu phát hiện tài khoản bị truy cập trái phép.
              </p>
            </Sub>
            <Sub title="3. Đặt lại mật khẩu">
              <p>
                Khi quên mật khẩu, hệ thống sẽ gửi mã OTP 6 chữ số về email đăng ký.
                Mã này có hiệu lực trong <strong>15 phút</strong> kể từ thời điểm gửi.
                Mỗi mã chỉ sử dụng được một lần. Sau khi đặt lại thành công, tất cả phiên đăng nhập cũ sẽ bị hủy.
              </p>
            </Sub>
            <Sub title="4. Đình chỉ và xóa tài khoản">
              <p>
                TicketRush có quyền tạm khóa hoặc xóa vĩnh viễn tài khoản mà không cần báo trước trong các trường hợp:
                vi phạm điều khoản sử dụng, cung cấp thông tin sai lệch, thực hiện hành vi gian lận,
                hoặc lạm dụng hệ thống đặt vé.
              </p>
            </Sub>
          </Section>

          <Section id="mua-ve" title="III. Mua vé sự kiện">
            <Sub title="1. Quy trình đặt vé">
              <p>Quy trình mua vé trên TicketRush diễn ra theo các bước:</p>
              <ol className="list-decimal list-inside space-y-1 pl-2">
                <li>Chọn sự kiện và khu vực ghế ngồi trên sơ đồ</li>
                <li>Nhấn "Giữ ghế" — hệ thống khóa ghế dành riêng cho bạn trong <strong>10 phút</strong></li>
                <li>Chọn phương thức thanh toán và hoàn tất giao dịch</li>
                <li>Nhận vé QR Code qua email và trong mục "Vé của tôi"</li>
              </ol>
            </Sub>
            <Sub title="2. Giới hạn số lượng">
              <p>
                Mỗi tài khoản được phép mua tối đa <strong>8 ghế</strong> cho mỗi sự kiện.
                Giới hạn này nhằm đảm bảo công bằng cho tất cả người mua và ngăn chặn hành vi đầu cơ vé.
                TicketRush có quyền hủy các đơn hàng vi phạm giới hạn này.
              </p>
            </Sub>
            <Sub title="3. Hệ thống xếp hàng ảo">
              <p>
                Đối với các sự kiện có lượng truy cập cao, TicketRush áp dụng hệ thống waiting room (phòng chờ ảo).
                Người dùng sẽ được cấp số thứ tự ngẫu nhiên và phải chờ đến lượt của mình.
                Thời gian chờ phụ thuộc vào lượng người truy cập và không được đảm bảo.
              </p>
            </Sub>
            <Sub title="4. Vé điện tử (e-ticket)">
              <p>
                Sau khi thanh toán thành công, vé điện tử ở định dạng QR Code sẽ được cấp ngay lập tức.
                Mỗi mã QR chỉ được quét một lần tại cổng vào. Người dùng có thể:
              </p>
              <Li items={[
                'Xem và tải vé trong mục "Vé của tôi" trên website',
                'Nhận vé qua email xác nhận đơn hàng',
                'Tải ảnh QR về điện thoại để trình tại cổng',
              ]} />
            </Sub>
          </Section>

          <Section id="thanh-toan" title="IV. Thanh toán">
            <Sub title="1. Phương thức thanh toán">
              <p>TicketRush hỗ trợ các phương thức thanh toán sau:</p>
              <Li items={[
                'Thanh toán mô phỏng (Demo mode — dành cho môi trường thử nghiệm)',
                'VNPay — ATM nội địa và Internet Banking',
                'Ví điện tử MoMo',
                'Thẻ Visa/Mastercard quốc tế (qua cổng thanh toán bảo mật)',
              ]} />
            </Sub>
            <Sub title="2. Bảo mật giao dịch">
              <p>
                Mọi giao dịch thanh toán đều được mã hóa theo tiêu chuẩn <strong>SSL/TLS 256-bit</strong>.
                TicketRush không lưu trữ thông tin thẻ tín dụng của người dùng.
                Tất cả dữ liệu thanh toán được xử lý bởi đối tác cổng thanh toán được cấp phép.
              </p>
            </Sub>
            <Sub title="3. Xác nhận đơn hàng">
              <p>
                Email xác nhận đơn hàng sẽ được gửi trong vòng <strong>5 phút</strong> sau khi thanh toán thành công.
                Nếu không nhận được email, vui lòng kiểm tra thư mục spam hoặc liên hệ bộ phận hỗ trợ.
                Đơn hàng chỉ được coi là hoàn tất khi trạng thái hiển thị "Đã thanh toán" trong tài khoản.
              </p>
            </Sub>
          </Section>

          <Section id="huy-hoan-tien" title="V. Hủy & Hoàn tiền">
            <Sub title="1. Chính sách hoàn tiền theo thời gian">
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Thời điểm hủy</th>
                      <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Mức hoàn tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Trên 7 ngày trước sự kiện', '100% giá vé (trừ phí dịch vụ)'],
                      ['3–7 ngày trước sự kiện', '70% giá vé'],
                      ['1–3 ngày trước sự kiện', '50% giá vé'],
                      ['Dưới 24 giờ trước sự kiện', 'Không hoàn tiền'],
                      ['Sau khi sự kiện diễn ra', 'Không hoàn tiền'],
                    ].map(([time, amount]) => (
                      <tr key={time} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-3 py-2">{time}</td>
                        <td className="border border-gray-200 px-3 py-2">{amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-2">* Chính sách hoàn tiền có thể khác nhau tùy theo quy định của từng ban tổ chức sự kiện.</p>
            </Sub>
            <Sub title="2. Trường hợp sự kiện bị hủy hoặc hoãn">
              <p>
                Nếu sự kiện bị hủy bởi ban tổ chức, TicketRush sẽ hoàn trả <strong>100% giá trị vé</strong>
                (bao gồm cả phí dịch vụ) trong vòng <strong>5–10 ngày làm việc</strong>.
                Trong trường hợp sự kiện được dời ngày, vé vẫn còn hiệu lực cho ngày mới.
                Người dùng có thể yêu cầu hoàn tiền trong vòng 72 giờ kể từ khi có thông báo hoãn.
              </p>
            </Sub>
            <Sub title="3. Quy trình yêu cầu hoàn tiền">
              <p>Để yêu cầu hoàn tiền, người dùng cần:</p>
              <Li items={[
                'Liên hệ bộ phận hỗ trợ qua email support@ticketrush.vn',
                'Cung cấp mã đơn hàng và lý do yêu cầu hoàn tiền',
                'Hoàn tiền được xử lý về tài khoản ngân hàng gốc trong 5–10 ngày làm việc',
              ]} />
            </Sub>
          </Section>

          <Section id="bao-mat" title="VI. Bảo mật thông tin">
            <Sub title="1. Thông tin thu thập">
              <p>TicketRush thu thập các thông tin sau khi người dùng đăng ký và sử dụng dịch vụ:</p>
              <Li items={[
                'Thông tin cá nhân: họ tên, ngày sinh, giới tính',
                'Thông tin liên lạc: địa chỉ email',
                'Thông tin giao dịch: lịch sử mua vé, phương thức thanh toán',
                'Thông tin thiết bị: địa chỉ IP, trình duyệt, hệ điều hành',
              ]} />
            </Sub>
            <Sub title="2. Mục đích sử dụng thông tin">
              <p>Thông tin được thu thập nhằm mục đích:</p>
              <Li items={[
                'Cung cấp và cải thiện dịch vụ đặt vé',
                'Gửi xác nhận đơn hàng và thông báo vé',
                'Hỗ trợ khách hàng và giải quyết tranh chấp',
                'Phòng chống gian lận và bảo mật hệ thống',
                'Tuân thủ yêu cầu pháp lý của cơ quan nhà nước',
              ]} />
            </Sub>
            <Sub title="3. Cam kết bảo mật">
              <p>
                TicketRush cam kết không bán, cho thuê hoặc tiết lộ thông tin cá nhân của người dùng
                cho bên thứ ba vì mục đích thương mại mà không có sự đồng ý của người dùng,
                trừ khi được yêu cầu bởi cơ quan pháp luật có thẩm quyền.
              </p>
            </Sub>
            <Sub title="4. Thời gian lưu trữ">
              <p>
                Thông tin cá nhân được lưu trữ trong suốt thời gian tài khoản còn hoạt động và thêm
                <strong> 3 năm</strong> sau khi tài khoản bị xóa, nhằm mục đích giải quyết tranh chấp phát sinh.
                Dữ liệu giao dịch được lưu trữ theo quy định của pháp luật về kế toán và thuế.
              </p>
            </Sub>
          </Section>

          <Section id="quyen-nghia-vu" title="VII. Quyền & Nghĩa vụ">
            <Sub title="1. Quyền của người dùng">
              <Li items={[
                'Truy cập và xem thông tin cá nhân đã cung cấp cho TicketRush',
                'Yêu cầu chỉnh sửa thông tin không chính xác',
                'Yêu cầu xóa tài khoản và dữ liệu cá nhân (trừ dữ liệu giao dịch theo quy định pháp luật)',
                'Được thông báo khi có thay đổi điều khoản sử dụng',
                'Khiếu nại và yêu cầu giải quyết tranh chấp theo quy trình của TicketRush',
              ]} />
            </Sub>
            <Sub title="2. Nghĩa vụ của người dùng">
              <Li items={[
                'Cung cấp thông tin chính xác, đầy đủ khi đăng ký tài khoản',
                'Không mua vé với mục đích đầu cơ, bán lại với giá cao hơn mệnh giá',
                'Không sử dụng phần mềm bot hoặc công cụ tự động để đặt vé',
                'Không chia sẻ hoặc sao chép mã QR vé cho nhiều người sử dụng',
                'Không thực hiện các hành vi gian lận thanh toán',
                'Tuân thủ các quy định tại địa điểm tổ chức sự kiện',
              ]} />
            </Sub>
            <Sub title="3. Nghĩa vụ của TicketRush">
              <Li items={[
                'Đảm bảo tính xác thực của vé được phát hành',
                'Bảo mật thông tin cá nhân và thanh toán của người dùng',
                'Thông báo kịp thời về các thay đổi liên quan đến sự kiện',
                'Hỗ trợ giải quyết tranh chấp trong thời gian hợp lý',
                'Xử lý hoàn tiền đúng theo chính sách đã công bố',
              ]} />
            </Sub>
          </Section>

          <Section id="tranh-chap" title="VIII. Giải quyết tranh chấp">
            <Sub title="1. Quy trình khiếu nại">
              <p>Khi phát sinh tranh chấp, người dùng thực hiện theo quy trình sau:</p>
              <ol className="list-decimal list-inside space-y-1.5 pl-2">
                <li>Liên hệ bộ phận hỗ trợ TicketRush qua email hoặc hotline</li>
                <li>Cung cấp đầy đủ thông tin đơn hàng, bằng chứng liên quan</li>
                <li>TicketRush xem xét và phản hồi trong vòng <strong>3 ngày làm việc</strong></li>
                <li>Nếu không đạt được thỏa thuận, vụ việc được đưa lên Cục Cạnh tranh và Bảo vệ người tiêu dùng</li>
              </ol>
            </Sub>
            <Sub title="2. Luật điều chỉnh">
              <p>
                Các điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp phát sinh
                từ việc sử dụng dịch vụ TicketRush sẽ được giải quyết tại Tòa án nhân dân có thẩm quyền
                tại Hà Nội.
              </p>
            </Sub>
            <Sub title="3. Giới hạn trách nhiệm">
              <p>
                TicketRush đóng vai trò là nền tảng trung gian và không chịu trách nhiệm trực tiếp
                về nội dung, chất lượng hoặc sự hủy bỏ của sự kiện từ phía ban tổ chức.
                Trách nhiệm tối đa của TicketRush trong mọi trường hợp không vượt quá
                tổng giá trị đơn hàng liên quan.
              </p>
            </Sub>
          </Section>

          <Section id="lien-he" title="IX. Liên hệ">
            <p>
              Nếu bạn có câu hỏi, khiếu nại hoặc yêu cầu liên quan đến Điều khoản sử dụng này,
              vui lòng liên hệ với chúng tôi qua:
            </p>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              {[
                { label: 'Email hỗ trợ', value: 'support@ticketrush.vn' },
                { label: 'Hotline', value: '1800 6789 (miễn phí)' },
                { label: 'Giờ làm việc', value: 'T2–T7, 8:00 – 21:00' },
                { label: 'Địa chỉ', value: '144 Xuân Thủy, Cầu Giấy, Hà Nội' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-gray-800">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-gray-400">
              TicketRush có quyền cập nhật Điều khoản sử dụng này vào bất kỳ thời điểm nào.
              Phiên bản mới sẽ được thông báo qua email đăng ký và có hiệu lực sau 7 ngày kể từ ngày thông báo.
              Việc tiếp tục sử dụng dịch vụ sau thời điểm đó đồng nghĩa với việc bạn chấp thuận điều khoản mới.
            </p>
          </Section>

        </main>
      </div>
    </div>
  );
}
