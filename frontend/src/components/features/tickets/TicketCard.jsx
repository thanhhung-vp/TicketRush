import { useState } from 'react';
import { formatDate } from '../../../utils/format.js';

export function TicketCard({ ticket }) {
  const [showQR, setShowQR] = useState(false);

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = ticket.qr_code;
    link.download = `ticket-${ticket.id.slice(0, 8)}.png`;
    link.click();
  };

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      {/* Header stripe */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 px-6 py-4 border-b border-gray-800">
        <h2 className="font-bold text-lg">{ticket.event_title}</h2>
        <p className="text-sm text-gray-400">📍 {ticket.venue}</p>
        <p className="text-sm text-gray-400">📅 {formatDate(ticket.event_date)}</p>
      </div>

      {/* Seat info + QR */}
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-0.5">Khu / Ghế</p>
          <p className="font-bold text-xl">{ticket.zone} — {ticket.label}</p>
          <p className="text-xs text-gray-600 mt-1 font-mono">#{ticket.id.slice(0, 12).toUpperCase()}</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => setShowQR(v => !v)}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-2 transition"
            title="Hiển thị QR code"
          >
            {showQR ? (
              <img src={ticket.qr_code} alt="QR" className="w-28 h-28" />
            ) : (
              <div className="w-28 h-28 flex flex-col items-center justify-center text-gray-400">
                <span className="text-3xl">📱</span>
                <span className="text-xs mt-1">Xem QR</span>
              </div>
            )}
          </button>

          {showQR && (
            <button
              onClick={downloadQR}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-950/30 border border-blue-900/50 rounded-lg px-3 py-1.5 transition"
            >
              ⬇ Tải QR
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-950/30 border-t border-gray-800 flex items-center justify-between">
        <span className="text-xs text-gray-600">Xuất trình QR tại cổng vào</span>
        <span className="text-xs bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full border border-green-800">
          Hợp lệ
        </span>
      </div>
    </div>
  );
}
