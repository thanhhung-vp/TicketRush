import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../store/auth.context.jsx';
import { seatService } from '../../../services/seat.service.js';
import { eventService } from '../../../services/event.service.js';
import { useEventSocket } from '../../../hooks/useEventSocket.js';
import { useCountdown } from '../../../hooks/useCountdown.js';
import { formatVND, formatCountdown } from '../../../utils/format.js';
import { MAX_SEATS } from '../../../utils/constants.js';
import { clampRotation, normalizeAudienceShape, normalizeStageLayout } from '../../../utils/venueLayout.js';

const STATUS_STYLE = {
  available: 'bg-gray-700 hover:ring-2 hover:ring-blue-400 cursor-pointer',
  locked:    'bg-yellow-600 opacity-60 cursor-not-allowed',
  sold:      'bg-gray-600 opacity-40 cursor-not-allowed',
  selected:  'bg-blue-500 ring-2 ring-blue-300 cursor-pointer',
};

function hexToRgba(hex = '#3B82F6', alpha = 1) {
  const clean = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#3B82F6';
  const r = parseInt(clean.slice(1, 3), 16);
  const g = parseInt(clean.slice(3, 5), 16);
  const b = parseInt(clean.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getZonePath(zone) {
  const w = Number(zone.width || 0);
  const h = Number(zone.height || 0);
  const shape = normalizeAudienceShape(zone.shape);

  if (shape === 'fan') {
    return `M ${w * 0.08} ${h} Q ${w / 2} ${-h * 0.18} ${w * 0.92} ${h} Q ${w / 2} ${h * 0.72} ${w * 0.08} ${h} Z`;
  }
  if (shape === 'semicircle') {
    return `M 0 ${h} A ${w / 2} ${h} 0 0 1 ${w} ${h} L 0 ${h} Z`;
  }
  if (shape === 'u_shape') {
    return `M 0 0 H ${w} V ${h} H ${w * 0.68} V ${h * 0.38} H ${w * 0.32} V ${h} H 0 Z`;
  }
  return `M 0 0 H ${w} V ${h} H 0 Z`;
}

function getStagePath(stage) {
  const w = Number(stage.width || 0);
  const h = Number(stage.height || 0);
  const shape = normalizeStageLayout(stage.shape);

  if (shape === 'proscenium') {
    const off = w * 0.16;
    return `M ${off} 0 H ${w - off} L ${w} ${h} H 0 Z`;
  }
  if (shape === 'thrust') {
    const inset = w * 0.28;
    return `M 0 0 H ${w} V ${h * 0.58} H ${w - inset} V ${h} H ${inset} V ${h * 0.58} H 0 Z`;
  }
  if (shape === 'catwalk') {
    return `M ${w * 0.16} 0 H ${w * 0.84} V ${h * 0.42} H ${w * 0.58} V ${h} H ${w * 0.42} V ${h * 0.42} H ${w * 0.16} Z`;
  }
  return `M 0 0 H ${w} V ${h} H 0 Z`;
}

function rotateTransform(item) {
  const rotation = clampRotation(item.rotation);
  if (!rotation) return undefined;
  const cx = Number(item.x || 0) + Number(item.width || 0) / 2;
  const cy = Number(item.y || 0) + Number(item.height || 0) / 2;
  return `rotate(${rotation} ${cx} ${cy})`;
}

function VenueOverview({ layout, zoneGroups, onZoneFocus }) {
  if (!layout?.zones?.length) return null;

  const canvas = layout.canvas || { width: 860, height: 540 };
  const zonesById = new Map(zoneGroups.map(zone => [String(zone.zone_id), zone]));

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/80 p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">So do tong quan</h3>
          <p className="text-xs text-gray-500">Bam vao mot khu de chuyen nhanh den danh sach ghe.</p>
        </div>
        <p className="text-xs text-gray-500">{layout.zones.length} khu ve</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#0d0d14]">
        <svg
          viewBox={`0 0 ${canvas.width || 860} ${canvas.height || 540}`}
          className="block min-w-[640px] w-full"
          role="img"
          aria-label="So do tong quan su kien"
        >
          <defs>
            <linearGradient id="stageFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4c1d95" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>
          {(layout.stages || []).map(stage => {
            const shape = normalizeStageLayout(stage.shape);
            const common = {
              fill: 'url(#stageFill)',
              stroke: 'rgba(216, 180, 254, 0.72)',
              strokeWidth: 2,
            };

            return (
              <g key={stage.id} transform={rotateTransform(stage)}>
                {shape === 'arena' ? (
                  <ellipse
                    cx={Number(stage.x || 0) + Number(stage.width || 0) / 2}
                    cy={Number(stage.y || 0) + Number(stage.height || 0) / 2}
                    rx={Number(stage.width || 0) / 2}
                    ry={Number(stage.height || 0) / 2}
                    {...common}
                  />
                ) : (
                  <path d={getStagePath(stage)} transform={`translate(${stage.x || 0} ${stage.y || 0})`} {...common} />
                )}
                <text
                  x={Number(stage.x || 0) + Number(stage.width || 0) / 2}
                  y={Number(stage.y || 0) + Number(stage.height || 0) / 2 + 4}
                  textAnchor="middle"
                  className="fill-white/70 text-[11px] font-bold uppercase tracking-[0.25em]"
                >
                  {stage.label || 'STAGE'}
                </text>
              </g>
            );
          })}
          {(layout.zones || []).map(zone => {
            const zoneId = String(zone.dbId || zone.id);
            const group = zonesById.get(zoneId);
            const total = group?.seats?.length || Number(zone.rows || 0) * Number(zone.cols || 0);
            const available = group?.seats?.filter(seat => seat.status === 'available').length ?? 0;
            const color = zone.color || '#3B82F6';
            const shape = normalizeAudienceShape(zone.shape);
            const zoneLabel = `${zone.name || 'Khu'} - ${available}/${total} ghe trong`;
            const transform = rotateTransform(zone);

            return (
              <g
                key={zoneId}
                transform={transform}
                role="button"
                tabIndex={0}
                aria-label={zoneLabel}
                onClick={() => onZoneFocus(zoneId)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') onZoneFocus(zoneId);
                }}
                className="cursor-pointer outline-none"
              >
                {shape === 'circle' ? (
                  <ellipse
                    cx={Number(zone.x || 0) + Number(zone.width || 0) / 2}
                    cy={Number(zone.y || 0) + Number(zone.height || 0) / 2}
                    rx={Number(zone.width || 0) / 2}
                    ry={Number(zone.height || 0) / 2}
                    fill={hexToRgba(color, 0.18)}
                    stroke={color}
                    strokeWidth="2"
                  />
                ) : (
                  <path
                    d={getZonePath(zone)}
                    transform={`translate(${zone.x || 0} ${zone.y || 0})`}
                    fill={hexToRgba(color, 0.18)}
                    stroke={color}
                    strokeWidth="2"
                  />
                )}
                <text
                  x={Number(zone.x || 0) + Number(zone.width || 0) / 2}
                  y={Number(zone.y || 0) + Number(zone.height || 0) / 2 - 4}
                  textAnchor="middle"
                  className="pointer-events-none fill-white text-[13px] font-bold"
                >
                  {zone.name}
                </text>
                <text
                  x={Number(zone.x || 0) + Number(zone.width || 0) / 2}
                  y={Number(zone.y || 0) + Number(zone.height || 0) / 2 + 14}
                  textAnchor="middle"
                  className="pointer-events-none fill-white/60 text-[11px]"
                >
                  {available}/{total} ghe trong
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function SeatMap({ eventId, initialSeats = [], layout = null }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [seats, setSeats]         = useState(initialSeats);
  const [selected, setSelected]   = useState(new Set());
  const [holding, setHolding]     = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [heldSeats, setHeldSeats] = useState([]);
  const [error, setError]         = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    eventService.getSeats(eventId)
      .then(data => {
        if (!active) return;
        setSeats(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        if (!active) return;
        const data = err.response?.data;
        if (data?.code === 'QUEUE_REQUIRED' && user) {
          navigate(`/queue/${data.event_id || eventId}`, { replace: true });
          return;
        }
        setError(data?.error || 'Khong the tai so do ghe.');
      });
    return () => { active = false; };
  }, [eventId, navigate, user]);

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
  const zoneGroups = Object.values(zones);

  const selectedSeats  = seats.filter(s => selected.has(s.id));
  const heldSeatObjs   = seats.filter(s => heldSeats.includes(s.id));
  const total          = [...selectedSeats, ...heldSeatObjs].reduce((acc, s) => acc + Number(s.price), 0);
  const fmtCountdown   = countdown != null ? formatCountdown(countdown) : null;
  const focusZone = (zoneId) => {
    document.getElementById(`zone-grid-${zoneId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

      <VenueOverview layout={layout} zoneGroups={zoneGroups} onZoneFocus={focusZone} />

      {/* Seat zones */}
      {zoneGroups.map(zone => (
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
    <div id={`zone-grid-${zone.zone_id}`} className="scroll-mt-24 bg-gray-900 rounded-xl p-5 border border-gray-800">
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
