import { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Transformer, Shape, Group, Line } from 'react-konva';

const CANVAS_W = 860;
const CANVAS_H = 540;

const PRESET_COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316'];

let _uid = 0;
function uid()      { return `tz_${++_uid}_${Date.now().toString(36)}`; }
function stageUid() { return `st_${++_uid}_${Date.now().toString(36)}`; }

function makeZone(idx = 0) {
  return {
    id: uid(), dbId: null,
    name: `Khu ${idx + 1}`,
    color: PRESET_COLORS[idx % PRESET_COLORS.length],
    price: 500000, rows: 5, cols: 8,
    x: 60 + (idx % 2) * 420,
    y: 140 + Math.floor(idx / 2) * 210,
    width: 300, height: 180,
  };
}

function makeStageEl(count = 0) {
  return {
    id: stageUid(),
    x: CANVAS_W / 2 - 110 + count * 12,
    y: 24 + count * 10,
    width: 220, height: 52,
    shape: 'trapezoid',
    label: 'SÂN KHẤU',
  };
}

function seatDots(zone) {
  const padX = 14, padY = 30;
  const innerW = zone.width - padX * 2;
  const innerH = zone.height - padY - 10;
  if (innerW <= 0 || innerH <= 0 || zone.rows <= 0 || zone.cols <= 0) return [];
  const cellW = innerW / zone.cols;
  const cellH = innerH / zone.rows;
  const r = Math.min(Math.max(2, cellW / 2.8), Math.max(2, cellH / 2.8), 6.5);
  const dots = [];
  for (let row = 0; row < zone.rows; row++)
    for (let col = 0; col < zone.cols; col++)
      dots.push({ x: padX + col * cellW + cellW / 2, y: padY + row * cellH + cellH / 2, r, key: row * 100 + col });
  return dots;
}

// ── Background grid ───────────────────────────────────────────────────────────
function GridLayer() {
  const lines = [];
  for (let x = 0; x <= CANVAS_W; x += 40)
    lines.push(<Line key={`v${x}`} points={[x, 0, x, CANVAS_H]} stroke="rgba(255,255,255,0.035)" strokeWidth={1} listening={false} />);
  for (let y = 0; y <= CANVAS_H; y += 40)
    lines.push(<Line key={`h${y}`} points={[0, y, CANVAS_W, y]} stroke="rgba(255,255,255,0.035)" strokeWidth={1} listening={false} />);
  return <Layer listening={false}>{lines}</Layer>;
}

// ── Stage shape renderer ──────────────────────────────────────────────────────
function StageShapeEl({ shape, width, height, isSelected }) {
  const stroke = isSelected ? 'rgba(200,170,255,0.95)' : 'rgba(200,180,255,0.4)';
  const sBlur  = isSelected ? 22 : 10;
  const sW     = isSelected ? 2 : 1.5;
  const grad   = { fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: height }, fillLinearGradientColorStops: [0, '#3d2d6a', 1, '#1a1a35'] };

  if (shape === 'trapezoid') {
    const off = width * 0.16;
    return (
      <Shape
        sceneFunc={(ctx, s) => {
          ctx.beginPath();
          ctx.moveTo(off, 0); ctx.lineTo(width - off, 0);
          ctx.lineTo(width, height); ctx.lineTo(0, height);
          ctx.closePath(); ctx.fillStrokeShape(s);
        }}
        {...grad}
        stroke={stroke} strokeWidth={sW}
        shadowColor="rgba(180,150,255,0.6)" shadowBlur={sBlur} shadowOpacity={0.7}
      />
    );
  }
  if (shape === 'rect') {
    return (
      <Rect width={width} height={height} {...grad}
        stroke={stroke} strokeWidth={sW} cornerRadius={4}
        shadowColor="rgba(180,150,255,0.6)" shadowBlur={sBlur} shadowOpacity={0.7}
      />
    );
  }
  if (shape === 'ellipse') {
    const rx = width / 2, ry = height / 2;
    return (
      <Shape
        sceneFunc={(ctx, s) => {
          ctx.beginPath();
          ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);
          ctx.closePath(); ctx.fillStrokeShape(s);
        }}
        {...grad}
        stroke={stroke} strokeWidth={sW}
        shadowColor="rgba(180,150,255,0.6)" shadowBlur={sBlur} shadowOpacity={0.7}
      />
    );
  }
  if (shape === 'semicircle') {
    const rx = width / 2;
    return (
      <Shape
        sceneFunc={(ctx, s) => {
          ctx.beginPath();
          ctx.arc(rx, height, rx, Math.PI, 0, false);
          ctx.closePath(); ctx.fillStrokeShape(s);
        }}
        {...grad}
        stroke={stroke} strokeWidth={sW}
        shadowColor="rgba(180,150,255,0.6)" shadowBlur={sBlur} shadowOpacity={0.7}
      />
    );
  }
  return null;
}

