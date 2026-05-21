function toTime(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

export function getEventSaleState(event, now = new Date()) {
  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const eventTime = toTime(event?.event_date);
  const saleStartTime = toTime(event?.sale_start_at);
  const zones = Array.isArray(event?.zones) ? event.zones : [];
  const availableSeats = Number(event?.available_seats);

  if (event?.status === 'ended' || (eventTime !== null && eventTime < currentTime)) {
    return 'ended';
  }

  if (event?.status === 'scheduled' || (saleStartTime !== null && saleStartTime > currentTime)) {
    return 'scheduled';
  }

  if (
    (zones.length > 0 && zones.every(zone => Number(zone.available_seats || 0) === 0)) ||
    (zones.length === 0 && Number.isFinite(availableSeats) && availableSeats <= 0)
  ) {
    return 'soldout';
  }

  return 'onsale';
}

export function canSelectSeatsForEvent(event, now = new Date()) {
  return getEventSaleState(event, now) === 'onsale';
}
