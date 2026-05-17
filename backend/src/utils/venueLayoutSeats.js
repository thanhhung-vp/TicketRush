export function getSeatIndexKey(row, col) {
  return `${Number(row) || 0}:${Number(col) || 0}`;
}

export function buildSeatLabel(zoneName, row, col, maxLength = 20) {
  const rowLabel = String.fromCharCode(65 + Number(row || 0));
  const colLabel = String(Number(col || 0) + 1).padStart(2, '0');
  const suffix = `-${rowLabel}${colLabel}`;
  const fallback = 'Khu';
  const cleanName = String(zoneName || fallback).trim() || fallback;
  const prefixLength = Math.max(1, maxLength - suffix.length);
  return `${cleanName.slice(0, prefixLength)}${suffix}`.slice(0, maxLength);
}

function getFanGeometry(zone = {}) {
  const width = Math.max(0, Number(zone.width || 0));
  const height = Math.max(0, Number(zone.height || 0));
  return {
    width,
    height,
    cx: width / 2,
    cy: height * 1.06,
    innerRadius: height * 0.34,
    outerRadius: height * 0.96,
    startAngle: -130,
    endAngle: -50,
  };
}

function getFanSeatBounds(zone = {}) {
  const geometry = getFanGeometry(zone);
  const radialPadding = Math.max(18, geometry.height * 0.14);
  const anglePadding = 16;
  const innerSeatRadius = Math.min(
    geometry.outerRadius,
    geometry.innerRadius + radialPadding
  );
  const outerSeatRadius = Math.max(
    innerSeatRadius,
    geometry.outerRadius - radialPadding
  );

  return {
    ...geometry,
    innerSeatRadius,
    outerSeatRadius,
    startSeatAngle: geometry.startAngle + anglePadding,
    endSeatAngle: geometry.endAngle - anglePadding,
  };
}

function polarToPoint(cx, cy, radius, angleDeg) {
  const angle = angleDeg * Math.PI / 180;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function normalizeCount(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const count = Math.round(Number(value));
  if (!Number.isFinite(count)) return fallback;
  return Math.max(0, Math.min(50, count));
}

function normalizeGap(value, fallback) {
  const gap = Number(value);
  if (!Number.isFinite(gap)) return fallback;
  return Math.max(0, Math.min(80, gap));
}

function normalizeDisabledSeats(value = []) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => Math.round(Number(item)))
    .filter(item => Number.isFinite(item) && item >= 0 && item <= 50);
}

function getConfiguredRows(zone = {}) {
  if (Array.isArray(zone.rows)) return zone.rows;
  if (Array.isArray(zone.seatRows)) return zone.seatRows;
  if (Array.isArray(zone.rowLayout)) return zone.rowLayout;
  return null;
}

export function normalizeRowLayout(zone = {}) {
  const configuredRows = getConfiguredRows(zone);
  if (configuredRows) {
    return configuredRows.map(row => {
      const count = normalizeCount(row?.seatCount ?? row?.count, 0);
      return {
        seatCount: count,
        count,
        offsetX: Number.isFinite(Number(row?.offsetX)) ? Number(row.offsetX) : 0,
        gap: normalizeGap(row?.gap, 0),
        disabledSeats: normalizeDisabledSeats(row?.disabledSeats),
      };
    }).filter(row => row.seatCount > 0 || row.disabledSeats.length > 0);
  }

  const rowCount = Math.max(1, Math.min(50, Math.round(Number(zone.rowCount ?? zone.rows) || 1)));
  const defaultCols = Math.max(1, Math.min(50, Math.round(Number(zone.cols) || 1)));

  return Array.from({ length: rowCount }, (_, row) => {
    const count = normalizeCount(null, defaultCols);
    return { seatCount: count, count, offsetX: 0, gap: 0, disabledSeats: [] };
  });
}

function normalizeDisabledIndexes(disabledIndexes = []) {
  if (!Array.isArray(disabledIndexes)) return new Set();
  return new Set(disabledIndexes.map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') return getSeatIndexKey(item.row, item.col);
    return '';
  }).filter(Boolean));
}

