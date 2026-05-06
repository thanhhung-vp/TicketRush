export function buildPendingOrderCheckoutState(order = {}) {
  const items = Array.isArray(order.items) ? order.items : [];
  const seatInfo = items
    .filter(item => item?.seat_id)
    .map(item => ({
      id: item.seat_id,
      seat_id: item.seat_id,
      event_id: item.event_id || order.event_id || null,
      label: item.label || '',
      zone_name: item.zone_name || item.zone || '',
      price: item.price ?? 0,
    }));

  return {
    order_id: order.id || null,
    event_id: order.event_id || seatInfo[0]?.event_id || null,
    seat_ids: seatInfo.map(seat => seat.id),
    seat_info: seatInfo,
  };
}

export function isPendingOrderActionable(order = {}) {
  return order.status === 'pending' && buildPendingOrderCheckoutState(order).seat_ids.length > 0;
}
