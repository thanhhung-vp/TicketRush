export const EVENT_UNAVAILABLE_ERROR = 'Sự kiện không khả dụng để đặt vé.';
export const EVENT_SALE_NOT_STARTED_ERROR = 'Sự kiện chưa mở bán vé.';

function toValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function canPurchaseEventTickets(event, now = new Date()) {
  if (!event) {
    return {
      ok: false,
      status: 409,
      code: 'EVENT_UNAVAILABLE',
      error: EVENT_UNAVAILABLE_ERROR,
    };
  }

  const currentTime = toValidDate(now) || new Date();
  const eventDate = toValidDate(event.event_date);
  if (!eventDate || event.status === 'ended' || eventDate < currentTime) {
    return {
      ok: false,
      status: 409,
      code: 'EVENT_UNAVAILABLE',
      error: EVENT_UNAVAILABLE_ERROR,
    };
  }

  if (event.status === 'scheduled') {
    return {
      ok: false,
      status: 409,
      code: 'SALE_NOT_STARTED',
      error: EVENT_SALE_NOT_STARTED_ERROR,
    };
  }

  if (event.status !== 'on_sale') {
    return {
      ok: false,
      status: 409,
      code: 'EVENT_UNAVAILABLE',
      error: EVENT_UNAVAILABLE_ERROR,
    };
  }

  const saleStartAt = toValidDate(event.sale_start_at);
  if (saleStartAt && saleStartAt > currentTime) {
    return {
      ok: false,
      status: 409,
      code: 'SALE_NOT_STARTED',
      error: EVENT_SALE_NOT_STARTED_ERROR,
    };
  }

  return { ok: true };
}
