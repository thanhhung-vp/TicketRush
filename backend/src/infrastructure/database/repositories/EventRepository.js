import pool from '../pool.js';
import { CATEGORIES } from '../../../domain/constants.js';

export class EventRepository {
  /**
   * Find all on_sale events with optional filters.
   * Filters: status, search, category, date_from, date_to, location
   */
  async findAll(filters = {}) {
    const { search, category, date_from, date_to, location, status = 'on_sale' } = filters;
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`e.status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(e.title ILIKE $${params.length} OR e.venue ILIKE $${params.length})`);
    }

    if (category && CATEGORIES.includes(category)) {
      params.push(category);
      conditions.push(`e.category = $${params.length}`);
    }

    if (date_from) {
      params.push(date_from);
      conditions.push(`e.event_date >= $${params.length}`);
    }

    if (date_to) {
      params.push(date_to);
      conditions.push(`e.event_date <= $${params.length}`);
    }

    if (location) {
      params.push(`%${location}%`);
      conditions.push(`e.venue ILIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT e.*,
              COUNT(s.id) FILTER (WHERE s.status = 'available') AS available_seats,
              COUNT(s.id) AS total_seats,
              MIN(z.price) AS min_price,
              MAX(z.price) AS max_price
       FROM events e
       LEFT JOIN seats s ON s.event_id = e.id
       LEFT JOIN zones z ON z.event_id = e.id
       ${where}
       GROUP BY e.id
       ORDER BY e.event_date ASC`,
      params
    );
    return rows;
  }

  /**
   * Find all events (any status) with seat counts — for admin.
   */
  async findAllAdmin() {
    const { rows } = await pool.query(
      `SELECT e.*,
              COUNT(s.id) FILTER (WHERE s.status = 'available') AS available_seats,
              COUNT(s.id) FILTER (WHERE s.status = 'locked')    AS locked_seats,
              COUNT(s.id) FILTER (WHERE s.status = 'sold')      AS sold_seats,
              COUNT(s.id) AS total_seats
       FROM events e
       LEFT JOIN seats s ON s.event_id = e.id
       GROUP BY e.id
       ORDER BY e.created_at DESC`
    );
    return rows;
  }

  /**
   * Find a single event by id.
   */
  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    return rows[0] || null;
  }

  /**
   * Find event with zones and seat counts.
   */
  async findByIdWithZones(id) {
    const { rows: events } = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (!events[0]) return null;

    const { rows: zones } = await pool.query(
      `SELECT z.*,
              COUNT(s.id) FILTER (WHERE s.status = 'available') AS available_seats,
              COUNT(s.id) AS total_seats
       FROM zones z
       LEFT JOIN seats s ON s.zone_id = z.id
       WHERE z.event_id = $1
       GROUP BY z.id
       ORDER BY z.name`,
      [id]
    );

    return { ...events[0], zones };
  }

  /**
   * Find all seats for an event with zone info.
   */
  async findSeats(eventId) {
    const { rows } = await pool.query(
      `SELECT s.id, s.zone_id, s.row_idx, s.col_idx, s.label, s.status,
              z.name AS zone_name, z.price, z.color, z.rows, z.cols
       FROM seats s
       JOIN zones z ON z.id = s.zone_id
       WHERE s.event_id = $1
       ORDER BY z.name, s.row_idx, s.col_idx`,
      [eventId]
    );
    return rows;
  }

  /**
   * Create a new event.
   */
  async create(data, createdBy) {
    const { title, description, venue, event_date, poster_url, category } = data;
    const { rows } = await pool.query(
      `INSERT INTO events (title, description, venue, event_date, poster_url, category, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description || null, venue, event_date, poster_url || null, category || 'other', createdBy]
    );
    return rows[0];
  }

  /**
   * Partially update an event.
   */
  async update(id, fields) {
    const allowed = ['title', 'description', 'venue', 'event_date', 'poster_url', 'status', 'category'];
    const keys = Object.keys(fields).filter(k => allowed.includes(k));
    if (!keys.length) return this.findById(id);

    const sets   = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = keys.map(k => fields[k]);

    const { rows } = await pool.query(
      `UPDATE events SET ${sets} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0] || null;
  }

  /**
   * Delete an event — only allowed when status = 'draft'.
   * Returns the number of deleted rows.
   */
  async delete(id) {
    const { rowCount } = await pool.query(
      `DELETE FROM events WHERE id = $1 AND status = 'draft'`,
      [id]
    );
    return rowCount;
  }

  /**
   * Create a new zone for an event.
   */
  async createZone(eventId, data) {
    const { name, rows, cols, price, color } = data;
    const { rows: zoneRows } = await pool.query(
      `INSERT INTO zones (event_id, name, rows, cols, price, color)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [eventId, name, rows, cols, price, color || '#3B82F6']
    );
    return zoneRows[0];
  }

  /**
   * Bulk-insert seats for a zone in a rows × cols matrix.
   * Uses the same client (for transaction support).
   */
  async generateSeats(client, zoneId, eventId, rows, cols, zoneName) {
    const seatValues = [];
    const seatParams = [];
    let idx = 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const label = `${zoneName}-${String.fromCharCode(65 + r)}${String(c + 1).padStart(2, '0')}`;
        seatValues.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
        seatParams.push(zoneId, eventId, r, c, label);
      }
    }

    await client.query(
      `INSERT INTO seats (zone_id, event_id, row_idx, col_idx, label) VALUES ${seatValues.join(',')}`,
      seatParams
    );

    return rows * cols;
  }

  /**
   * Delete a zone (cascades to seats via FK or explicit delete).
   */
  async deleteZone(zoneId, eventId) {
    await pool.query('DELETE FROM zones WHERE id=$1 AND event_id=$2', [zoneId, eventId]);
  }
}
