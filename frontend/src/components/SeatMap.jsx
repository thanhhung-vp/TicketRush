import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Stage as KonvaStage, Layer, Group, Shape, Line, Rect, Text } from 'react-konva';

const CANVAS_W  = 860;
const STAGE_H   = 160;
const WARN_AT   = 120;
const URGENT_AT = 60;

function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Konva stage element (visual only, not interactive) ────────────────────────
function StageEl({ stage }) {
  const { x, y, width:w, height:h, shape, label } = stage;
  const grad = { fillLinearGradientStartPoint:{x:0,y:0}, fillLinearGradientEndPoint:{x:0,y:h}, fillLinearGradientColorStops:[0,'#4c3b8a',1,'#1a1535'] };
  const stroke = 'rgba(139,92,246,0.65)';
  const labelY = shape==='semicircle' ? h*0.35 : shape==='arrow' ? h*0.2 : h/2-7;

  const renderShape = () => {
    if (shape==='trapezoid') { const off=w*0.16; return <Shape sceneFunc={(ctx,s)=>{ ctx.beginPath();ctx.moveTo(off,0);ctx.lineTo(w-off,0);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fillStrokeShape(s); }} {...grad} stroke={stroke} strokeWidth={1.5} shadowColor="#7c3aed" shadowBlur={8} shadowOpacity={0.6}/>; }
    if (shape==='ellipse') { const rx=w/2,ry=h/2; return <Shape sceneFunc={(ctx,s)=>{ ctx.beginPath();ctx.ellipse(rx,ry,rx,ry,0,0,Math.PI*2);ctx.closePath();ctx.fillStrokeShape(s); }} {...grad} stroke={stroke} strokeWidth={1.5} shadowColor="#7c3aed" shadowBlur={8} shadowOpacity={0.6}/>; }
    if (shape==='semicircle') { const rx=w/2; return <Shape sceneFunc={(ctx,s)=>{ ctx.beginPath();ctx.arc(rx,h,rx,Math.PI,0,false);ctx.closePath();ctx.fillStrokeShape(s); }} {...grad} stroke={stroke} strokeWidth={1.5} shadowColor="#7c3aed" shadowBlur={8} shadowOpacity={0.6}/>; }
    if (shape==='pentagon') return <Shape sceneFunc={(ctx,s)=>{ const cx=w/2,cy=h/2,a=2*Math.PI/5;ctx.beginPath();for(let i=0;i<5;i++){const px=cx+(w/2)*Math.cos(-Math.PI/2+i*a),py=cy+(h/2)*Math.sin(-Math.PI/2+i*a);i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}ctx.closePath();ctx.fillStrokeShape(s); }} {...grad} stroke={stroke} strokeWidth={1.5} shadowColor="#7c3aed" shadowBlur={8} shadowOpacity={0.6}/>;
    if (shape==='hexagon') return <Shape sceneFunc={(ctx,s)=>{ const cx=w/2,cy=h/2;ctx.beginPath();for(let i=0;i<6;i++){const px=cx+(w/2)*Math.cos(i*Math.PI/3),py=cy+(h/2)*Math.sin(i*Math.PI/3);i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}ctx.closePath();ctx.fillStrokeShape(s); }} {...grad} stroke={stroke} strokeWidth={1.5} shadowColor="#7c3aed" shadowBlur={8} shadowOpacity={0.6}/>;
    if (shape==='diamond') return <Shape sceneFunc={(ctx,s)=>{ ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w,h/2);ctx.lineTo(w/2,h);ctx.lineTo(0,h/2);ctx.closePath();ctx.fillStrokeShape(s); }} {...grad} stroke={stroke} strokeWidth={1.5} shadowColor="#7c3aed" shadowBlur={8} shadowOpacity={0.6}/>;
    if (shape==='arrow') return <Shape sceneFunc={(ctx,s)=>{ ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,0);ctx.lineTo(w,h*0.5);ctx.lineTo(w/2,h);ctx.lineTo(0,h*0.5);ctx.closePath();ctx.fillStrokeShape(s); }} {...grad} stroke={stroke} strokeWidth={1.5} shadowColor="#7c3aed" shadowBlur={8} shadowOpacity={0.6}/>;
    return <Rect width={w} height={h} {...grad} stroke={stroke} strokeWidth={1.5} cornerRadius={4} shadowColor="#7c3aed" shadowBlur={8} shadowOpacity={0.6}/>;
  };

  return (
    <Group x={x} y={y} listening={false}>
      {shape==='trapezoid' && [-40,-20,0,20,40].map((off,i)=>(
        <Line key={i} points={[w/2+off*0.3,-28,w/2+off*3,-72]} stroke="rgba(100,60,200,0.12)" strokeWidth={7} listening={false}/>
      ))}
      {renderShape()}
      <Text text={label||'SÂN KHẤU'} x={0} y={labelY} width={w} align="center" fontSize={11} fontStyle="bold" letterSpacing={3} fill="rgba(255,255,255,0.65)" listening={false}/>
      <Line points={[0,h+2,w,h+2]} stroke="rgba(139,92,246,0.35)" strokeWidth={2.5} listening={false}/>
    </Group>
  );
}

