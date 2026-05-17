import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUDIENCE_ZONE_SHAPES,
  STAGE_LAYOUT_TYPES,
  buildZoneSeatLayout,
  clampOverviewZoom,
  clampRotation,
  getFanGeometry,
  getFanSeatBounds,
  getFanZonePath,
  getAudienceShapeLabel,
  getStageLayoutLabel,
  normalizeRowLayout,
} from '../src/utils/venueLayout.js';

test('exposes the requested audience area shapes', () => {
  assert.deepEqual(
    AUDIENCE_ZONE_SHAPES.map(shape => shape.value),
    ['rect', 'fan', 'semicircle', 'circle', 'u_shape']
  );
  assert.equal(getAudienceShapeLabel('fan'), 'Hinh quat');
  assert.equal(getAudienceShapeLabel('unknown'), 'Hinh chu nhat');
});

test('exposes the requested stage layout types', () => {
  assert.deepEqual(
    STAGE_LAYOUT_TYPES.map(shape => shape.value),
    ['proscenium', 'thrust', 'arena', 'traverse', 'catwalk']
  );
  assert.equal(getStageLayoutLabel('catwalk'), 'Catwalk / runway');
  assert.equal(getStageLayoutLabel('legacy'), 'Proscenium / mot huong');
});

test('normalizes rotation to a 0-359 degree range', () => {
  assert.equal(clampRotation(725), 5);
  assert.equal(clampRotation(-30), 330);
  assert.equal(clampRotation('90'), 90);
  assert.equal(clampRotation('abc'), 0);
});

test('clamps overview zoom to a usable range', () => {
  assert.equal(clampOverviewZoom(0.2), 0.75);
  assert.equal(clampOverviewZoom(1.333), 1.33);
  assert.equal(clampOverviewZoom(4), 3);
  assert.equal(clampOverviewZoom('bad'), 1);
});

test('builds seats from per-row counts and offsets in zone-local coordinates', () => {
  const seats = buildZoneSeatLayout({
    width: 200,
    height: 120,
    rows: [
      { seatCount: 2, offsetX: -10 },
      { seatCount: 4, offsetX: 0 },
      { seatCount: 2, offsetX: 10 },
    ],
  });

  assert.equal(seats.length, 8);
  assert.deepEqual(seats.map(seat => `${seat.row}:${seat.col}`), [
    '0:0', '0:1',
    '1:0', '1:1', '1:2', '1:3',
    '2:0', '2:1',
  ]);
  assert.ok(seats[0].x < seats[6].x, 'row offsetX should shift local seat positions');
});

test('removes disabled seats and seats outside a U-shaped zone cutout', () => {
  const seats = buildZoneSeatLayout({
    width: 220,
    height: 150,
    shape: 'u_shape',
    rows: [
      { seatCount: 8, disabledSeats: [0] },
      { seatCount: 8, disabledSeats: [1] },
      { seatCount: 8 },
      { seatCount: 8 },
    ],
  });

  const keys = new Set(seats.map(seat => seat.key));
  assert.equal(keys.has('0:0'), false);
  assert.equal(keys.has('1:1'), false);
  assert.ok(seats.every(seat => !(seat.x > 220 * 0.32 && seat.x < 220 * 0.68 && seat.y > 150 * 0.38)));
});

test('normalizes missing row layout to one count entry per row', () => {
  assert.deepEqual(normalizeRowLayout({ rows: 2, cols: 5 }), [
    { seatCount: 5, count: 5, offsetX: 0, gap: 0, disabledSeats: [] },
    { seatCount: 5, count: 5, offsetX: 0, gap: 0, disabledSeats: [] },
  ]);
});

test('normalizes rows array as the canonical zone seat configuration', () => {
  assert.deepEqual(normalizeRowLayout({
    rows: [
      { seatCount: 6, offsetX: -12, gap: 4, disabledSeats: [1, '3', 'bad'] },
      { count: 8 },
    ],
    cols: 20,
  }), [
    { seatCount: 6, count: 6, offsetX: -12, gap: 4, disabledSeats: [1, 3] },
    { seatCount: 8, count: 8, offsetX: 0, gap: 0, disabledSeats: [] },
  ]);
});

test('builds fan zones as an annular sector and places rows on curved arcs', () => {
  const path = getFanZonePath({ width: 240, height: 160 });
  const seats = buildZoneSeatLayout({
    width: 240,
    height: 160,
    shape: 'fan',
    rows: [
      { seatCount: 5, gap: 3 },
      { seatCount: 7, offsetX: 8 },
      { seatCount: 9 },
    ],
  });

  assert.match(path, /^M .+ A .+ L .+ A .+ Z$/);
  assert.equal(seats.length, 21);
  assert.ok(seats[0].y > seats.at(-1).y, 'front row should sit closer to the stage at the bottom');
  assert.ok(seats.some((seat, index) => index > 0 && Math.abs(seat.y - seats[index - 1].y) > 1));
});

test('keeps fan-zone seats inside the clickable seating area away from the border', () => {
  const zone = {
    width: 240,
    height: 160,
    shape: 'fan',
    rows: [
      { seatCount: 5 },
      { seatCount: 7 },
      { seatCount: 9 },
      { seatCount: 11 },
    ],
  };
  const geometry = getFanGeometry(zone);
  const bounds = getFanSeatBounds(zone);
  const seats = buildZoneSeatLayout(zone);

  assert.ok(seats.length > 0);
  seats.forEach(seat => {
    const radius = Math.hypot(seat.x - geometry.cx, seat.y - geometry.cy);
    const angle = Math.atan2(seat.y - geometry.cy, seat.x - geometry.cx) * 180 / Math.PI;
    assert.ok(radius >= bounds.innerSeatRadius - 0.5, `seat ${seat.key} is too close to inner edge`);
    assert.ok(radius <= bounds.outerSeatRadius + 0.5, `seat ${seat.key} is too close to outer edge`);
    assert.ok(angle >= bounds.startSeatAngle - 0.5, `seat ${seat.key} is too close to left edge`);
    assert.ok(angle <= bounds.endSeatAngle + 0.5, `seat ${seat.key} is too close to right edge`);
  });
});
