import { EventRepository } from '../infrastructure/database/repositories/EventRepository.js';
import pool from '../infrastructure/database/pool.js';
import { getAdminDashboard } from '../services/adminDashboard.js';

const eventRepo = new EventRepository();

export class AdminService {
  async getAllEvents() {
    return eventRepo.findAllAdmin();
  }

  async getDashboard() {
    return getAdminDashboard(pool);
  }

  async getAudienceStats() {
    const currentYear = new Date().getFullYear();
    const { rows: byGender } = await pool.query(
      `SELECT u.gender, COUNT(*) AS count FROM orders o
       JOIN users u ON u.id = o.user_id WHERE o.status='paid' GROUP BY u.gender`
    );
    const { rows: byAge } = await pool.query(
      `SELECT CASE
         WHEN ($1 - u.birth_year) < 18 THEN 'Under 18'
         WHEN ($1 - u.birth_year) BETWEEN 18 AND 24 THEN '18-24'
         WHEN ($1 - u.birth_year) BETWEEN 25 AND 34 THEN '25-34'
         WHEN ($1 - u.birth_year) BETWEEN 35 AND 44 THEN '35-44'
         ELSE '45+' END AS age_group, COUNT(*) AS count
       FROM orders o JOIN users u ON u.id = o.user_id
       WHERE o.status='paid' AND u.birth_year IS NOT NULL GROUP BY age_group ORDER BY age_group`,
      [currentYear]
    );
    return { by_gender: byGender, by_age: byAge };
  }

  async getEventSeats(eventId) {
    const { rows } = await pool.query(
      `SELECT s.id, s.zone_id, s.row_idx, s.col_idx, s.label, s.status,
              z.name AS zone_name, z.price, z.color, z.rows, z.cols
       FROM seats s JOIN zones z ON z.id = s.zone_id
       WHERE s.event_id=$1 ORDER BY z.name, s.row_idx, s.col_idx`,
      [eventId]
    );
    return rows;
  }
}
