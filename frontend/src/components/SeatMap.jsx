import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { clampOverviewZoom, clampRotation, getFanZonePath, normalizeAudienceShape, normalizeStageLayout } from '../utils/venueLayout.js';

const WARN_AT  = 120;
const URGENT_AT = 60;

function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}
function hexToRgba(hex, alpha) {
  const clean = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#3B82F6';
  const r = parseInt(clean.slice(1, 3), 16);
  const g = parseInt(clean.slice(3, 5), 16);
  const b = parseInt(clean.slice(5, 7), 16);
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
function getZonePath(zone) {
  const w = Number(zone.width || 0);
  const h = Number(zone.height || 0);
  const shape = normalizeAudienceShape(zone.shape);
  if (shape === 'fan') return getFanZonePath(zone);
  if (shape === 'semicircle') return `M 0 ${h} A ${w / 2} ${h} 0 0 1 ${w} ${h} L 0 ${h} Z`;
  if (shape === 'u_shape') return `M 0 0 H ${w} V ${h} H ${w * 0.68} V ${h * 0.38} H ${w * 0.32} V ${h} H 0 Z`;
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
  if (shape === 'catwalk') return `M ${w * 0.16} 0 H ${w * 0.84} V ${h * 0.42} H ${w * 0.58} V ${h} H ${w * 0.42} V ${h * 0.42} H ${w * 0.16} Z`;
  return `M 0 0 H ${w} V ${h} H 0 Z`;
}

function rotateTransform(item) {
  const rotation = clampRotation(item.rotation);
  if (!rotation) return undefined;
  const cx = Number(item.x || 0) + Number(item.width || 0) / 2;
  const cy = Number(item.y || 0) + Number(item.height || 0) / 2;
  return `rotate(${rotation} ${cx} ${cy})`;
}

function zoneTransform(zone) {
  const x = Number(zone.x || 0);
  const y = Number(zone.y || 0);
  const width = Number(zone.width || 0);
  const height = Number(zone.height || 0);
  const rotation = clampRotation(zone.rotation);
  const rotate = rotation ? ` rotate(${rotation} ${width / 2} ${height / 2})` : '';
  return `translate(${x} ${y})${rotate}`;
}

function getSeatVisualStatus(seat, selected, heldSeats) {
  if (selected.has(seat.id)) return 'selected';
  if (heldSeats.has(seat.id)) return 'locked';
  return seat.status;
}

function getSeatDotStyle(status, zoneColor) {
  if (status === 'selected') return { fill: '#3b82f6', stroke: '#bfdbfe', opacity: 1 };
  if (status === 'locked') return { fill: '#d97706', stroke: '#fbbf24', opacity: 0.95 };
  if (status === 'sold') return { fill: '#1f2937', stroke: '#334155', opacity: 0.55 };
  return { fill: hexToRgba(zoneColor, 0.82), stroke: hexToRgba(zoneColor, 0.96), opacity: 1 };
}

function getSeatPoint(seat, zone, rowCount, colCount) {
  const width = Number(zone.width || 0);
  const height = Number(zone.height || 0);
  const padX = Math.min(28, Math.max(12, width * 0.12));
  const padTop = Math.min(44, Math.max(28, height * 0.22));
  const padBottom = Math.min(24, Math.max(12, height * 0.12));
  const usableW = Math.max(1, width - padX * 2);
  const usableH = Math.max(1, height - padTop - padBottom);
  const col = Number(seat.col_idx || 0);
  const row = Number(seat.row_idx || 0);

  return {
    x: padX + (colCount <= 1 ? usableW / 2 : (usableW * col) / (colCount - 1)),
    y: padTop + (rowCount <= 1 ? usableH / 2 : (usableH * row) / (rowCount - 1)),
  };
}

function VenueOverview({ layout, zoneGroups, selected, heldSeats, frozen, onSeatToggle }) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  if (!layout?.zones?.length) return null;

  const canvas = layout.canvas || { width: 860, height: 540 };
  const canvasWidth = Number(canvas.width || 860);
  const canvasHeight = Number(canvas.height || 540);
  const zoomPercent = Math.round(zoom * 100);
  const zonesById = new Map(zoneGroups.map(zone => [String(zone.zone_id), zone]));
  const statusLabels = {
    available: t('seatMap.available'),
    selected: t('seatMap.selecting'),
    locked: t('seatMap.holdingStatus'),
    sold: t('seatMap.sold'),
  };

  return (
    <div className="rounded-2xl border border-separator bg-surface p-4 shadow-1">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-label-primary">{t('seatMap.overviewTitle')}</h3>
          <p className="text-xs text-label-secondary">{t('seatMap.overviewHint')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <p className="mr-1 text-xs text-label-secondary">{t('seatMap.zonesCount', { count: layout.zones.length })}</p>
          <div className="flex items-center overflow-hidden rounded-xl border border-separator bg-fill-tertiary">
            <button
              type="button"
              onClick={() => setZoom(value => clampOverviewZoom(value - 0.25))}
              className="h-8 w-8 text-sm font-bold text-label-secondary transition hover:bg-fill-quaternary hover:text-label-primary disabled:opacity-40"
              disabled={zoom <= 0.75}
              aria-label={t('seatMap.zoomOut')}
              title={t('seatMap.zoomOut')}
            >
              -
            </button>
            <span className="min-w-14 border-x border-separator px-2 text-center text-xs font-semibold text-label-primary">
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(value => clampOverviewZoom(value + 0.25))}
              className="h-8 w-8 text-sm font-bold text-label-secondary transition hover:bg-fill-quaternary hover:text-label-primary disabled:opacity-40"
              disabled={zoom >= 3}
              aria-label={t('seatMap.zoomIn')}
              title={t('seatMap.zoomIn')}
            >
              +
            </button>
          </div>
          {zoom !== 1 && (
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="rounded-xl border border-separator px-3 py-1.5 text-xs font-semibold text-label-secondary transition hover:bg-fill-quaternary hover:text-label-primary"
            >
              {t('seatMap.zoomReset')}
            </button>
          )}
        </div>
      </div>
      <div className="max-h-[72vh] overflow-auto rounded-xl border border-separator bg-surface-grouped dark:bg-[#0d0d14]">
        <svg
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="block"
          style={{
            width: `${Math.max(720, canvasWidth) * zoom}px`,
            height: `${Math.max(450, canvasHeight) * zoom}px`,
            maxWidth: 'none',
          }}
          role="img"
          aria-label={t('seatMap.seatMapAria')}
        >
          <defs>
            <linearGradient id="stageFillBooking" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4c1d95" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>
          {(layout.stages || []).map(stage => {
            const shape = normalizeStageLayout(stage.shape);
            return (
              <g key={stage.id} transform={rotateTransform(stage)}>
                {shape === 'arena' ? (
                  <ellipse cx={Number(stage.x || 0) + Number(stage.width || 0) / 2} cy={Number(stage.y || 0) + Number(stage.height || 0) / 2} rx={Number(stage.width || 0) / 2} ry={Number(stage.height || 0) / 2} fill="url(#stageFillBooking)" stroke="rgba(216, 180, 254, 0.72)" strokeWidth="2" />
                ) : (
                  <path d={getStagePath(stage)} transform={`translate(${stage.x || 0} ${stage.y || 0})`} fill="url(#stageFillBooking)" stroke="rgba(216, 180, 254, 0.72)" strokeWidth="2" />
                )}
                <text x={Number(stage.x || 0) + Number(stage.width || 0) / 2} y={Number(stage.y || 0) + Number(stage.height || 0) / 2 + 4} textAnchor="middle" className="fill-white text-[11px] font-bold uppercase tracking-[0.25em] opacity-70">{stage.label || t('seatMap.stage')}</text>
              </g>
            );
          })}
          {(layout.zones || []).map(zone => {
            const zoneId = String(zone.dbId || zone.id);
            const group = zonesById.get(zoneId);
            const zoneSeats = [...(group?.seats || [])].sort((a, b) => Number(a.row_idx) - Number(b.row_idx) || Number(a.col_idx) - Number(b.col_idx));
            const total = zoneSeats.length || Number(zone.rows || 0) * Number(zone.cols || 0);
            const available = zoneSeats.filter(seat => seat.status === 'available').length;
            const color = zone.color || '#3B82F6';
            const shape = normalizeAudienceShape(zone.shape);
            const rowCount = Math.max(1, ...zoneSeats.map(seat => Number(seat.row_idx || 0) + 1));
            const colCount = Math.max(1, ...zoneSeats.map(seat => Number(seat.col_idx || 0) + 1));
            const width = Number(zone.width || 0);
            const height = Number(zone.height || 0);
            const dotRadius = Math.max(3.5, Math.min(7, Number(zone.width || 0) / Math.max(colCount * 3.2, 1), Number(zone.height || 0) / Math.max(rowCount * 4, 1)));

            return (
              <g key={zoneId} transform={zoneTransform(zone)}>
                {shape === 'circle' ? (
                  <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={hexToRgba(color, 0.18)} stroke={color} strokeWidth="2" />
                ) : (
                  <path d={getZonePath(zone)} fill={hexToRgba(color, 0.18)} stroke={color} strokeWidth="2" />
                )}
                <text x={width / 2} y="20" textAnchor="middle" className="pointer-events-none text-[13px] font-bold" style={{ fill: 'var(--text-label-primary)' }}>{zone.name}</text>
                <text x={width / 2} y="38" textAnchor="middle" className="pointer-events-none text-[11px]" style={{ fill: 'var(--text-label-secondary)' }}>{t('seatMap.seatsAvailableCount', { available, total })}</text>
                {zoneSeats.map(seat => {
                  const status = getSeatVisualStatus(seat, selected, heldSeats);
                  const style = getSeatDotStyle(status, color);
                  const point = getSeatPoint(seat, zone, rowCount, colCount);
                  const disabled = frozen || seat.status !== 'available';

                  return (
                    <circle
                      key={seat.id}
                      cx={point.x}
                      cy={point.y}
                      r={dotRadius}
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth={status === 'selected' ? 2.2 : 1.2}
                      opacity={disabled && status === 'available' ? 0.45 : style.opacity}
                      role="button"
                      tabIndex={disabled ? -1 : 0}
                      aria-label={`${seat.label} ${statusLabels[status] || status}`}
                      className={disabled ? 'cursor-not-allowed' : 'cursor-pointer transition hover:brightness-125'}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!disabled) onSeatToggle(seat);
                      }}
                      onKeyDown={(event) => {
                        if (disabled || (event.key !== 'Enter' && event.key !== ' ')) return;
                        event.preventDefault();
                        onSeatToggle(seat);
                      }}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function ZoneGrid({ zone, selected, heldSeats, onToggle, frozen }) {
  const { t } = useTranslation();
  const rows = {};
  zone.seats.forEach(s => { (rows[s.row_idx] ??= []).push(s); });
  const sortedRows = Object.entries(rows).sort(([a], [b]) => Number(a) - Number(b));
  const colCount = Math.max(...Object.values(rows).map(r => r.length));
  const available = zone.seats.filter(s => s.status === 'available').length;

  return (
    <div id={`zone-grid-${zone.zone_id}`} className="mb-8 scroll-mt-24">
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
function BookingSidebar({
  zoneGroups,
  selectedSeats,
  heldSeatObjs,
  countdown,
  total,
  holding,
  renewing,
  onHold,
  onClear,
  onRelease,
  onCheckout,
}) {
  const { t } = useTranslation();
  const activeSeats = heldSeatObjs.length > 0 ? heldSeatObjs : selectedSeats;
  const hasHeldSeats = heldSeatObjs.length > 0;
  const urgent = countdown !== null && countdown <= URGENT_AT;
  const warning = countdown !== null && countdown <= WARN_AT && countdown > URGENT_AT;
  const fmtCountdown = countdown != null
    ? `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`
    : '--:--';

  return (
    <aside className="self-start rounded-2xl border border-separator bg-surface-elevated p-4 text-label-primary shadow-2 lg:sticky lg:top-24">
      <div className="space-y-5">
        <section>
          <h3 className="text-sm font-bold text-label-primary">{t('seatMap.zonesAndPrices')}</h3>
          <div className="mt-3 space-y-2">
            {zoneGroups.map(zone => {
              const available = zone.seats.filter(seat => seat.status === 'available').length;
              return (
                <div key={zone.zone_id} className="rounded-xl border border-separator bg-fill-quaternary px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: zone.color }} />
                      <span className="truncate text-sm font-semibold text-label-primary">{zone.zone_name}</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-info">{formatVND(zone.price)}</span>
                  </div>
                  <p className="mt-1 text-xs text-label-secondary">{t('seatMap.seatsAvailableCount', { available, total: zone.seats.length })}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-t border-separator pt-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-label-primary">
              {hasHeldSeats ? t('seatMap.heldSeats') : t('seatMap.selectedSeats')}
            </h3>
            {hasHeldSeats && (
              <span className={`font-mono text-sm font-bold ${urgent ? 'text-danger animate-pulse' : warning ? 'text-warning' : 'text-warning'}`}>
                {renewing ? t('seatMap.renewing') : fmtCountdown}
              </span>
            )}
          </div>

          {activeSeats.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeSeats.map(seat => (
                <span key={seat.id} className="rounded-full border border-info bg-info-tint px-2.5 py-1 text-xs font-semibold text-info">
                  {seat.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-label-secondary">{t('seatMap.noSeatsSelected')}</p>
          )}

          {urgent && hasHeldSeats && (
            <p className="mt-3 rounded-xl border border-danger bg-danger-tint px-3 py-2 text-xs font-medium text-danger">
              {t('seatMap.urgentWarning')}
            </p>
          )}
        </section>

        <section className="border-t border-separator pt-4">
          <div className="flex items-end justify-between gap-3">
            <p className="text-xs text-label-secondary">{t('seatMap.estimatedTotal')}</p>
            <p className="text-xl font-extrabold text-info">{formatVND(total)}</p>
          </div>

          {hasHeldSeats ? (
            <div className="mt-4 grid gap-2">
              <button onClick={onCheckout} className="rounded-xl bg-success px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95">
                {t('seatMap.checkout')}
              </button>
              <button onClick={onRelease} className="rounded-xl border border-separator px-4 py-2.5 text-sm font-semibold text-label-secondary transition hover:bg-fill-quaternary hover:text-label-primary">
                {t('seatMap.releaseHold')}
              </button>
            </div>
          ) : (
            <div className="mt-4 grid gap-2">
              <button
                onClick={onHold}
                disabled={holding || selectedSeats.length === 0}
                className="rounded-xl bg-info px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {holding ? t('seatMap.holding') : t('seatMap.hold')}
              </button>
              <button
                onClick={onClear}
                disabled={holding || selectedSeats.length === 0}
                className="rounded-xl border border-separator px-4 py-2.5 text-sm font-semibold text-label-secondary transition hover:bg-fill-quaternary hover:text-label-primary disabled:cursor-not-allowed disabled:opacity-45"
              >
                {t('seatMap.deselect')}
              </button>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}

function ExpiredModal({ onClose }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-danger bg-surface-elevated p-8 text-center shadow-popover">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-danger bg-danger-tint">
          <svg className="h-8 w-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-bold text-label-primary">{t('seatMap.expiredTitle')}</h3>
        <p className="mb-6 text-sm leading-relaxed text-label-secondary">{t('seatMap.expiredDesc')}</p>
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:bg-accent-hover"
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
    <div className="mb-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-label-secondary">
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
export default function SeatMap({ eventId, layout = null }) {
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

  const handleQueueRequired = useCallback((err) => {
    const data = err.response?.data;
    if (data?.code !== 'QUEUE_REQUIRED') return false;

    if (user) {
      navigate(`/queue/${data.event_id || eventId}`, { replace: true });
    } else {
      setError(data.error || t('seatMap.holdError'));
    }
    return true;
  }, [eventId, navigate, t, user]);

  // ── Load seats ──
  useEffect(() => {
    api.get(`/events/${eventId}/seats`)
      .then(r => setSeats(r.data))
      .catch(err => {
        if (handleQueueRequired(err)) return;
        setError(err.response?.data?.error || t('seatMap.holdError'));
      });
  }, [eventId, handleQueueRequired, t]);

  // ── Real-time updates via Socket.io ──
  useEffect(() => {
    const socket = io('/', { auth: { token: localStorage.getItem('accessToken') || localStorage.getItem('token') } });
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
      if (handleQueueRequired(err)) return;
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
    api.get(`/events/${eventId}/seats`)
      .then(r => setSeats(r.data))
      .catch(err => {
        if (handleQueueRequired(err)) return;
        setError(err.response?.data?.error || t('seatMap.holdError'));
      });
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
  const total = [...selectedSeats, ...heldSeatObjs].reduce((acc, s) => acc + Number(s.price), 0);
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-4">
        <Legend />
        <VenueOverview
          layout={layout}
          zoneGroups={zoneGroups}
          selected={selected}
          heldSeats={new Set(heldSeats)}
          frozen={frozen}
          onSeatToggle={toggleSeat}
        />

        {error && (
          <p className="text-red-400 text-sm bg-red-950/30 border border-red-800/40 px-3 py-2 rounded-xl">
            {error}
          </p>
        )}
      </div>

      <BookingSidebar
        zoneGroups={zoneGroups}
        selectedSeats={selectedSeats}
        heldSeatObjs={heldSeatObjs}
        countdown={countdown}
        total={total}
        holding={holding}
        renewing={renewing}
        onHold={holdSeats}
        onClear={() => setSelected(new Set())}
        onRelease={releaseHeld}
        onCheckout={() => navigate('/checkout', { state: { seat_ids: heldSeats, seat_info: heldSeatObjs } })}
      />

      {showExpired && <ExpiredModal onClose={dismissExpired} />}
    </div>
  );
}
