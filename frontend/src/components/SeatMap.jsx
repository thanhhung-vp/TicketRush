import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const WARN_AT  = 120;
const URGENT_AT = 60;

function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Seat button ───────────────────────────────────────────────────────────────
function SeatBtn({ seat, status, zoneColor, onToggle, frozen }) {
  const { t } = useTranslation();
  let cls = 'transition-all duration-100 ';
  let style = {};

  if (frozen && status === 'available') {
    cls += 'cursor-not-allowed opacity-40';
    style = { backgroundColor: hexToRgba(zoneColor, 0.12), border: `1.5px solid ${hexToRgba(zoneColor, 0.25)}` };
  } else if (status === 'available') {
    cls += 'cursor-pointer hover:scale-110 hover:brightness-125';
    style = { backgroundColor: hexToRgba(zoneColor, 0.22), border: `1.5px solid ${hexToRgba(zoneColor, 0.55)}` };
  } else if (status === 'selected') {
    cls += 'cursor-pointer scale-105';
    style = { backgroundColor: '#3b82f6', border: '2px solid #93c5fd', boxShadow: '0 0 8px rgba(59,130,246,0.55)' };
  } else if (status === 'locked') {
    cls += 'cursor-not-allowed opacity-85';
    style = { backgroundColor: '#d97706', border: '1.5px solid #fbbf24' };
  } else {
    cls += 'cursor-not-allowed opacity-30';
    style = { backgroundColor: '#374151', border: '1px solid #4b5563' };
  }

  const statusLabel = {
    available: t('seatMap.available'),
    selected:  t('event.status.selecting'),
    locked:    t('seatMap.holdingStatus'),
    sold:      t('seatMap.sold'),
  }[status] || '';

  return (
    <button
      title={`${seat.label} · ${statusLabel}`}
      onClick={() => !frozen && onToggle(seat)}
      className={`w-7 h-7 rounded-t-md rounded-b-sm ${cls}`}
      style={style}
    />
  );
}