// ── Interactive stage group ───────────────────────────────────────────────────
function StageGroup({ stage, isSelected, onSelect, onUpdate }) {
  const groupRef = useRef();

  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current;
    if (!node) return;
    const sx = node.scaleX(), sy = node.scaleY();
    node.scaleX(1); node.scaleY(1);
    onUpdate({ ...stage, x: node.x(), y: node.y(), width: Math.max(80, stage.width * sx), height: Math.max(30, stage.height * sy) });
  }, [stage, onUpdate]);

  const labelY = stage.shape === 'semicircle' ? stage.height * 0.35 : stage.height / 2 - 7;

  return (
    <Group
      id={`stage-${stage.id}`}
      ref={groupRef}
      x={stage.x} y={stage.y}
      draggable
      onClick={onSelect} onTap={onSelect}
      onDragEnd={e => onUpdate({ ...stage, x: e.target.x(), y: e.target.y() })}
      onTransformEnd={handleTransformEnd}
    >
      {stage.shape === 'trapezoid' && [-40,-20,0,20,40].map((off, i) => (
        <Line key={i}
          points={[stage.width / 2 + off * 0.3, -30, stage.width / 2 + off * 3, -80]}
          stroke="rgba(255,255,255,0.04)" strokeWidth={6} listening={false}
        />
      ))}
      <StageShapeEl shape={stage.shape} width={stage.width} height={stage.height} isSelected={isSelected} />
      <Text
        text={stage.label || 'SÂN KHẤU'}
        x={0} y={labelY} width={stage.width}
        align="center" fontSize={11} fontStyle="bold" letterSpacing={3}
        fill="rgba(255,255,255,0.5)" listening={false}
      />
      <Line
        points={[0, stage.height + 2, stage.width, stage.height + 2]}
        stroke="rgba(160,130,255,0.5)" strokeWidth={2.5} listening={false}
      />
    </Group>
  );
}

// ── Zone group ────────────────────────────────────────────────────────────────
function ZoneGroup({ zone, isSelected, onSelect, onUpdate }) {
  const groupRef = useRef();
  const dots = seatDots(zone);

  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current;
    if (!node) return;
    const sx = node.scaleX(), sy = node.scaleY();
    node.scaleX(1); node.scaleY(1);
    onUpdate({ ...zone, x: node.x(), y: node.y(), width: Math.max(120, zone.width * sx), height: Math.max(80, zone.height * sy) });
  }, [zone, onUpdate]);

  return (
    <Group
      id={`zone-${zone.id}`}
      ref={groupRef}
      x={zone.x} y={zone.y}
      draggable
      onClick={onSelect} onTap={onSelect}
      onDragEnd={e => onUpdate({ ...zone, x: e.target.x(), y: e.target.y() })}
      onTransformEnd={handleTransformEnd}
    >
      <Rect
        width={zone.width} height={zone.height}
        fill={zone.color + '1a'} stroke={zone.color}
        strokeWidth={isSelected ? 2.5 : 1.5} cornerRadius={8}
        shadowColor={isSelected ? zone.color : 'transparent'}
        shadowBlur={isSelected ? 14 : 0} shadowOpacity={0.45}
      />
      <Text text={zone.name} x={10} y={7} width={zone.width - 20}
        fontSize={11} fontStyle="bold" fill={zone.color} ellipsis listening={false} />
      <Text
        text={`${(zone.price / 1000000).toFixed(1)}M · ${zone.rows}×${zone.cols} = ${zone.rows * zone.cols} ghế`}
        x={10} y={20} width={zone.width - 20} fontSize={9} fill={zone.color + '88'} listening={false}
      />
      {dots.map(d => <Circle key={d.key} x={d.x} y={d.y} radius={d.r} fill={zone.color + 'cc'} listening={false} />)}
    </Group>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function PropRow({ label, children }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 mb-1 font-medium">{label}</p>
      {children}
    </div>
  );
}
const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800';

