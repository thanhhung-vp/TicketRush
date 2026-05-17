import { describe, expect, it } from 'vitest';
import { buildSeatLabel, materializeZoneSeats, normalizeRowLayout } from '../utils/venueLayoutSeats.js';

describe('venue layout seat materialization', () => {
  it('keeps generated seat labels inside the database column length', () => {
    const label = buildSeatLabel('Khán đài chữ U tên rất dài', 2, 14);

    expect(label).toMatch(/-C15$/);
    expect(label.length).toBeLessThanOrEqual(20);
  });

  it('uses per-row counts instead of a rectangular rows by cols total', () => {
    const seats = materializeZoneSeats({
      width: 200,
      height: 120,
      rows: [
        { seatCount: 2, offsetX: -10 },
        { seatCount: 4, offsetX: 0 },
        { seatCount: 2, offsetX: 10 },
      ],
    });

    expect(seats.map(seat => `${seat.row}:${seat.col}`)).toEqual([
      '0:0', '0:1',
      '1:0', '1:1', '1:2', '1:3',
      '2:0', '2:1',
    ]);
  });

  it('skips disabled seats and the inner cutout of a U-shaped zone', () => {
    const seats = materializeZoneSeats({
      rows: 4,
      cols: 8,
      width: 220,
      height: 150,
      shape: 'u_shape',
      seatRows: [
        { seatCount: 8, disabledSeats: [0] },
        { seatCount: 8, disabledSeats: [1] },
        { seatCount: 8 },
        { seatCount: 8 },
      ],
    });
    const keys = new Set(seats.map(seat => `${seat.row}:${seat.col}`));

    expect(keys.has('0:0')).toBe(false);
    expect(keys.has('1:1')).toBe(false);
    expect(seats.every(seat => !(seat.x > 220 * 0.32 && seat.x < 220 * 0.68 && seat.y > 150 * 0.38))).toBe(true);
  });

  it('normalizes missing row layout from rows and cols', () => {
    expect(normalizeRowLayout({ rows: 2, cols: 5 })).toEqual([
      { seatCount: 5, count: 5, offsetX: 0, gap: 0, disabledSeats: [] },
      { seatCount: 5, count: 5, offsetX: 0, gap: 0, disabledSeats: [] },
    ]);
  });

  it('uses rows array as the canonical config with gap and disabled seats', () => {
    expect(normalizeRowLayout({
      rows: [
        { seatCount: 6, offsetX: -12, gap: 4, disabledSeats: [1, '3', 'bad'] },
        { count: 8 },
      ],
      cols: 20,
    })).toEqual([
      { seatCount: 6, count: 6, offsetX: -12, gap: 4, disabledSeats: [1, 3] },
      { seatCount: 8, count: 8, offsetX: 0, gap: 0, disabledSeats: [] },
    ]);
  });

  it('places fan-zone seats on curved rows', () => {
    const seats = materializeZoneSeats({
      width: 240,
      height: 160,
      shape: 'fan',
      rows: [
        { seatCount: 5, gap: 3 },
        { seatCount: 7, offsetX: 8 },
        { seatCount: 9 },
      ],
    });

    expect(seats).toHaveLength(21);
    expect(seats[0].y).toBeGreaterThan(seats.at(-1).y);
  });

  it('keeps fan-zone seats away from the annular-sector border', () => {
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
    const seats = materializeZoneSeats(zone);
    const cx = zone.width / 2;
    const cy = zone.height * 1.06;
    const innerSeatRadius = zone.height * 0.34 + Math.max(18, zone.height * 0.14);
    const outerSeatRadius = zone.height * 0.96 - Math.max(18, zone.height * 0.14);
    const startSeatAngle = -130 + 16;
    const endSeatAngle = -50 - 16;

    expect(seats.length).toBeGreaterThan(0);
    seats.forEach(seat => {
      const radius = Math.hypot(seat.x - cx, seat.y - cy);
      const angle = Math.atan2(seat.y - cy, seat.x - cx) * 180 / Math.PI;
      expect(radius).toBeGreaterThanOrEqual(innerSeatRadius - 0.5);
      expect(radius).toBeLessThanOrEqual(outerSeatRadius + 0.5);
      expect(angle).toBeGreaterThanOrEqual(startSeatAngle - 0.5);
      expect(angle).toBeLessThanOrEqual(endSeatAngle + 0.5);
    });
  });
});
