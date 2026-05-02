import pool from '../pool.js';

export class SeatRepository {
  /**
   * Lock seats for a user using SELECT FOR UPDATE NOWAIT.
   * Throws the raw pg error (code 55P03) if a concurrent lock exists.
   */
  async lockSeats(client, seatIds, userId, lockedAt) {
    const placeholders = seatIds.map((_, i) => `$${i + 1}`).join(',');

    // Attempt NOWAIT lock — throws pg error code 55P03 on contention
    const { rows: seats } = await client.query(
      `SELECT id, status FROM seats
       WHERE id IN (${placeholders})
       FOR UPDATE NOWAIT`,
      seatIds
    );

    if (seats.length !== seatIds.length) {
      const found = seats.map(s => s.id);
      const missing = seatIds.filter(id => !found.includes(id));
      const err = new Error(`Seats not found: ${missing.join(', ')}`);
      err.code = 'SEATS_NOT_FOUND';
      throw err;
    }

    const unavailable = seats.filter(s => s.status !== 'available');
    if (unavailable.length > 0) {
      const err = new Error('Some seats are no longer available');
      err.code = 'SEATS_UNAVAILABLE';
      err.seats = unavailable.map(s => s.id);
      throw err;
    }

    await client.query(
      `UPDATE seats
       SET status = 'locked', locked_by = $1, locked_at = $2
       WHERE id IN (${placeholders})`,
      [userId, lockedAt, ...seatIds]
    );

    return seats;
  }

  /**
   * Release locked seats owned by a specific user.
   */
  async releaseSeats(client, seatIds, userId) {
    const placeholders = seatIds.map((_, i) => `$${i + 2}`).join(',');
    const { rowCount } = await client.query(
      `UPDATE seats
       SET status = 'available', locked_by = NULL, locked_at = NULL
       WHERE locked_by = $1
         AND id IN (${placeholders})
         AND status = 'locked'`,
      [userId, ...seatIds]
    );
    return rowCount;
  }

  /**
   * Mark seats as sold, clearing lock metadata.
   */
  async markSold(client, seatIds) {
    const placeholders = seatIds.map((_, i) => `$${i + 1}`).join(',');
    await client.query(
      `UPDATE seats
       SET status = 'sold', locked_by = NULL, locked_at = NULL
       WHERE id IN (${placeholders})`,
      seatIds
    );
  }

  /**
   * SELECT seats with FOR UPDATE (used during payment confirmation).
   */
  async findByIds(client, seatIds) {
    const placeholders = seatIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await client.query(
      `SELECT s.id, s.status, s.locked_by, s.event_id, z.price
       FROM seats s
       JOIN zones z ON z.id = s.zone_id
       WHERE s.id IN (${placeholders})
       FOR UPDATE`,
      seatIds
    );
    return rows;
  }

  /**
   * Sweep seats whose hold has expired.
   * Returns the list of expired seat rows (id, event_id).
   */
  async sweepExpired(holdMinutes) {
    const { rows } = await pool.query(
      `UPDATE seats
       SET status = 'available', locked_by = NULL, locked_at = NULL
       WHERE status = 'locked'
         AND locked_at < NOW() - INTERVAL '${Number(holdMinutes)} minutes'
       RETURNING id, event_id`
    );
    return rows;
  }
}
