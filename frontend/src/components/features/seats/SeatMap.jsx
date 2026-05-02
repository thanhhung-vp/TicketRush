import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../store/auth.context.jsx';
import { seatService } from '../../../services/seat.service.js';
import { useEventSocket } from '../../../hooks/useEventSocket.js';
import { useCountdown } from '../../../hooks/useCountdown.js';
import { formatVND, formatCountdown } from '../../../utils/format.js';
import { MAX_SEATS } from '../../../utils/constants.js';

const STATUS_STYLE = {
  available: 'bg-gray-700 hover:ring-2 hover:ring-blue-400 cursor-pointer',
  locked:    'bg-yellow-600 opacity-60 cursor-not-allowed',
  sold:      'bg-gray-600 opacity-40 cursor-not-allowed',
  selected:  'bg-blue-500 ring-2 ring-blue-300 cursor-pointer',
};

export default function SeatMap({ eventId, initialSeats = [] }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [seats, setSeats]         = useState(initialSeats);
  const [selected, setSelected]   = useState(new Set());
  const [holding, setHolding]     = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [heldSeats, setHeldSeats] = useState([]);
  const [error, setError]         = useState('');

  // Real-time seat updates via Socket.io
  useEventSocket(eventId, (updatedSeats) => {
    setSeats(prev => {
      const map = new Map(prev.map(s => [s.id, s]));
      updatedSeats.forEach(u => {
        if (map.has(u.id)) map.set(u.id, { ...map.get(u.id), status: u.status });
      });
      return Array.from(map.values());
    });
    // Deselect seats that are no longer available
    setSelected(prev => {
      const next = new Set(prev);
      updatedSeats.forEach(u => {
        if (u.status !== 'available') next.delete(u.id);
      });
      return next;
    });
  });

  // Countdown hook — ticks down from lockedUntil
  const countdown = useCountdown(lockedUntil);

  // Auto-clear hold state when countdown reaches zero
  useEffect(() => {
    if (countdown === 0 && heldSeats.length > 0) {
      setHeldSeats([]);
      setLockedUntil(null);
    }
  }, [countdown, heldSeats.length]);

  const toggleSeat = useCallback((seat) => {
    if (!user) return;
    if (seat.status !== 'available') return;
    if (heldSeats.length > 0) return; // already in hold mode

    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else if (next.size < MAX_SEATS) next.add(seat.id);
      return next;
    });
  }, [user, heldSeats]);

  const holdSeats = async () => {
    if (selected.size === 0) return;
    setHolding(true);
    setError('');
    try {
      const seatIds = Array.from(selected);
      const data = await seatService.hold(seatIds);
      setHeldSeats(seatIds);
      setSelected(new Set());
      setLockedUntil(data.locked_until);
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể giữ ghế, vui lòng thử lại.');
    } finally {
      setHolding(false);
    }
  };

  const releaseHeld = async () => {
    await seatService.release(heldSeats);
    setHeldSeats([]);
    setLockedUntil(null);
  };

  // Group seats by zone
  const zones = {};
  seats.forEach(s => {
    if (!zones[s.zone_id]) zones[s.zone_id] = { ...s, seats: [] };
    zones[s.zone_id].seats.push(s);
  });

  const selectedSeats  = seats.filter(s => selected.has(s.id));
  const heldSeatObjs   = seats.filter(s => heldSeats.includes(s.id));
  const total          = [...selectedSeats, ...heldSeatObjs].reduce((acc, s) => acc + Number(s.price), 0);
  const fmtCountdown   = countdown != null ? formatCountdown(countdown) : null;

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        {[
          ['bg-gray-700', 'Còn trống'],
          ['bg-blue-500', 'Đang chọn'],
          ['bg-yellow-600 opacity-70', 'Đang giữ'],
          ['bg-gray-600 opacity-50', 'Đã bán'],
        ].map(([cls, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-4 h-4 rounded-sm ${cls}`} /> {label}
          </span>
        ))}
      </div>

      {/* Seat zones */}
      {Object.values(zones).map(zone => (
        <ZoneGrid
          key={zone.zone_id}
          zone={zone}
          selected={selected}
          heldSeats={new Set(heldSeats)}
          onToggle={toggleSeat}
        />
      ))}

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Bottom panel */}
      {heldSeats.length > 0 ? (
        <HoldPanel
          heldSeatObjs={heldSeatObjs}
          fmtCountdown={fmtCountdown}
          countdown={countdown}
          total={total}
          onRelease={releaseHeld}
          onCheckout={() =>
            navigate('/checkout', { state: { seat_ids: heldSeats, seat_info: heldSeatObjs } })
          }
        />
      ) : selected.size > 0 ? (
        <SelectionPanel
          selectedSeats={selectedSeats}
          total={total}
          holding={holding}
          onHold={holdSeats}
          onClear={() => setSelected(new Set())}
        />
      ) : null}
    </div>
  );
}

function ZoneGrid({ zone, selected, heldSeats, onToggle }) {
  const rows = {};
  zone.seats.forEach(s => {
    (rows[s.row_idx] ??= []).push(s);
  });

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: zone.color }} />
        <span className="font-semibold">{zone.zone_name}</span>
        <span className="text-sm text-gray-500">— {formatVND(zone.price)}/ghế</span>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block">
          {Object.entries(rows)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([rowIdx, rowSeats]) => (
              <div key={rowIdx} className="flex gap-1 mb-1">
                <span className="w-5 text-xs text-gray-600 flex items-center">
                  {String.fromCharCode(65 + Number(rowIdx))}
                </span>
                {rowSeats
                  .sort((a, b) => a.col_idx - b.col_idx)
                  .map(seat => {
                    const isSelected = selected.has(seat.id);
                    const isHeld     = heldSeats.has(seat.id);
                    const displayStatus = isSelected ? 'selected' : isHeld ? 'locked' : seat.status;
                    return (
                      <button
                        key={seat.id}
                        title={seat.label}
                        onClick={() => onToggle(seat)}
                        className={`w-7 h-7 rounded-sm text-[10px] font-medium transition-all ${STATUS_STYLE[displayStatus] || STATUS_STYLE.available}`}
                      >
                        {seat.col_idx + 1}
                      </button>
                    );
                  })}
              </div>
            ))}
        </div>
      </div>
      <div className="mt-2 text-center text-xs text-gray-600 border-t border-gray-800 pt-2">
        — Sân khấu —
      </div>
    </div>
  );
}

function SelectionPanel({ selectedSeats, total, holding, onHold, onClear }) {
  return (
    <div className="bg-gray-900 border border-blue-800 rounded-xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div>
        <p className="font-semibold mb-1">
          Ghế đã chọn: {selectedSeats.map(s => s.label).join(', ')}
        </p>
        <p className="text-blue-400 font-bold text-lg">{formatVND(total)}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onClear}
          className="text-sm text-gray-400 hover:text-white px-4 py-2 border border-gray-700 rounded-lg transition"
        >
          Bỏ chọn
        </button>
        <button
          onClick={onHold}
          disabled={holding}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition"
        >
          {holding ? 'Đang giữ...' : 'Giữ ghế →'}
        </button>
      </div>
    </div>
  );
}

function HoldPanel({ heldSeatObjs, fmtCountdown, countdown, total, onRelease, onCheckout }) {
  const urgent = countdown != null && countdown < 120; // under 2 minutes
  return (
    <div className="bg-gray-900 border border-yellow-700 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold">
          Ghế đang giữ: {heldSeatObjs.map(s => s.label).join(', ')}
        </p>
        <span
          className={`text-lg font-mono font-bold ${urgent ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}
        >
          ⏱ {fmtCountdown}
        </span>
      </div>
      <p className="text-yellow-300 text-sm">Hoàn tất thanh toán trước khi hết giờ!</p>
      <p className="text-blue-400 font-bold text-lg">{formatVND(total)}</p>
      <div className="flex gap-3">
        <button
          onClick={onRelease}
          className="text-sm text-gray-400 hover:text-white px-4 py-2 border border-gray-700 rounded-lg transition"
        >
          Hủy giữ chỗ
        </button>
        <button
          onClick={onCheckout}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition"
        >
          Thanh toán →
        </button>
      </div>
    </div>
  );
}
