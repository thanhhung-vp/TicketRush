export async function recalculateOrderAfterTicketRemoval(client, orderId) {
  const { rows } = await client.query(
    `SELECT COALESCE(SUM(price), 0) AS total_amount,
            COUNT(*)::int AS item_count
     FROM order_items
     WHERE order_id = $1`,
    [orderId]
  );

  const stats = rows[0] || { total_amount: 0, item_count: 0 };
  const totalAmount = Number(stats.total_amount || 0);
  const itemCount = Number(stats.item_count || 0);

  const { rows: updatedRows } = await client.query(
    `UPDATE orders
     SET total_amount = $2,
         status = CASE WHEN $3::int = 0 THEN 'cancelled' ELSE status END
     WHERE id = $1
     RETURNING *`,
    [orderId, totalAmount, itemCount]
  );

  return updatedRows[0] || null;
}