function pointInPolygon(point, polygon = []) {
  if (!Array.isArray(polygon) || polygon.length < 3) return true;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = Number(polygon[i]?.x);
    const yi = Number(polygon[i]?.y);
    const xj = Number(polygon[j]?.x);
    const yj = Number(polygon[j]?.y);
    if (![xi, yi, xj, yj].every(Number.isFinite)) continue;

    const intersects = ((yi > point.y) !== (yj > point.y))
      && (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 1) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function isPointInsideZone(zone = {}, point = {}) {
  const width = Number(zone.width || 0);
  const height = Number(zone.height || 0);
  const x = Number(point.x);
  const y = Number(point.y);
  if (![width, height, x, y].every(Number.isFinite) || width <= 0 || height <= 0) return true;
  if (x < 0 || y < 0 || x > width || y > height) return false;
  if (!pointInPolygon({ x, y }, zone.maskPolygon)) return false;

  if (zone.shape === 'u_shape') {
    return !(x > width * 0.32 && x < width * 0.68 && y > height * 0.38);
  }
  if (zone.shape === 'circle') {
    const nx = (x - width / 2) / (width / 2);
    const ny = (y - height / 2) / (height / 2);
    return nx * nx + ny * ny <= 1;
  }
  if (zone.shape === 'semicircle') {
    const nx = (x - width / 2) / (width / 2);
    const ny = (y - height) / height;
    return nx * nx + ny * ny <= 1;
  }
  if (zone.shape === 'fan') {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle } = getFanGeometry(zone);
    const dx = x - cx;
    const dy = y - cy;
    const radius = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    return radius >= innerRadius - 0.5 && radius <= outerRadius + 0.5 && angle >= startAngle - 0.5 && angle <= endAngle + 0.5;
  }
  return true;
}

function materializeFanSeats(zone, rowLayout, disabled) {
  const {
    cx,
    cy,
    innerSeatRadius,
    outerSeatRadius,
    startSeatAngle,
    endSeatAngle,
  } = getFanSeatBounds(zone);
  const rowStep = rowLayout.length > 1 ? (outerSeatRadius - innerSeatRadius) / (rowLayout.length - 1) : 0;

  return rowLayout.flatMap((rowSpec, row) => {
    const count = rowSpec.seatCount;
    if (count <= 0) return [];
    const radius = innerSeatRadius + rowStep * row;
    const radiusAngleGap = rowSpec.gap > 0 ? rowSpec.gap * 180 / (Math.PI * radius) : 0;
    const usableStart = startSeatAngle + radiusAngleGap / 2;
    const usableEnd = endSeatAngle - radiusAngleGap / 2;
    const angleStep = count > 1 ? (usableEnd - usableStart) / (count - 1) : 0;
    const rowShiftAngle = rowSpec.offsetX * 180 / (Math.PI * radius);

    return Array.from({ length: count }, (_, col) => {
      const point = polarToPoint(cx, cy, radius, usableStart + angleStep * col + rowShiftAngle);
      return { row, col, x: point.x, y: point.y };
    });
  }).filter(seat => (
    !disabled.has(getSeatIndexKey(seat.row, seat.col))
      && !rowLayout[seat.row].disabledSeats.includes(seat.col)
      && isPointInsideZone(zone, { x: seat.x, y: seat.y })
  ));
}

export function materializeZoneSeats(zone = {}) {
  const padX = 14;
  const padY = 30;
  const width = Math.max(0, Number(zone.width || 0));
  const height = Math.max(0, Number(zone.height || 0));
  const rowLayout = normalizeRowLayout(zone);
  const disabled = normalizeDisabledIndexes(zone.disabledIndexes);
  if (zone.shape === 'fan') return materializeFanSeats(zone, rowLayout, disabled);

  const innerW = width - padX * 2;
  const innerH = height - padY - 10;

  if (innerW <= 0 || innerH <= 0) {
    return rowLayout.flatMap((row, rowIdx) => (
      Array.from({ length: row.seatCount }, (_, colIdx) => ({ row: rowIdx, col: colIdx }))
    )).filter(seat => !disabled.has(getSeatIndexKey(seat.row, seat.col)) && !rowLayout[seat.row].disabledSeats.includes(seat.col));
  }

  const rowH = innerH / rowLayout.length;
  const maxCols = Math.max(1, Math.max(...rowLayout.map(row => row.seatCount)));
  const cellW = innerW / maxCols;

  return rowLayout.flatMap((rowSpec, row) => {
    const rowWidth = rowSpec.seatCount * cellW + Math.max(0, rowSpec.seatCount - 1) * rowSpec.gap;
    const rowStart = padX + (innerW - rowWidth) / 2 + rowSpec.offsetX;
    const y = padY + row * rowH + rowH / 2;

    return Array.from({ length: rowSpec.seatCount }, (_, col) => {
      const x = rowStart + col * (cellW + rowSpec.gap) + cellW / 2;
      return { row, col, x, y };
    });
  }).filter(seat => (
    !disabled.has(getSeatIndexKey(seat.row, seat.col))
      && !rowLayout[seat.row].disabledSeats.includes(seat.col)
      && isPointInsideZone(zone, { x: seat.x, y: seat.y })
  ));
}