// ── Seat button ───────────────────────────────────────────────────────────────
function SeatBtn({ seat, status, zoneColor, onToggle, frozen }) {
  let cls='transition-all duration-100 ', style={};
  if (frozen&&status==='available') { cls+='cursor-not-allowed opacity-40'; style={backgroundColor:hexToRgba(zoneColor,0.12),border:`1.5px solid ${hexToRgba(zoneColor,0.25)}`}; }
  else if (status==='available')    { cls+='cursor-pointer hover:scale-110 hover:brightness-125'; style={backgroundColor:hexToRgba(zoneColor,0.22),border:`1.5px solid ${hexToRgba(zoneColor,0.55)}`}; }
  else if (status==='selected')     { cls+='cursor-pointer scale-105'; style={backgroundColor:'#3b82f6',border:'2px solid #93c5fd',boxShadow:'0 0 8px rgba(59,130,246,0.55)'}; }
  else if (status==='locked')       { cls+='cursor-not-allowed opacity-85'; style={backgroundColor:'#d97706',border:'1.5px solid #fbbf24'}; }
  else                              { cls+='cursor-not-allowed opacity-30'; style={backgroundColor:'#374151',border:'1px solid #4b5563'}; }
  const label={available:'Còn trống',selected:'Đã chọn',locked:'Đang giữ',sold:'Đã bán'}[status]||'';
  return <button title={`${seat.label} · ${label}`} onClick={()=>!frozen&&onToggle(seat)} className={`w-7 h-7 rounded-t-md rounded-b-sm ${cls}`} style={style}/>;
}

