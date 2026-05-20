/**
 * Seed script: populate TicketRush with sample users, events, zones, and seats.
 * Run: node scripts/seed.js
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';

export const legacySeedEventTitles = [
  'VMusic Gala 2026 - Dem nhac nghe thuat',
  'TechSummit Viet Nam 2026',
  'Stand-up Comedy Night - Tran Thanh & Friends',
  'Le hoi Anh sang 2026 - Light Festival',
  'Football Gala - AFF Cup Exhibition',
];

export const legacySeedEventTitlePatterns = [
  'VMusic Gala 2026%',
  'TechSummit%',
  'Stand-up Comedy Night%',
  '%Light Festival%',
  'Football Gala%',
];

export const seedEvents = [
  {
    title: 'VinaFIS Expo 2026',
    description: 'Technology and business forum for Vietnam fisheries, seafood processing, logistics, and aquaculture suppliers.',
    venue: 'SECC, 799 Nguyen Van Linh, District 7, Ho Chi Minh City',
    event_date: '2026-04-28T09:00:00+07:00',
    poster_url: 'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=900&auto=format&fit=crop&q=80',
    category: 'conference',
    status: 'ended',
    source_url: 'https://expo.vinafis.org.vn/en',
  },
  {
    title: 'Vietnam Medi-Pharm 2026',
    description: 'The 34th Vietnam International Medical and Pharmaceutical Exhibition showcasing medical equipment, hospital supplies, and rehabilitation products.',
    venue: 'Friendship Cultural Palace, 91 Tran Hung Dao, Cua Nam, Hanoi',
    event_date: '2026-05-06T09:00:00+07:00',
    poster_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&auto=format&fit=crop&q=80',
    category: 'conference',
    status: 'ended',
    source_url: 'https://vietnammedipharm.vn/Default.aspx?language=en-US',
  },
  {
    title: 'VINAMAC EXPO 2026',
    description: 'International exhibition for machinery, equipment, technology, automation, welding, metalworking, and industrial products.',
    venue: 'Hanoi International Center for Exhibition, 91 Tran Hung Dao, Hoan Kiem, Hanoi',
    event_date: '2026-05-14T09:00:00+07:00',
    poster_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&auto=format&fit=crop&q=80',
    category: 'conference',
    status: 'ended',
    source_url: 'https://www.vietnam.vn/en/vinamac-expo-2026-trinh-dien-loat-san-pham-co-khi-che-tao-tien-tien',
  },
  {
    title: 'AUTOTECH & ACCESSORIES 2026',
    description: 'International exhibition for automobiles, motorcycles, electric vehicles, components, accessories, repair, and supporting industries.',
    venue: 'Saigon Exhibition and Convention Centre (SECC), Ho Chi Minh City',
    event_date: '2026-05-21T09:00:00+07:00',
    poster_url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=900&auto=format&fit=crop&q=80',
    category: 'conference',
    status: 'on_sale',
    is_featured: true,
    source_url: 'https://www.jetro.go.jp/en/database/j-messe/tradefair/detail/159242',
  },
  {
    title: 'Vietnam Dairy 2026',
    description: 'International dairy and dairy products exhibition focused on innovation, sustainable development, nutrition, and consumer experiences.',
    venue: 'Friendship Cultural Palace, Hanoi',
    event_date: '2026-05-28T09:00:00+07:00',
    poster_url: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=900&auto=format&fit=crop&q=80',
    category: 'conference',
    status: 'on_sale',
    is_featured: true,
    source_url: 'https://www.vietnam.vn/en/ha-noi-sap-don-trien-lam-quoc-te-nganh-sua-vietnam-dairy-2026',
  },
  {
    title: 'Da Nang International Fireworks Festival 2026',
    description: 'A six-night international fireworks festival on the Han River with teams from Vietnam and leading pyrotechnic countries.',
    venue: 'Han River area, Tran Hung Dao Street, Da Nang',
    event_date: '2026-05-30T20:00:00+07:00',
    poster_url: 'https://images.unsplash.com/photo-1533236897111-3e94666b2edf?w=900&auto=format&fit=crop&q=80',
    category: 'arts',
    status: 'on_sale',
    is_featured: true,
    source_url: 'https://news.laodong.vn/du-lich/tin-tuc/lich-ban-phao-hoa-tai-le-hoi-phao-hoa-quoc-te-da-nang-2026-1647639.html',
  },
  {
    title: 'The Flow of Music',
    description: 'Vietnamese and Polish artists perform a classical music program celebrating cultural connection through Chopin, Brahms, Schubert, and Prokofiev.',
    venue: 'Ho Guom Opera House, Hanoi',
    event_date: '2026-05-31T20:00:00+07:00',
    poster_url: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=900&auto=format&fit=crop&q=80',
    category: 'music',
    status: 'on_sale',
    is_featured: true,
    source_url: 'https://www.vietnam.vn/en/the-flow-of-music-dem-hoa-nhac-ket-noi-van-hoa-viet-namba-lan',
  },
  {
    title: 'VIMEXPO & Vietnam AutoExpo 2026',
    description: 'Co-located exhibitions connecting Vietnam supporting industries, manufacturing, automobiles, motorcycles, and transportation vehicles.',
    venue: 'ICE Hanoi International Exhibition Center, Hanoi',
    event_date: '2026-06-11T09:00:00+07:00',
    poster_url: 'https://images.unsplash.com/photo-1565688534245-05d6b5be184a?w=900&auto=format&fit=crop&q=80',
    category: 'conference',
    status: 'on_sale',
    is_featured: true,
    source_url: 'https://www.vietnam.vn/en/trien-lam-vimexpo-va-vietnam-autoexpo-2026-duoc-to-chuc-tu-11-13-6-2026',
  },
  {
    title: 'Hue International Arts Festival 2026',
    description: 'A summer arts festival week in Hue featuring royal heritage spaces, international performances, and cultural programs across the former imperial capital.',
    venue: 'Imperial City and cultural venues across Hue',
    event_date: '2026-06-13T19:30:00+07:00',
    poster_url: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=900&auto=format&fit=crop&q=80',
    category: 'arts',
    status: 'on_sale',
    is_featured: true,
    source_url: 'https://hue.gov.vn/Portals/0/Uploads/VBPL/Nam2026/Thang1/00.00.H57-500-KH-UBND-2025-PL2_signed.pdf',
  },
  {
    title: 'Gemini-Fourth 4Ever Young Fan Meeting',
    description: 'Gemini and Fourth return to Vietnam for a fan meeting with live interactions and official fan benefits in Ho Chi Minh City.',
    venue: 'C30 Hoa Binh Stage, 141 Bac Hai Road, Ho Chi Minh City',
    event_date: '2026-06-20T13:30:00+07:00',
    poster_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&auto=format&fit=crop&q=80',
    category: 'music',
    status: 'on_sale',
    is_featured: true,
    source_url: 'https://thaistarx.com/en/geminifourth-fan-meeting-vietnam-2026-2/',
  },
  {
    title: 'Vietnam Smart Factory Expo 2026',
    description: 'International smart factory exhibition covering automation, robotics, UAVs, new energy, 3D printing, lasers, and intelligent monitoring systems.',
    venue: 'Saigon Exhibition and Convention Center (SECC), Ho Chi Minh City',
    event_date: '2026-06-24T09:00:00+07:00',
    poster_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&auto=format&fit=crop&q=80',
    category: 'conference',
    status: 'on_sale',
    is_featured: false,
    source_url: 'https://www.vietnam.vn/en/sap-dien-ra-trien-lam-nha-may-thong-minh-viet-nam-2026',
  },
  {
    title: 'Conviction 2026',
    description: 'Vietnam digital asset economy forum connecting policy leaders, financial institutions, investors, builders, and Web3 and AI companies.',
    venue: 'ThiskyHall Sala Convention Center, Thu Duc City, Ho Chi Minh City',
    event_date: '2026-08-14T09:00:00+07:00',
    poster_url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=900&auto=format&fit=crop&q=80',
    category: 'conference',
    status: 'on_sale',
    is_featured: false,
    source_url: 'https://www.conviction.vn/en',
  },
  {
    title: 'Vietnam Founders & Builders Private Dinner by Airwallex, AVV, and BackScoop',
    description: 'Private dinner in Ho Chi Minh City for founders, operators, and builders to connect with Vietnam startup ecosystem partners.',
    venue: 'Ho Chi Minh City, Vietnam',
    event_date: '2026-05-21T18:00:00+07:00',
    poster_url: 'https://images.lumacdn.com/uploads/el/34a3a38f-a221-4bf6-9d9a-4235da58ca5a.png',
    category: 'conference',
    status: 'on_sale',
    is_featured: false,
    source_url: 'https://lu.ma/i2ecr9ng',
  },
  {
    title: 'Evening Ballet Screening: KAMELIENDAME Neumeier / Chopin, 2008 (22.5.2026)',
    description: 'Evening screening of John Neumeier choreography set to Chopin, hosted for ballet and performing arts audiences.',
    venue: 'Ho Chi Minh City, Vietnam',
    event_date: '2026-05-22T18:30:00+07:00',
    poster_url: 'https://images.lumacdn.com/uploads/uq/590bc29e-db2f-4c90-90ba-d810d3784877.jpg',
    category: 'arts',
    status: 'on_sale',
    is_featured: false,
    source_url: 'https://lu.ma/khaoeoxw',
  },
  {
    title: 'Read Room #3',
    description: 'Curiosity Circle gathering for readers and curious minds to discuss ideas, discoveries, and learning through community activities.',
    venue: 'Ho Chi Minh City, Vietnam',
    event_date: '2026-05-23T09:00:00+07:00',
    poster_url: 'https://images.lumacdn.com/uploads/y2/ab4c96ec-975d-4121-9d5d-d6b4503027b2.png',
    category: 'arts',
    status: 'on_sale',
    is_featured: false,
    source_url: 'https://lu.ma/xo028wg7',
  },
  {
    title: 'Co-working for Tech & Growth Builders - BS31',
    description: 'Build Stuffs co-working session for technology, product, and growth builders to work together and exchange practical ideas.',
    venue: 'Ho Chi Minh City, Vietnam',
    event_date: '2026-05-23T13:30:00+07:00',
    poster_url: 'https://images.lumacdn.com/uploads/ne/457c024e-efa7-4c44-a65c-1eeb51fe7f23.png',
    category: 'conference',
    status: 'on_sale',
    is_featured: false,
    source_url: 'https://lu.ma/rid7z5sj',
  },
  {
    title: 'Unbound Creativity with TRAE SOLO @ Vietnam',
    description: 'Creative technology event in Ho Chi Minh City exploring TRAE SOLO workflows for builders, makers, and AI-assisted creation.',
    venue: 'Ho Chi Minh City, Vietnam',
    event_date: '2026-05-30T10:00:00+07:00',
    poster_url: 'https://images.lumacdn.com/uploads/l6/fbf345b8-912b-4c54-8baf-be8d9e2f1052.png',
    category: 'conference',
    status: 'on_sale',
    is_featured: true,
    source_url: 'https://lu.ma/cxy4x77p',
  },
  {
    title: "'This is Us' - Skylab Aerial Arts Showcase (5th Anniversary)",
    description: 'Fifth anniversary aerial arts showcase from Skylab featuring live performances and community celebration.',
    venue: 'Ho Chi Minh City, Vietnam',
    event_date: '2026-05-31T09:00:00+07:00',
    poster_url: 'https://images.lumacdn.com/event-covers/7q/a698a75a-d711-40b3-b463-ddb0cab7caf0.png',
    category: 'arts',
    status: 'on_sale',
    is_featured: true,
    source_url: 'https://lu.ma/b6af1thl',
  },
  {
    title: 'The Sandbox - After Hours #3',
    description: 'After-hours technology community meetup for people in tech to connect, share ideas, and build meaningful relationships.',
    venue: 'Ho Chi Minh City, Vietnam',
    event_date: '2026-06-10T18:30:00+07:00',
    poster_url: 'https://images.lumacdn.com/uploads/kq/a23121c2-d4d2-4662-8a60-def418c1e2f5.png',
    category: 'conference',
    status: 'on_sale',
    is_featured: false,
    source_url: 'https://lu.ma/zagxa1pr',
  },
  {
    title: 'ĐÊM NHẠC THIỆN NGUYỆN HỘI NGỘ XV: THỜI KHÔNG - NĂM 2026',
    description: 'Charity music night in Ho Chi Minh City bringing audiences together for the fifteenth Hoi Ngo program.',
    venue: 'Ho Chi Minh City, Vietnam',
    event_date: '2026-06-27T16:30:00+07:00',
    poster_url: 'https://images.lumacdn.com/event-covers/gl/f37b1c8b-e573-445f-af85-8d46828c26f3.jpg',
    category: 'music',
    status: 'on_sale',
    is_featured: true,
    source_url: 'https://lu.ma/zueb9fe8',
  },
  {
    title: 'EA Summit: Vietnam 2026',
    description: 'Effective altruism summit in Vietnam for community members, organizers, and builders focused on doing good effectively.',
    venue: 'Ho Chi Minh City, Vietnam',
    event_date: '2026-07-11T09:00:00+07:00',
    poster_url: 'https://images.lumacdn.com/event-covers/kw/b4c2ff68-c7ab-4c7b-8df1-12cc6d94e156.png',
    category: 'conference',
    status: 'on_sale',
    is_featured: true,
    source_url: 'https://lu.ma/easummitvn26',
  },
];

export const seedNewsPosts = [
  {
    title: 'TicketRush adds scheduled ticket sale protection',
    summary: 'Upcoming events now stay locked until the configured sale start time.',
    content: [
      'TicketRush has strengthened booking controls for scheduled events.',
      'Customers can browse event details and prepare for the sale, but seat holds, checkout, and payment confirmation only become available after the configured sale start time.',
      'The update helps organizers run timed releases more predictably and keeps early access behavior consistent across the app.',
    ].join('\n\n'),
    image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80',
    status: 'published',
    published_at: '2026-05-21T03:00:00.000Z',
  },
  {
    title: 'New Ho Chi Minh City community events are live',
    summary: 'Fresh founder, builder, arts, and community gatherings have been added to the discovery feed.',
    content: [
      'The latest TicketRush data refresh adds a new set of Ho Chi Minh City events across startup, technology, reading, arts, and music communities.',
      'Customers can search by title or venue, save events to their wishlist, and return when tickets open.',
      'Admins can continue updating event and news content from the dashboard as details change.',
    ].join('\n\n'),
    image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&auto=format&fit=crop&q=80',
    status: 'published',
    published_at: '2026-05-20T09:00:00.000Z',
  },
  {
    title: 'Better search experience is rolling out',
    summary: 'Search history and a dedicated results page make it easier to resume event discovery.',
    content: [
      'TicketRush search now keeps recent search terms on the device so customers can return to common queries faster.',
      'Submitting a search opens a focused results page instead of keeping the customer on the home banner view.',
      'The change is designed for repeated discovery sessions, especially when comparing multiple venues or event categories.',
    ].join('\n\n'),
    image_url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&auto=format&fit=crop&q=80',
    status: 'published',
    published_at: '2026-05-19T08:00:00.000Z',
  },
  {
    title: 'Organizer dashboard news editing now supports post-publish updates',
    summary: 'Admins can revise published announcements without deleting and recreating them.',
    content: [
      'Published news posts can now be edited directly from the admin dashboard.',
      'This makes it easier to correct venue notes, update gate timing, or refresh announcement images while keeping the same public article link.',
      'Draft and published status controls remain available for content staging.',
    ].join('\n\n'),
    image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&auto=format&fit=crop&q=80',
    status: 'published',
    published_at: '2026-05-18T10:30:00.000Z',
  },
  {
    title: 'Draft: Summer ticketing operations checklist',
    summary: 'Internal draft for operational reminders before peak summer event traffic.',
    content: 'Review event sale start times, queue settings, seat maps, support coverage, and check-in staffing before publishing this update.',
    image_url: '',
    status: 'draft',
  },
];

const seatPlans = {
  conference: [
    { name: 'VIP', rows: 2, cols: 10, price: 1500000, color: '#F59E0B' },
    { name: 'Standard A', rows: 5, cols: 12, price: 800000, color: '#3B82F6' },
    { name: 'Standard B', rows: 6, cols: 14, price: 450000, color: '#10B981' },
  ],
  music: [
    { name: 'VIP', rows: 3, cols: 10, price: 2200000, color: '#F59E0B' },
    { name: 'Floor A', rows: 5, cols: 12, price: 1200000, color: '#EC4899' },
    { name: 'Balcony', rows: 5, cols: 14, price: 650000, color: '#6366F1' },
  ],
  arts: [
    { name: 'Premium', rows: 2, cols: 10, price: 1800000, color: '#A855F7' },
    { name: 'Zone A', rows: 5, cols: 12, price: 900000, color: '#3B82F6' },
    { name: 'Zone B', rows: 6, cols: 14, price: 500000, color: '#10B981' },
  ],
  sports: [
    { name: 'VIP Box', rows: 2, cols: 8, price: 2500000, color: '#F59E0B' },
    { name: 'Stand A', rows: 6, cols: 12, price: 900000, color: '#3B82F6' },
    { name: 'Stand B', rows: 7, cols: 14, price: 500000, color: '#10B981' },
  ],
  other: [
    { name: 'General', rows: 5, cols: 12, price: 500000, color: '#3B82F6' },
  ],
};

export function getSeedEventTitles(events = seedEvents) {
  return [...new Set([...legacySeedEventTitles, ...events.map(event => event.title)])];
}

export function buildSeedEventCleanupQuery(
  adminId,
  titles = getSeedEventTitles(),
  titlePatterns = legacySeedEventTitlePatterns
) {
  if (!adminId) throw new Error('adminId is required for seed event cleanup');

  return {
    text: `
      DELETE FROM events e
       WHERE e.created_by = $1
         AND (e.title = ANY($2::text[]) OR e.title ILIKE ANY($3::text[]))
         AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.event_id = e.id)
         AND NOT EXISTS (
           SELECT 1
             FROM tickets t
             JOIN seats s ON s.id = t.seat_id
            WHERE s.event_id = e.id
         )
         AND NOT EXISTS (SELECT 1 FROM admin_ticket_actions a WHERE a.event_id = e.id)
      RETURNING e.id, e.title`,
    values: [adminId, titles, titlePatterns],
  };
}

function getSeatPlan(event) {
  return seatPlans[event.category] || seatPlans.other;
}

async function upsertUser(client, { email, passwordHash, fullName, role = 'customer', gender, birthYear }) {
  const { rows: [user] } = await client.query(
    `INSERT INTO users (email, password, full_name, role, gender, birth_year)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password,
           full_name = EXCLUDED.full_name,
           role = EXCLUDED.role,
           gender = EXCLUDED.gender,
           birth_year = EXCLUDED.birth_year
     RETURNING id`,
    [email, passwordHash, fullName, role, gender, birthYear]
  );

  return user;
}

async function cleanupPreviousSeedEvents(client, adminId) {
  const query = buildSeedEventCleanupQuery(adminId);
  const { rows } = await client.query(query.text, query.values);
  return rows.length;
}

async function findReusableSeedEvent(client, adminId, title) {
  const { rows } = await client.query(
    `SELECT e.id
       FROM events e
      WHERE e.created_by = $1
        AND e.title = $2
      ORDER BY e.created_at ASC
      LIMIT 1`,
    [adminId, title]
  );

  return rows[0] || null;
}

async function upsertSeedEvent(client, event, adminId) {
  const existing = await findReusableSeedEvent(client, adminId, event.title);
  const values = [
    event.title,
    event.description,
    event.venue,
    event.event_date,
    event.poster_url,
    event.category,
    event.status,
    event.sale_start_at || null,
    Boolean(event.is_featured),
    Boolean(event.queue_enabled),
    Number(event.queue_batch_size || 50),
    adminId,
  ];

  if (existing) {
    const { rows: [updated] } = await client.query(
      `UPDATE events
          SET title = $1,
              description = $2,
              venue = $3,
              event_date = $4,
              poster_url = $5,
              category = $6,
              status = $7,
              sale_start_at = $8,
              is_featured = $9,
              queue_enabled = $10,
              queue_batch_size = $11
        WHERE id = $12
        RETURNING id`,
      [...values.slice(0, 11), existing.id]
    );

    return { event: updated, created: false };
  }

  const { rows: [created] } = await client.query(
    `INSERT INTO events
       (title, description, venue, event_date, poster_url, category, status,
        sale_start_at, is_featured, queue_enabled, queue_batch_size, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    values
  );

  return { event: created, created: true };
}

async function eventHasZones(client, eventId) {
  const { rows: [row] } = await client.query(
    'SELECT COUNT(*)::int AS count FROM zones WHERE event_id = $1',
    [eventId]
  );

  return Number(row.count) > 0;
}

async function createZonesAndSeats(client, eventId, zones) {
  for (const zone of zones) {
    const { rows: [createdZone] } = await client.query(
      `INSERT INTO zones (event_id, name, rows, cols, price, color)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [eventId, zone.name, zone.rows, zone.cols, zone.price, zone.color]
    );

    const vals = [];
    const params = [];
    let idx = 1;
    for (let r = 0; r < zone.rows; r += 1) {
      for (let c = 0; c < zone.cols; c += 1) {
        const label = `${zone.name}-${String.fromCharCode(65 + r)}${String(c + 1).padStart(2, '0')}`;
        vals.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
        params.push(createdZone.id, eventId, r, c, label);
      }
    }

    await client.query(
      `INSERT INTO seats (zone_id, event_id, row_idx, col_idx, label)
       VALUES ${vals.join(',')}`,
      params
    );
  }
}

async function findReusableSeedNewsPost(client, adminId, title) {
  const { rows } = await client.query(
    `SELECT n.id
       FROM news_posts n
      WHERE n.created_by = $1
        AND n.title = $2
      ORDER BY n.created_at ASC
      LIMIT 1`,
    [adminId, title]
  );

  return rows[0] || null;
}

async function upsertSeedNewsPost(client, newsPost, adminId) {
  const existing = await findReusableSeedNewsPost(client, adminId, newsPost.title);
  const summary = newsPost.summary?.trim() || null;
  const imageUrl = newsPost.image_url?.trim() || null;
  const status = newsPost.status || 'draft';
  const publishedAt = status === 'published'
    ? newsPost.published_at || new Date().toISOString()
    : null;

  const values = [
    newsPost.title,
    summary,
    newsPost.content,
    imageUrl,
    status,
    adminId,
    publishedAt,
  ];

  if (existing) {
    const { rows: [updated] } = await client.query(
      `UPDATE news_posts
          SET title = $1,
              summary = $2,
              content = $3,
              image_url = $4,
              status = $5::text,
              created_by = $6,
              published_at = CASE
                WHEN $5::text = 'published' THEN COALESCE(news_posts.published_at, $7::timestamptz, NOW())
                ELSE NULL
              END,
              updated_at = NOW()
        WHERE id = $8
        RETURNING id`,
      [...values, existing.id]
    );

    return { newsPost: updated, created: false };
  }

  const { rows: [created] } = await client.query(
    `INSERT INTO news_posts
       (title, summary, content, image_url, status, created_by, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id`,
    values
  );

  return { newsPost: created, created: true };
}

export async function seed(db = pool) {
  let client;
  try {
    client = await db.connect();
    console.log('Seeding database...');
    await client.query('BEGIN');

    const adminHash = await bcrypt.hash('admin123', 12);
    const userHash = await bcrypt.hash('user123', 12);

    const admin = await upsertUser(client, {
      email: 'admin@ticketrush.vn',
      passwordHash: adminHash,
      fullName: 'Admin TicketRush',
      role: 'admin',
      gender: 'other',
      birthYear: 1990,
    });

    const userA = await upsertUser(client, {
      email: 'nguyen.van.a@example.com',
      passwordHash: userHash,
      fullName: 'Nguyen Van A',
      gender: 'male',
      birthYear: 1998,
    });

    await upsertUser(client, {
      email: 'tran.thi.b@example.com',
      passwordHash: userHash,
      fullName: 'Tran Thi B',
      gender: 'female',
      birthYear: 2001,
    });

    console.log(`Users ready: admin=${admin.id}, userA=${userA.id}`);

    const deletedEvents = await cleanupPreviousSeedEvents(client, admin.id);
    if (deletedEvents > 0) {
      console.log(`Removed ${deletedEvents} previous seed event(s) without sales.`);
    }

    for (const eventData of seedEvents) {
      const { event, created } = await upsertSeedEvent(client, eventData, admin.id);
      const hasZones = await eventHasZones(client, event.id);

      if (!hasZones) {
        await createZonesAndSeats(client, event.id, getSeatPlan(eventData));
      }

      console.log(`${created ? 'Created' : 'Updated'} event: "${eventData.title}"`);
    }

    for (const newsPostData of seedNewsPosts) {
      const { created } = await upsertSeedNewsPost(client, newsPostData, admin.id);
      console.log(`${created ? 'Created' : 'Updated'} news: "${newsPostData.title}"`);
    }

    await client.query('COMMIT');
    console.log('\nSeed complete.\n');
    console.log('Admin login: admin@ticketrush.vn / admin123');
    console.log('User login : nguyen.van.a@example.com / user123');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client?.release();
    await db.end();
  }
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === path.resolve(entry);
}

if (isDirectRun()) {
  seed().catch(err => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  });
}
