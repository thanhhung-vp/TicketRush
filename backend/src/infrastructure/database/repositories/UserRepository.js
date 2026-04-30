import pool from '../pool.js';

export class UserRepository {
  async findById(id) {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, gender, birth_year, role, created_at FROM users WHERE id=$1',
      [id]
    );
    return rows[0] || null;
  }

  async findByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    return rows[0] || null;
  }

  async create({ email, passwordHash, full_name, gender, birth_year }) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password, full_name, gender, birth_year)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, email, full_name, role, created_at`,
      [email, passwordHash, full_name, gender || null, birth_year || null]
    );
    return rows[0];
  }

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (!keys.length) return this.findById(id);
    const sets   = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = keys.map(k => fields[k]);
    const { rows } = await pool.query(
      `UPDATE users SET ${sets} WHERE id=$1
       RETURNING id, email, full_name, gender, birth_year, role`,
      [id, ...values]
    );
    return rows[0] || null;
  }

  async storeRefreshToken(userId, tokenHash, expiresAt) {
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
      [userId, tokenHash, expiresAt]
    );
  }

  async findRefreshToken(tokenHash) {
    const { rows } = await pool.query(
      `SELECT rt.*, u.id AS uid, u.email, u.role, u.full_name
       FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash=$1 AND rt.expires_at > NOW()`,
      [tokenHash]
    );
    return rows[0] || null;
  }

  async deleteRefreshToken(tokenHash) {
    await pool.query('DELETE FROM refresh_tokens WHERE token_hash=$1', [tokenHash]);
  }

  async deleteRefreshTokenById(id) {
    await pool.query('DELETE FROM refresh_tokens WHERE id=$1', [id]);
  }

  async deleteAllRefreshTokens(userId) {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id=$1', [userId]);
  }
}
