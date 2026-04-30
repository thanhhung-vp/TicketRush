export const CATEGORIES = [
  { value: '',           label: 'Tất cả' },
  { value: 'music',     label: '🎵 Âm nhạc' },
  { value: 'sports',    label: '⚽ Thể thao' },
  { value: 'arts',      label: '🎨 Nghệ thuật' },
  { value: 'conference',label: '🎤 Hội nghị' },
  { value: 'comedy',    label: '😂 Hài kịch' },
  { value: 'festival',  label: '🎪 Lễ hội' },
  { value: 'other',     label: '✨ Khác' },
];

export const CATEGORY_BADGE_COLORS = {
  music:      'bg-purple-900/50 text-purple-300 border-purple-700',
  sports:     'bg-green-900/50 text-green-300 border-green-700',
  arts:       'bg-pink-900/50 text-pink-300 border-pink-700',
  conference: 'bg-blue-900/50 text-blue-300 border-blue-700',
  comedy:     'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  festival:   'bg-orange-900/50 text-orange-300 border-orange-700',
  other:      'bg-gray-800 text-gray-300 border-gray-700',
};

export const PAYMENT_METHODS = [
  { value: 'mock',  label: 'Thanh toán mô phỏng', desc: 'Dùng cho demo / kiểm thử',    icon: '💳', badge: 'Demo',    badgeColor: 'bg-gray-700 text-gray-300' },
  { value: 'vnpay', label: 'VNPay',                desc: 'Thanh toán qua VNPay Gateway', icon: '🏦', badge: 'Sandbox', badgeColor: 'bg-blue-900/50 text-blue-300' },
  { value: 'momo',  label: 'MoMo',                 desc: 'Ví điện tử MoMo',              icon: '📱', badge: 'Sandbox', badgeColor: 'bg-pink-900/50 text-pink-300' },
];

export const GENDER_LABELS = { male: 'Nam', female: 'Nữ', other: 'Khác' };

export const SEAT_STATUS = { AVAILABLE: 'available', LOCKED: 'locked', SOLD: 'sold', SELECTED: 'selected' };

export const MAX_SEATS = 8;