// ── Zone grid ─────────────────────────────────────────────────────────────────
function ZoneGrid({ zone, selected, heldSeats, onToggle, frozen }) {
  const { t } = useTranslation();
  const rows = {};
  zone.seats.forEach(s => { (rows[s.row_idx] ??= []).push(s); });
  const sortedRows = Object.entries(rows).sort(([a], [b]) => Number(a) - Number(b));
  const colCount = Math.max(...Object.values(rows).map(r => r.length));
  const available = zone.seats.filter(s => s.status === 'available').length;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
        <span className="font-bold text-white text-sm tracking-wide">{zone.zone_name}</span>
        <span className="text-gray-400 text-xs">{formatVND(zone.price)}{t('seatMap.perSeat')}</span>
        <div className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
          style={{ backgroundColor: hexToRgba(zone.color, 0.15), color: zone.color }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: zone.color }} />
          {available}/{zone.seats.length} {t('seatMap.available').toLowerCase()}
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-block">
          <div className="flex gap-1 mb-1.5 pl-7 pr-7">
            {Array.from({ length: colCount }, (_, i) => (
              <div key={i} className="w-7 text-center text-[10px] text-gray-600">{i + 1}</div>
            ))}
          </div>
          {sortedRows.map(([rowIdx, rowSeats]) => {
            const rowLabel = String.fromCharCode(65 + Number(rowIdx));
            return (
              <div key={rowIdx} className="flex items-center gap-1 mb-1">
                <span className="w-6 text-[11px] text-gray-500 text-right shrink-0">{rowLabel}</span>
                {[...rowSeats].sort((a, b) => a.col_idx - b.col_idx).map(seat => {
                  const isSelected = selected.has(seat.id);
                  const isHeld = heldSeats.has(seat.id);
                  const status = isSelected ? 'selected' : isHeld ? 'locked' : seat.status;
                  return (
                    <SeatBtn
                      key={seat.id}
                      seat={seat}
                      status={status}
                      zoneColor={zone.color}
                      onToggle={onToggle}
                      frozen={frozen}
                    />
                  );
                })}
                <span className="w-6 text-[11px] text-gray-500 ml-0.5 shrink-0">{rowLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 border-t border-gray-800/60" />
    </div>
  );
}

// ── Selection panel ───────────────────────────────────────────────────────────
function SelectionPanel({ selectedSeats, total, holding, onHold, onClear }) {
  const { t } = useTranslation();
  return (
    <div className="mt-4 bg-gray-900/80 border border-blue-700/50 rounded-2xl px-5 py-4
                    flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between backdrop-blur-sm">
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{t('seatMap.selectedSeats')}</p>
        <p className="font-semibold text-white text-sm">{selectedSeats.map(s => s.label).join(' · ')}</p>
        <p className="text-blue-400 font-bold text-lg mt-1">{formatVND(total)}</p>
      </div>
      <div className="flex gap-2.5">
        <button onClick={onClear} disabled={holding}
          className="text-sm text-gray-400 hover:text-white px-4 py-2.5 border border-gray-700 rounded-xl transition disabled:opacity-40">
          {t('seatMap.deselect')}
        </button>
        <button onClick={onHold} disabled={holding}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm">
          {holding ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              {t('seatMap.holding')}
            </span>
          ) : t('seatMap.hold')}
        </button>
      </div>
    </div>
  );
}

// ── Hold panel ────────────────────────────────────────────────────────────────
function HoldPanel({ heldSeatObjs, countdown, total, renewing, onRelease, onCheckout }) {
  const { t } = useTranslation();
  const urgent  = countdown !== null && countdown <= URGENT_AT;
  const warning = countdown !== null && countdown <= WARN_AT && countdown > URGENT_AT;

  const fmtCountdown = countdown != null
    ? `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`
    : '--:--';

  return (
    <div className={`mt-4 rounded-2xl px-5 py-4 space-y-3 backdrop-blur-sm border
      ${urgent
        ? 'bg-red-950/60 border-red-500/50'
        : 'bg-gray-900/80 border-amber-600/50'
      }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">{t('seatMap.heldSeats')}</p>
          <p className="font-semibold text-white text-sm">{heldSeatObjs.map(s => s.label).join(' · ')}</p>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-mono font-bold tabular-nums block
            ${urgent ? 'text-red-400 animate-pulse' : warning ? 'text-amber-300' : 'text-amber-400'}`}>
            {renewing ? (
              <span className="text-base text-emerald-400 animate-pulse">{t('seatMap.renewing')}</span>
            ) : `⏱ ${fmtCountdown}`}
          </span>
          {warning && !urgent && !renewing && (
            <span className="text-[11px] text-emerald-400">{t('seatMap.autoRenewing')}</span>
          )}
        </div>
      </div>

      {urgent && (
        <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-xl px-3 py-2">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          <p className="text-red-300 text-xs font-medium">{t('seatMap.urgentWarning')}</p>
        </div>
      )}

      <p className="text-blue-400 font-bold text-lg">{formatVND(total)}</p>

      <div className="flex gap-2.5">
        <button onClick={onRelease}
          className="text-sm text-gray-400 hover:text-white px-4 py-2.5 border border-gray-700 rounded-xl transition">
          {t('seatMap.releaseHold')}
        </button>
        <button onClick={onCheckout}
          className="bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm">
          {t('seatMap.checkout')}
        </button>
      </div>
    </div>
  );
}

// ── Expired modal ─────────────────────────────────────────────────────────────
function ExpiredModal({ onClose }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 className="text-white font-bold text-lg mb-2">{t('seatMap.expiredTitle')}</h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">{t('seatMap.expiredDesc')}</p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm transition"
          style={{ background: 'linear-gradient(90deg, #f9a8d4, #ec4899)' }}
        >
          {t('seatMap.reselect')}
        </button>
      </div>
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  const { t } = useTranslation();
  const items = [
    { style: { backgroundColor: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.3)' }, label: t('seatMap.available') },
    { style: { backgroundColor: '#3b82f6', boxShadow: '0 0 6px rgba(59,130,246,0.6)' },                  label: t('event.status.selecting') },
    { style: { backgroundColor: '#d97706' },                                                              label: t('seatMap.holdingStatus') },
    { style: { backgroundColor: '#374151', opacity: 0.4 },                                               label: t('seatMap.sold') },
  ];
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-400 mb-6">
      {items.map(({ style, label }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-t-md rounded-b-sm inline-block" style={style} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ── Stage ─────────────────────────────────────────────────────────────────────
function Stage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center mb-10 select-none">
      <div className="relative w-full flex justify-center mb-1">
        <svg width="320" height="36" viewBox="0 0 320 36" fill="none" className="opacity-30">
          {[130, 145, 160, 175, 190].map((x, i) => (
            <line key={i} x1={x} y1="0" x2={160 + (x - 160) * 3.5} y2="36"
              stroke="white" strokeWidth="1.5" />
          ))}
        </svg>
      </div>
      <div className="relative flex items-center justify-center"
        style={{
          width: 280, height: 52,
          background: 'linear-gradient(180deg,#3e3e5e 0%,#252540 100%)',
          clipPath: 'polygon(6% 0%,94% 0%,100% 100%,0% 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 0 30px 6px rgba(180,160,255,0.18)',
        }}>
        <span className="text-white/60 text-[11px] font-bold tracking-[0.35em] uppercase">
          {t('seatMap.stage')}
        </span>
      </div>
      <div className="mt-1" style={{
        width: 280, height: 4,
        background: 'radial-gradient(ellipse at center,rgba(180,160,255,0.5) 0%,transparent 70%)',
      }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SeatMap({ eventId }) {
  const { t }      = useTranslation();
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [seats,      setSeats]     = useState([]);
  const [selected,   setSelected]  = useState(new Set());
  const [holding,    setHolding]   = useState(false);
  const [countdown,  setCountdown] = useState(null);
  const [heldSeats,  setHeldSeats] = useState([]);
  const [renewing,   setRenewing]  = useState(false);
  const [renewedOnce,setRenewedOnce] = useState(false);
  const [showExpired,setShowExpired] = useState(false);
  const [error,      setError]     = useState('');

  const frozen = holding || heldSeats.length > 0;

  // ── Load seats ──
  useEffect(() => {
    api.get(`/events/${eventId}/seats`).then(r => setSeats(r.data));
  }, [eventId]);

  // ── Real-time updates via Socket.io ──
  useEffect(() => {
    const socket = io('/', { auth: { token: localStorage.getItem('token') } });
    socket.emit('join:event', eventId);
    socket.on('seats:updated', (updatedSeats) => {
      setSeats(prev => {
        const map = new Map(prev.map(s => [s.id, s]));
        updatedSeats.forEach(u => { if (map.has(u.id)) map.set(u.id, { ...map.get(u.id), status: u.status }); });
        return Array.from(map.values());
      });
      setSelected(prev => {
        const next = new Set(prev);
        updatedSeats.forEach(u => { if (u.status !== 'available') next.delete(u.id); });
        return next;
      });
    });
    return () => { socket.emit('leave:event', eventId); socket.disconnect(); };
  }, [eventId]);

  // ── Countdown + auto-renew + expiry ──
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === WARN_AT && !renewedOnce && heldSeats.length > 0) {
      setRenewedOnce(true);
      setRenewing(true);
      api.post('/seats/renew', { seat_ids: heldSeats })
        .then(({ data }) => {
          const secs = Math.max(0, Math.floor((new Date(data.locked_until) - Date.now()) / 1000));
          setCountdown(secs);
        })
        .catch(() => {})
        .finally(() => setRenewing(false));
    }

    if (countdown <= 0) {
      setCountdown(null);
      setHeldSeats([]);
      setRenewedOnce(false);
      setShowExpired(true);
      return;
    }

    const timer = setTimeout(() => setCountdown(c => (c !== null && c > 0 ? c - 1 : 0)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, heldSeats, renewedOnce]);

  // ── Toggle seat selection ──
  const toggleSeat = useCallback((seat) => {
    if (!user || seat.status !== 'available' || frozen) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else if (next.size < 8) next.add(seat.id);
      return next;
    });
  }, [user, frozen]);

  // ── Hold seats ──
  const holdSeats = async () => {
    if (selected.size === 0) return;
    setHolding(true); setError('');
    try {
      const seatIds = Array.from(selected);
      const { data } = await api.post('/seats/hold', { seat_ids: seatIds });
      setHeldSeats(seatIds);
      setSelected(new Set());
      setRenewedOnce(false);
      setCountdown(Math.max(0, Math.floor((new Date(data.locked_until) - Date.now()) / 1000)));
    } catch (err) {
      const msg = err.response?.data?.error || t('seatMap.holdError');
      setError(msg);
      const takenIds = err.response?.data?.seats;
      if (takenIds?.length) {
        setSelected(prev => { const n = new Set(prev); takenIds.forEach(id => n.delete(id)); return n; });
      }
    } finally {
      setHolding(false);
    }
  };

  // ── Release held seats ──
  const releaseHeld = async () => {
    await api.post('/seats/release', { seat_ids: heldSeats });
    setHeldSeats([]); setCountdown(null); setRenewedOnce(false);
  };

  // ── Dismiss expired modal ──
  const dismissExpired = () => {
    setShowExpired(false);
    api.get(`/events/${eventId}/seats`).then(r => setSeats(r.data));
  };

  // Group seats by zone
  const zones = {};
  seats.forEach(s => {
    if (!zones[s.zone_id]) zones[s.zone_id] = { ...s, seats: [] };
    zones[s.zone_id].seats.push(s);
  });

  const selectedSeats  = seats.filter(s => selected.has(s.id));
  const heldSeatObjs   = seats.filter(s => heldSeats.includes(s.id));
  const total = [...selectedSeats, ...heldSeatObjs].reduce((acc, s) => acc + Number(s.price), 0);

  return (
    <div>
      <Legend />
      <Stage />

      {Object.values(zones).map(zone => (
        <ZoneGrid
          key={zone.zone_id}
          zone={zone}
          selected={selected}
          heldSeats={new Set(heldSeats)}
          onToggle={toggleSeat}
          frozen={frozen}
        />
      ))}

      {error && (
        <p className="text-red-400 text-sm bg-red-950/30 border border-red-800/40 px-3 py-2 rounded-xl mt-2">
          {error}
        </p>
      )}

      {heldSeats.length > 0 ? (
        <HoldPanel
          heldSeatObjs={heldSeatObjs}
          countdown={countdown}
          total={total}
          renewing={renewing}
          onRelease={releaseHeld}
          onCheckout={() => navigate('/checkout', { state: { seat_ids: heldSeats, seat_info: heldSeatObjs } })}
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

      {showExpired && <ExpiredModal onClose={dismissExpired} />}
    </div>
  );
}
