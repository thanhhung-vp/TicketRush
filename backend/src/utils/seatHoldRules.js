export const MAX_SEATS_PER_HOLD = 10;

export function validateSeatIds(seatIds) {
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    return {
      ok: false,
      status: 400,
      error: 'seat_ids must be a non-empty array',
    };
  }

  if (seatIds.length > MAX_SEATS_PER_HOLD) {
    return {
      ok: false,
      status: 400,
      error: `Cannot hold more than ${MAX_SEATS_PER_HOLD} seats at once`,
    };
  }

  if (new Set(seatIds).size !== seatIds.length) {
    return {
      ok: false,
      status: 400,
      error: 'seat_ids must not contain duplicates',
    };
  }

  return { ok: true };
}

export function ensureSingleEvent(seats) {
  const eventIds = new Set(seats.map(seat => seat.event_id));

  if (eventIds.size > 1) {
    return {
      ok: false,
      status: 400,
      error: 'Cannot hold seats from multiple events',
    };
  }

  return { ok: true, eventId: seats[0]?.event_id || null };
}