const STAGE_SHAPES = [
  { value: 'trapezoid',  label: 'Thang',     icon: '⬠' },
  { value: 'rect',       label: 'Chữ nhật',  icon: '▬' },
  { value: 'ellipse',    label: 'Elip',      icon: '⬭' },
  { value: 'semicircle', label: 'Nửa tròn',  icon: '◖' },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function SeatDesigner({ initialLayout, onSave, saving }) {
  const [zones, setZones] = useState(() => {
    if (!initialLayout?.zones?.length) return [];
    return initialLayout.zones.map(z => ({
      id: String(z.id || uid()), dbId: z.dbId ?? null,
      name: z.name, color: z.color || '#3B82F6',
      price: Number(z.price) || 500000,
      rows: Number(z.rows) || 5, cols: Number(z.cols) || 8,
      x: Number(z.x) || 60, y: Number(z.y) || 140,
      width: Number(z.width) || 300, height: Number(z.height) || 180,
    }));
  });

  const [stageEls, setStageEls] = useState(() => {
    if (!initialLayout?.stages?.length) return [];
    return initialLayout.stages.map(s => ({
      id: String(s.id || stageUid()),
      x: Number(s.x) || CANVAS_W / 2 - 110,
      y: Number(s.y) || 24,
      width: Number(s.width) || 220,
      height: Number(s.height) || 52,
      shape: s.shape || 'trapezoid',
      label: s.label || 'SÂN KHẤU',
    }));
  });

  // selection: { kind: 'zone'|'stage', id } | null
  const [sel, setSel] = useState(null);
  const trRef    = useRef();
  const konvaRef = useRef();

  const selZone  = sel?.kind === 'zone'  ? zones.find(z => z.id === sel.id)    : null;
  const selStage = sel?.kind === 'stage' ? stageEls.find(s => s.id === sel.id) : null;

  // Attach Transformer to selected node
  useEffect(() => {
    if (!trRef.current || !konvaRef.current) return;
    if (sel) {
      const prefix = sel.kind === 'zone' ? 'zone' : 'stage';
      const node = konvaRef.current.findOne(`#${prefix}-${sel.id}`);
      if (node) { trRef.current.nodes([node]); trRef.current.getLayer()?.batchDraw(); return; }
    }
    trRef.current.nodes([]);
    trRef.current.getLayer()?.batchDraw();
  }, [sel, zones, stageEls]);

  const addZone = () => {
    const z = makeZone(zones.length);
    setZones(p => [...p, z]);
    setSel({ kind: 'zone', id: z.id });
  };

  const addStageEl = () => {
    const s = makeStageEl(stageEls.length);
    setStageEls(p => [...p, s]);
    setSel({ kind: 'stage', id: s.id });
  };

  const updateZone  = useCallback(u => setZones(p => p.map(z => z.id === u.id ? u : z)), []);
  const updateStage = useCallback(u => setStageEls(p => p.map(s => s.id === u.id ? u : s)), []);

  const setZoneProp  = (k, v) => selZone  && setZones(p => p.map(z => z.id === selZone.id  ? { ...z, [k]: v } : z));
  const setStageProp = (k, v) => selStage && setStageEls(p => p.map(s => s.id === selStage.id ? { ...s, [k]: v } : s));

  const deleteSelected = () => {
    if (sel?.kind === 'zone')  setZones(p => p.filter(z => z.id !== sel.id));
    if (sel?.kind === 'stage') setStageEls(p => p.filter(s => s.id !== sel.id));
    setSel(null);
  };

  const handleCanvasClick = e => { if (e.target === e.target.getStage()) setSel(null); };
  const totalSeats = zones.reduce((s, z) => s + z.rows * z.cols, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-5">
        {/* ── Canvas column ── */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={addZone}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Thêm khu
            </button>
            <button onClick={addStageEl}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
              Thêm sân khấu
            </button>
            {sel && (
              <button onClick={deleteSelected}
                className="flex items-center gap-1.5 text-red-500 hover:text-red-600 border border-red-200 hover:bg-red-50 text-sm font-medium px-4 py-2 rounded-xl transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                {sel.kind === 'stage' ? 'Xóa sân khấu' : 'Xóa khu'}
              </button>
            )}
            <span className="text-xs text-gray-400 ml-auto hidden sm:block">Kéo để di chuyển · Kéo góc để resize</span>
          </div>

          {/* Konva canvas */}
          <div className="rounded-2xl overflow-auto border border-gray-800" style={{ background: '#0d0d14', lineHeight: 0, maxWidth: '100%' }}>
            <Stage
              ref={konvaRef}
              width={CANVAS_W} height={CANVAS_H}
              style={{ display: 'block' }}
              onClick={handleCanvasClick} onTap={handleCanvasClick}
            >
              <GridLayer />
              <Layer>
                {stageEls.map(s => (
                  <StageGroup
                    key={s.id} stage={s}
                    isSelected={sel?.kind === 'stage' && sel.id === s.id}
                    onSelect={() => setSel({ kind: 'stage', id: s.id })}
                    onUpdate={updateStage}
                  />
                ))}
                {zones.map(zone => (
                  <ZoneGroup
                    key={zone.id} zone={zone}
                    isSelected={sel?.kind === 'zone' && sel.id === zone.id}
                    onSelect={() => setSel({ kind: 'zone', id: zone.id })}
                    onUpdate={updateZone}
                  />
                ))}
                <Transformer
                  ref={trRef}
                  rotateEnabled={false}
                  borderStroke="rgba(255,255,255,0.35)" borderStrokeWidth={1}
                  anchorFill="#ffffff" anchorStroke="#888" anchorStrokeWidth={1}
                  anchorSize={9} anchorCornerRadius={2}
                  enabledAnchors={['top-left','top-center','top-right','middle-left','middle-right','bottom-left','bottom-center','bottom-right']}
                  boundBoxFunc={(oldBox, newBox) => {
                    const minW = sel?.kind === 'stage' ? 80  : 120;
                    const minH = sel?.kind === 'stage' ? 30  : 80;
                    return (newBox.width < minW || newBox.height < minH) ? oldBox : newBox;
                  }}
                />
              </Layer>
            </Stage>
          </div>
        </div>

        {/* ── Properties panel ── */}
        <div className="w-60 shrink-0 space-y-3">
          {selZone ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 text-sm">Khu vực</h3>
                <button onClick={deleteSelected}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <PropRow label="Tên khu">
                <input type="text" value={selZone.name} onChange={e => setZoneProp('name', e.target.value)} className={inputCls} />
              </PropRow>

              <PropRow label="Màu sắc">
                <div className="flex items-center gap-2 mb-2">
                  <input type="color" value={selZone.color} onChange={e => setZoneProp('color', e.target.value)}
                    className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-gray-50" />
                  <span className="text-xs text-gray-400">{selZone.color}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setZoneProp('color', c)}
                      className="w-full aspect-square rounded-lg transition hover:scale-110"
                      style={{ backgroundColor: c, outline: selZone.color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
                    />
                  ))}
                </div>
              </PropRow>

              <PropRow label="Giá vé (VNĐ)">
                <input type="number" min="0" step="50000" value={selZone.price}
                  onChange={e => setZoneProp('price', Math.max(0, Number(e.target.value)))} className={inputCls} />
              </PropRow>

              <div className="grid grid-cols-2 gap-2">
                <PropRow label="Số hàng">
                  <input type="number" min="1" max="30" value={selZone.rows}
                    onChange={e => setZoneProp('rows', Math.max(1, Math.min(30, Number(e.target.value))))} className={inputCls} />
                </PropRow>
                <PropRow label="Ghế/hàng">
                  <input type="number" min="1" max="30" value={selZone.cols}
                    onChange={e => setZoneProp('cols', Math.max(1, Math.min(30, Number(e.target.value))))} className={inputCls} />
                </PropRow>
              </div>

              <div className="rounded-xl p-3 text-center"
                style={{ backgroundColor: selZone.color + '15', border: `1px solid ${selZone.color}30` }}>
                <p className="text-2xl font-bold" style={{ color: selZone.color }}>{selZone.rows * selZone.cols}</p>
                <p className="text-xs text-gray-400 mt-0.5">ghế trong khu này</p>
              </div>
            </div>

          ) : selStage ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 text-sm">Sân khấu</h3>
                <button onClick={deleteSelected}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <PropRow label="Nhãn">
                <input type="text" value={selStage.label}
                  onChange={e => setStageProp('label', e.target.value)} className={inputCls} />
              </PropRow>

              <PropRow label="Hình dạng">
                <div className="grid grid-cols-2 gap-2">
                  {STAGE_SHAPES.map(sh => (
                    <button key={sh.value} onClick={() => setStageProp('shape', sh.value)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition
                        ${selStage.shape === sh.value
                          ? 'bg-purple-50 border-purple-400 text-purple-700'
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      <span className="text-base leading-none">{sh.icon}</span>
                      {sh.label}
                    </button>
                  ))}
                </div>
              </PropRow>

              <div className="rounded-xl p-3 text-center bg-purple-50 border border-purple-100">
                <p className="text-xs text-purple-600 font-medium">Kéo để di chuyển</p>
                <p className="text-xs text-purple-400 mt-0.5">Kéo góc để thay đổi kích thước</p>
              </div>
            </div>

          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/>
                </svg>
              </div>
              <p className="text-sm text-gray-500 font-medium">Chưa chọn phần tử</p>
              <p className="text-xs text-gray-400 mt-1">Click vào khu hoặc sân khấu</p>
            </div>
          )}

          {/* Summary */}
          {(zones.length > 0 || stageEls.length > 0) && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-blue-700 mb-3 uppercase tracking-wide">Tổng quan</p>

              {stageEls.length > 0 && (
                <div className="space-y-1 mb-2">
                  <p className="text-[10px] text-purple-500 font-bold uppercase tracking-wide mb-1">Sân khấu</p>
                  {stageEls.map(s => (
                    <button key={s.id} onClick={() => setSel({ kind: 'stage', id: s.id })}
                      className={`w-full flex items-center gap-2 text-xs text-left p-2 rounded-lg transition
                        ${sel?.kind === 'stage' && sel.id === s.id ? 'bg-white shadow-sm' : 'hover:bg-white/60'}`}>
                      <span className="text-purple-400 text-sm leading-none">⬠</span>
                      <span className="flex-1 text-gray-700 font-medium truncate">{s.label}</span>
                      <span className="text-gray-400 shrink-0 text-[10px] capitalize">{s.shape}</span>
                    </button>
                  ))}
                </div>
              )}

              {zones.length > 0 && (
                <div className="space-y-1">
                  {stageEls.length > 0 && <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wide mb-1">Khu vực</p>}
                  {zones.map(z => (
                    <button key={z.id} onClick={() => setSel({ kind: 'zone', id: z.id })}
                      className={`w-full flex items-center gap-2 text-xs text-left p-2 rounded-lg transition
                        ${sel?.kind === 'zone' && sel.id === z.id ? 'bg-white shadow-sm' : 'hover:bg-white/60'}`}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                      <span className="flex-1 text-gray-700 font-medium truncate">{z.name}</span>
                      <span className="text-gray-400 shrink-0">{z.rows * z.cols} ghế</span>
                    </button>
                  ))}
                  <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between text-xs">
                    <span className="font-semibold text-blue-700">{zones.length} khu</span>
                    <span className="font-bold text-blue-700">{totalSeats} ghế tổng</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-400 max-w-xs">
          Lưu sơ đồ sẽ xóa toàn bộ ghế cũ và sinh lại từ thiết kế mới.
        </p>
        <button
          onClick={() => onSave(zones, stageEls, { width: CANVAS_W, height: CANVAS_H })}
          disabled={saving || zones.length === 0}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm shadow-md shadow-emerald-500/20"
        >
          {saving ? '⏳ Đang lưu...' : '✓ Lưu sơ đồ chỗ ngồi'}
        </button>
      </div>
    </div>
  );
}