// ── Zone grid (HTML, used for all events) ─────────────────────────────────────
function ZoneGrid({ zone, selected, heldSeats, onToggle, frozen, onGaClick }) {
  const rows = {};
  zone.seats.forEach(s => { (rows[s.row_idx]??=[]).push(s); });
  const sortedRows = Object.entries(rows).sort(([a],[b])=>Number(a)-Number(b));
  const colCount = Math.max(...Object.values(rows).map(r=>r.length));
  const available = zone.seats.filter(s=>s.status==='available').length;

  if (zone.ga) {
    const canClick = available > 0 && !frozen && onGaClick;
    return (
      <div className="mb-6 p-4 rounded-2xl border transition cursor-pointer select-none"
        style={{ borderColor: zone.color+'60', backgroundColor: zone.color+'18' }}
        onClick={() => canClick && onGaClick()}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-6 rounded-full shrink-0" style={{backgroundColor:zone.color}}/>
          <span className="font-bold text-white text-sm">{zone.zone_name}</span>
          <span className="text-gray-400 text-xs">{formatVND(zone.price)}/vé</span>
          <div className="ml-auto text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{backgroundColor:zone.color+'25',color:zone.color}}>
            {available}/{zone.seats.length} còn trống
          </div>
        </div>
        {canClick && <p className="text-center text-xs mt-1" style={{color:zone.color+'88'}}>Nhấn để chọn số vé</p>}
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 rounded-full shrink-0" style={{backgroundColor:zone.color}}/>
        <span className="font-bold text-white text-sm tracking-wide">{zone.zone_name}</span>
        <span className="text-gray-400 text-xs">{formatVND(zone.price)}/ghế</span>
        <div className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{backgroundColor:hexToRgba(zone.color,0.15),color:zone.color}}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{backgroundColor:zone.color}}/>{available}/{zone.seats.length} còn trống
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="inline-block">
          <div className="flex gap-1 mb-1.5 pl-7 pr-7">
            {Array.from({length:colCount},(_,i)=><div key={i} className="w-7 text-center text-[10px] text-gray-600">{i+1}</div>)}
          </div>
          {sortedRows.map(([rowIdx,rowSeats])=>{
            const rowLabel=String.fromCharCode(65+Number(rowIdx));
            return (
              <div key={rowIdx} className="flex items-center gap-1 mb-1">
                <span className="w-6 text-[11px] text-gray-500 text-right shrink-0">{rowLabel}</span>
                {[...rowSeats].sort((a,b)=>a.col_idx-b.col_idx).map(seat=>{
                  const isSelected=selected.has(seat.id),isHeld=heldSeats.has(seat.id);
                  const status=isSelected?'selected':isHeld?'locked':seat.status;
                  return <SeatBtn key={seat.id} seat={seat} status={status} zoneColor={zone.color} onToggle={onToggle} frozen={frozen}/>;
                })}
                <span className="w-6 text-[11px] text-gray-500 ml-0.5 shrink-0">{rowLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 border-t border-gray-800/60"/>
    </div>
  );
}

// ── GA zone picker panel ──────────────────────────────────────────────────────
function GaPickerPanel({ picker, selectedSize, onPick, onClose }) {
  const { zone, availSeats } = picker;
  const maxCanAdd = Math.min(8 - selectedSize, availSeats.length);
  if (maxCanAdd <= 0) {
    return (
      <div className="mt-4 bg-gray-900/80 border border-orange-600/40 rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-orange-300 text-sm font-medium">Đã chọn tối đa 8 vé.</p>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 bg-gray-900/80 border border-orange-600/40 rounded-2xl px-5 py-4 backdrop-blur-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Chọn số vé</p>
          <p className="font-bold text-white text-sm">{zone.name}</p>
          <p className="text-orange-400 text-sm font-semibold mt-0.5">{formatVND(zone.price)}/vé · {availSeats.length} còn trống</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none mt-0.5">×</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({length: maxCanAdd}, (_,i) => i+1).map(n => (
          <button key={n} onClick={() => onPick(n)}
            className="w-11 h-11 rounded-xl bg-orange-600/80 hover:bg-orange-500 text-white font-bold text-base transition shadow-sm">
            {n}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-gray-500 mt-2">Còn có thể chọn thêm {maxCanAdd} vé (tối đa 8 vé/lần)</p>
    </div>
  );
}

// ── Selection panel ───────────────────────────────────────────────────────────
function SelectionPanel({ selectedSeats, total, holding, onHold, onClear }) {
  return (
    <div className="mt-4 bg-gray-900/80 border border-blue-700/50 rounded-2xl px-5 py-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between backdrop-blur-sm">
      <div>
        <p className="text-xs text-gray-400 mb-0.5">Vé đã chọn</p>
        <p className="font-semibold text-white text-sm">{selectedSeats.map(s=>s.label).join(' · ')}</p>
        <p className="text-blue-400 font-bold text-lg mt-1">{formatVND(total)}</p>
      </div>
      <div className="flex gap-2.5">
        <button onClick={onClear} disabled={holding}
          className="text-sm text-gray-400 hover:text-white px-4 py-2.5 border border-gray-700 rounded-xl transition disabled:opacity-40">
          Bỏ chọn
        </button>
        <button onClick={onHold} disabled={holding}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm">
          {holding ? <span className="flex items-center gap-2"><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Đang giữ...</span> : 'Giữ chỗ →'}
        </button>
      </div>
    </div>
  );
}

// ── Hold panel ────────────────────────────────────────────────────────────────
function HoldPanel({ heldSeatObjs, countdown, total, renewing, onRelease, onCheckout }) {
  const urgent  = countdown !== null && countdown <= URGENT_AT;
  const warning = countdown !== null && countdown <= WARN_AT && countdown > URGENT_AT;
  const fmt = countdown != null ? `${Math.floor(countdown/60)}:${String(countdown%60).padStart(2,'0')}` : '--:--';
  return (
    <div className={`mt-4 rounded-2xl px-5 py-4 space-y-3 backdrop-blur-sm border ${urgent?'bg-red-950/60 border-red-500/50':'bg-gray-900/80 border-amber-600/50'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Vé đang giữ</p>
          <p className="font-semibold text-white text-sm">{heldSeatObjs.map(s=>s.label).join(' · ')}</p>
        </div>
        <span className={`text-2xl font-mono font-bold tabular-nums ${urgent?'text-red-400 animate-pulse':warning?'text-amber-300':'text-amber-400'}`}>
          {renewing ? <span className="text-base text-emerald-400 animate-pulse">Đang gia hạn...</span> : `⏱ ${fmt}`}
        </span>
      </div>
      {urgent && (
        <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-xl px-3 py-2">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          <p className="text-red-300 text-xs font-medium">Còn ít hơn 1 phút! Hãy hoàn tất thanh toán ngay.</p>
        </div>
      )}
      <p className="text-blue-400 font-bold text-lg">{formatVND(total)}</p>
      <div className="flex gap-2.5">
        <button onClick={onRelease} className="text-sm text-gray-400 hover:text-white px-4 py-2.5 border border-gray-700 rounded-xl transition">Hủy giữ chỗ</button>
        <button onClick={onCheckout} className="bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm">Thanh toán →</button>
      </div>
    </div>
  );
}

// ── Expired modal ─────────────────────────────────────────────────────────────
function ExpiredModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h3 className="text-white font-bold text-lg mb-2">Thời gian giữ chỗ đã hết</h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">Vé của bạn đã được trả về hệ thống. Vui lòng chọn lại để tiếp tục.</p>
        <button onClick={onClose} className="w-full py-3 rounded-xl text-white font-semibold text-sm transition" style={{background:'linear-gradient(90deg,#f9a8d4,#ec4899)'}}>Chọn lại</button>
      </div>
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-400 mb-4">
      {[
        {style:{backgroundColor:'rgba(255,255,255,0.12)',border:'1.5px solid rgba(255,255,255,0.3)'},label:'Còn trống'},
        {style:{backgroundColor:'#3b82f6',boxShadow:'0 0 6px rgba(59,130,246,0.6)'},label:'Đang chọn'},
        {style:{backgroundColor:'#d97706'},label:'Đang giữ'},
        {style:{backgroundColor:'#374151',opacity:0.4},label:'Đã bán'},
      ].map(({style,label})=>(
        <span key={label} className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-t-md rounded-b-sm inline-block" style={style}/>{label}
        </span>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SeatMap({ eventId, layoutJson }) {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [seats,        setSeats]        = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [selected,     setSelected]     = useState(new Set());
  const [holding,      setHolding]      = useState(false);
  const [countdown,    setCountdown]    = useState(null);
  const [heldSeats,    setHeldSeats]    = useState([]);
  const [renewing,     setRenewing]     = useState(false);
  const [renewedOnce,  setRenewedOnce]  = useState(false);
  const [showExpired,  setShowExpired]  = useState(false);
  const [error,        setError]        = useState('');
  const [gaZonePicker, setGaZonePicker] = useState(null);
  const containerRef = useRef();
  const [canvasScale, setCanvasScale]  = useState(1);

  const frozen = holding || heldSeats.length > 0;
  const hasStages = Boolean(layoutJson?.stages?.length);

  // ── Responsive canvas scale (for stage canvas) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => { const w=el.clientWidth; if(w>0) setCanvasScale(Math.min(1,w/CANVAS_W)); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Load seats ──
  useEffect(() => {
    setLoadingSeats(true);
    api.get(`/events/${eventId}/seats`).then(r => setSeats(r.data)).finally(() => setLoadingSeats(false));
  }, [eventId]);

  // ── Socket.io real-time ──
  useEffect(() => {
    const socket = io('/', { auth: { token: localStorage.getItem('token') } });
    socket.emit('join:event', eventId);
    socket.on('seats:updated', (updatedSeats) => {
      setSeats(prev => {
        const map = new Map(prev.map(s=>[s.id,s]));
        updatedSeats.forEach(u=>{ if(map.has(u.id)) map.set(u.id,{...map.get(u.id),status:u.status}); });
        return Array.from(map.values());
      });
      setSelected(prev => {
        const next = new Set(prev);
        updatedSeats.forEach(u=>{ if(u.status!=='available') next.delete(u.id); });
        return next;
      });
    });
    return () => { socket.emit('leave:event',eventId); socket.disconnect(); };
  }, [eventId]);

  // ── Countdown + auto-renew ──
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === WARN_AT && !renewedOnce && heldSeats.length > 0) {
      setRenewedOnce(true); setRenewing(true);
      api.post('/seats/renew', { seat_ids: heldSeats })
        .then(({data}) => setCountdown(Math.max(0, Math.floor((new Date(data.locked_until)-Date.now())/1000))))
        .catch(()=>{}).finally(()=>setRenewing(false));
    }
    if (countdown <= 0) { setCountdown(null); setHeldSeats([]); setRenewedOnce(false); setShowExpired(true); return; }
    const t = setTimeout(()=>setCountdown(c=>(c!==null&&c>0?c-1:0)), 1000);
    return () => clearTimeout(t);
  }, [countdown, heldSeats, renewedOnce]);

  // ── Toggle individual seat ──
  const toggleSeat = useCallback((seat) => {
    if (!user) { navigate('/login'); return; }
    if (seat.status !== 'available' || frozen) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else if (next.size < 8) next.add(seat.id);
      return next;
    });
  }, [user, frozen, navigate]);

  // ── GA zone: open picker ──
  const handleGaZoneClick = useCallback((zone, availSeats) => {
    if (!user) { navigate('/login'); return; }
    if (frozen) return;
    setGaZonePicker({ zone, availSeats });
  }, [user, frozen, navigate]);

  // ── GA zone: pick N tickets ──
  const addGaTickets = useCallback((count) => {
    if (!gaZonePicker) return;
    const { availSeats } = gaZonePicker;
    const remaining = Math.max(0, 8 - selected.size);
    const actualCount = Math.min(count, remaining, availSeats.length);
    if (actualCount <= 0) { setGaZonePicker(null); return; }
    const picked = [...availSeats].sort(()=>Math.random()-0.5).slice(0, actualCount);
    setSelected(prev => { const next=new Set(prev); picked.forEach(s=>next.add(s.id)); return next; });
    setGaZonePicker(null);
  }, [gaZonePicker, selected]);

  // ── Hold seats ──
  const holdSeats = async () => {
    if (selected.size === 0) return;
    setHolding(true); setError('');
    try {
      const seatIds = Array.from(selected);
      const { data } = await api.post('/seats/hold', { seat_ids: seatIds });
      setHeldSeats(seatIds); setSelected(new Set()); setRenewedOnce(false);
      setCountdown(Math.max(0, Math.floor((new Date(data.locked_until)-Date.now())/1000)));
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể giữ chỗ, vui lòng thử lại.');
      const takenIds = err.response?.data?.seats;
      if (takenIds?.length) setSelected(prev=>{ const n=new Set(prev); takenIds.forEach(id=>n.delete(id)); return n; });
    } finally { setHolding(false); }
  };

  // ── Release ──
  const releaseHeld = async () => {
    await api.post('/seats/release', { seat_ids: heldSeats });
    setHeldSeats([]); setCountdown(null); setRenewedOnce(false);
  };

  const dismissExpired = () => {
    setShowExpired(false);
    api.get(`/events/${eventId}/seats`).then(r=>setSeats(r.data));
  };

  // ── Derived data ──
  const heldSet = useMemo(() => new Set(heldSeats), [heldSeats]);

  // Group seats by zone_id for ZoneGrid
  const zonesGrouped = useMemo(() => {
    const g = {};
    seats.forEach(s => { if(!g[s.zone_id]) g[s.zone_id]={...s,seats:[]}; g[s.zone_id].seats.push(s); });
    return g;
  }, [seats]);

  // Map zone DB id → ga flag from layout_json
  const zoneGaLookup = useMemo(() => {
    const m = new Map();
    (layoutJson?.zones || []).forEach(z => m.set(Number(z.dbId), Boolean(z.ga)));
    return m;
  }, [layoutJson]);

  const selectedSeats = seats.filter(s=>selected.has(s.id));
  const heldSeatObjs  = seats.filter(s=>heldSeats.includes(s.id));
  const total = [...selectedSeats,...heldSeatObjs].reduce((acc,s)=>acc+Number(s.price),0);

  return (
    <div>
      <Legend />

      {/* ── Stage visualization ── */}
      {hasStages ? (
        <div ref={containerRef} className="rounded-xl overflow-hidden mb-6 select-none" style={{lineHeight:0}}>
          <KonvaStage
            width={CANVAS_W * canvasScale}
            height={STAGE_H * canvasScale}
            scaleX={canvasScale}
            scaleY={canvasScale}
            style={{display:'block', background:'#0f0f1a', borderRadius:'0.75rem'}}
            listening={false}
          >
            <Layer listening={false}>
              {layoutJson.stages.map(s => <StageEl key={s.id} stage={s}/>)}
            </Layer>
          </KonvaStage>
        </div>
      ) : (
        <div ref={containerRef} className="flex flex-col items-center mb-8 select-none">
          <div className="px-10 py-3 text-white/50 text-[11px] font-bold tracking-[0.3em] uppercase rounded-sm border border-white/10 bg-white/5">
            Sân khấu
          </div>
          <div className="mt-1 w-48 h-0.5 bg-gradient-to-r from-transparent via-white/10 to-transparent"/>
        </div>
      )}

      {/* ── Loading ── */}
      {loadingSeats && (
        <div className="flex items-center justify-center py-10 gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin"/>
          Đang tải chỗ ngồi...
        </div>
      )}

      {/* ── Zone grids (always HTML) ── */}
      {!loadingSeats && Object.values(zonesGrouped).map(zone => {
        const isGa = zoneGaLookup.get(zone.zone_id) || false;
        const augmented = { ...zone, ga: isGa };
        const gaAvail = isGa
          ? zone.seats.filter(s => s.status==='available' && !heldSet.has(s.id) && !selected.has(s.id))
          : [];
        return (
          <ZoneGrid
            key={zone.zone_id}
            zone={augmented}
            selected={selected}
            heldSeats={heldSet}
            onToggle={toggleSeat}
            frozen={frozen}
            onGaClick={isGa ? () => handleGaZoneClick({ name: zone.zone_name, price: zone.price, color: zone.color }, gaAvail) : undefined}
          />
        );
      })}

      {/* GA picker */}
      {gaZonePicker && !frozen && (
        <GaPickerPanel
          picker={gaZonePicker}
          selectedSize={selected.size}
          onPick={addGaTickets}
          onClose={() => setGaZonePicker(null)}
        />
      )}

      {error && <p className="text-red-400 text-sm bg-red-950/30 border border-red-800/40 px-3 py-2 rounded-xl mt-2">{error}</p>}

      {heldSeats.length > 0 ? (
        <HoldPanel heldSeatObjs={heldSeatObjs} countdown={countdown} total={total} renewing={renewing}
          onRelease={releaseHeld}
          onCheckout={()=>navigate('/checkout',{state:{seat_ids:heldSeats,seat_info:heldSeatObjs}})}/>
      ) : selected.size > 0 ? (
        <SelectionPanel selectedSeats={selectedSeats} total={total} holding={holding}
          onHold={holdSeats} onClear={()=>setSelected(new Set())}/>
      ) : null}

      {showExpired && <ExpiredModal onClose={dismissExpired}/>}
    </div>
  );
}
