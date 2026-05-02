/**
 * Seed script: populate TicketRush with sample data.
 * Run: node scripts/seed.js
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database...');

    // ── Users ────────────────────────────────────────────
    const adminHash = await bcrypt.hash('admin123', 12);
    const userHash  = await bcrypt.hash('user123', 12);

    const { rows: [admin] } = await client.query(
      `INSERT INTO users (email, password, full_name, role, gender, birth_year)
       VALUES ('admin@ticketrush.vn', $1, 'Admin TicketRush', 'admin', 'other', 1990)
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
       RETURNING id`,
      [adminHash]
    );

    const { rows: [userA] } = await client.query(
      `INSERT INTO users (email, password, full_name, gender, birth_year)
       VALUES ('nguyen.van.a@example.com', $1, 'Nguyễn Văn A', 'male', 1998)
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
       RETURNING id`,
      [userHash]
    );

    const { rows: [userB] } = await client.query(
      `INSERT INTO users (email, password, full_name, gender, birth_year)
       VALUES ('tran.thi.b@example.com', $1, 'Trần Thị B', 'female', 2001)
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
       RETURNING id`,
      [userHash]
    );

    console.log(`  ✅  Users: admin=${admin.id}, userA=${userA.id}`);

    // ── Events ───────────────────────────────────────────
    const events = [
      {
        title: 'VMusic Gala 2026 – Đêm nhạc nghệ thuật',
        description: 'Chương trình âm nhạc đỉnh cao quy tụ các nghệ sĩ hàng đầu Việt Nam, mang đến những giai điệu bất hủ.',
        venue: 'Nhà hát Lớn Hà Nội, 1 Tràng Tiền, Hoàn Kiếm',
        event_date: new Date(Date.now() + 14 * 86400_000).toISOString(),
        poster_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600',
        category: 'music',
        status: 'on_sale',
      },
      {
        title: 'TechSummit Việt Nam 2026',
        description: 'Hội nghị công nghệ thường niên với 200+ diễn giả, 50+ phiên thảo luận về AI, Blockchain và Cloud.',
        venue: 'GEM Center, 8 Nguyễn Bỉnh Khiêm, Q.1, TP.HCM',
        event_date: new Date(Date.now() + 30 * 86400_000).toISOString(),
        poster_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600',
        category: 'conference',
        status: 'on_sale',
      },
      {
        title: 'Stand-up Comedy Night – Trấn Thành & Friends',
        description: 'Đêm hài độc thoại với Trấn Thành, Hari Won và các diễn viên hài đình đám.',
        venue: 'Nhà hát Hòa Bình, 240 3/2, Q.10, TP.HCM',
        event_date: new Date(Date.now() + 7 * 86400_000).toISOString(),
        poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600',
        category: 'comedy',
        status: 'on_sale',
      },
      {
        title: 'Lễ hội Ánh sáng 2026 – Light Festival',
        description: 'Festival nghệ thuật ánh sáng kết hợp âm nhạc điện tử, trình chiếu 3D mapping và triển lãm nghệ thuật.',
        venue: 'Công viên Thống Nhất, Hai Bà Trưng, Hà Nội',
        event_date: new Date(Date.now() + 45 * 86400_000).toISOString(),
        poster_url: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=600',
        category: 'festival',
        status: 'on_sale',
      },
      {
        title: 'Football Gala – AFF Cup Exhibition',
        description: 'Trận giao hữu đặc biệt trước thềm AFF Cup giữa tuyển Việt Nam và ngôi sao K-League.',
        venue: 'Sân vận động Mỹ Đình, Từ Liêm, Hà Nội',
        event_date: new Date(Date.now() + 21 * 86400_000).toISOString(),
        poster_url: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=600',
        category: 'sports',
        status: 'on_sale',
      },
    ];

    const zonesConfig = [
      [
        { name: 'VIP', rows: 3, cols: 10, price: 2500000, color: '#F59E0B' },
        { name: 'Khu A', rows: 5, cols: 12, price: 1200000, color: '#3B82F6' },
        { name: 'Khu B', rows: 6, cols: 15, price: 600000, color: '#10B981' },
      ],
      [
        { name: 'Premium', rows: 2, cols: 8, price: 3000000, color: '#EF4444' },
        { name: 'Standard', rows: 8, cols: 10, price: 800000, color: '#6366F1' },
      ],
      [
        { name: 'VIP', rows: 2, cols: 8, price: 1500000, color: '#F59E0B' },
        { name: 'General', rows: 5, cols: 10, price: 500000, color: '#3B82F6' },
      ],
      [
        { name: 'VIP Trải nghiệm', rows: 2, cols: 6, price: 2000000, color: '#F59E0B' },
        { name: 'Khu Đứng A', rows: 4, cols: 12, price: 400000, color: '#10B981' },
        { name: 'Khu Đứng B', rows: 4, cols: 12, price: 300000, color: '#6366F1' },
      ],
      [
        { name: 'VIP Box', rows: 2, cols: 5, price: 4000000, color: '#F59E0B' },
        { name: 'Khán đài A', rows: 5, cols: 10, price: 1000000, color: '#3B82F6' },
        { name: 'Khán đài B', rows: 6, cols: 12, price: 600000, color: '#10B981' },
      ],
    ];

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const { rows: [event] } = await client.query(
        `INSERT INTO events (title, description, venue, event_date, poster_url, category, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [ev.title, ev.description, ev.venue, ev.event_date, ev.poster_url, ev.category, ev.status, admin.id]
      );

      for (const zone of zonesConfig[i]) {
        const { rows: [z] } = await client.query(
          `INSERT INTO zones (event_id, name, rows, cols, price, color)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [event.id, zone.name, zone.rows, zone.cols, zone.price, zone.color]
        );

        const vals = [];
        const params = [];
        let idx = 1;
        for (let r = 0; r < zone.rows; r++) {
          for (let c = 0; c < zone.cols; c++) {
            const label = `${zone.name}-${String.fromCharCode(65 + r)}${String(c + 1).padStart(2, '0')}`;
            vals.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
            params.push(z.id, event.id, r, c, label);
          }
        }
        await client.query(
          `INSERT INTO seats (zone_id, event_id, row_idx, col_idx, label) VALUES ${vals.join(',')}`,
          params
        );
      }
      console.log(`  ✅  Event: "${ev.title}"`);
    }

    console.log('\n🎉 Seed complete!\n');
    console.log('  Admin login : admin@ticketrush.vn / admin123');
    console.log('  User login  : nguyen.van.a@example.com / user123');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
