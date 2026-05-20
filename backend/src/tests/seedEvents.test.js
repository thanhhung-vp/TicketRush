import { describe, expect, it } from 'vitest';
import {
  buildSeedEventCleanupQuery,
  getSeedEventTitles,
  seedEvents,
  seedNewsPosts,
} from '../../scripts/seed.js';

describe('seed events', () => {
  it('keeps the imported sample events unique by title, venue, and date', () => {
    const keys = seedEvents.map(event =>
      `${event.title}|${event.venue}|${event.event_date}`.toLowerCase()
    );

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('builds cleanup query scoped to safe seed events only', () => {
    const query = buildSeedEventCleanupQuery('admin-user-id', ['Event A'], ['Legacy%']);

    expect(query.text).toMatch(/DELETE FROM events e/i);
    expect(query.text).toMatch(/e\.created_by = \$1/i);
    expect(query.text).toMatch(/e\.title = ANY\(\$2::text\[\]\)/i);
    expect(query.text).toMatch(/e\.title ILIKE ANY\(\$3::text\[\]\)/i);
    expect(query.text).toMatch(/NOT EXISTS \(SELECT 1 FROM orders/i);
    expect(query.text).toMatch(/NOT EXISTS \([\s\S]*FROM tickets/i);
    expect(query.text).toMatch(/NOT EXISTS \(SELECT 1 FROM admin_ticket_actions/i);
    expect(query.values).toEqual(['admin-user-id', ['Event A'], ['Legacy%']]);
  });

  it('includes current and legacy event titles in cleanup candidates', () => {
    const titles = getSeedEventTitles();

    expect(titles).toContain('AUTOTECH & ACCESSORIES 2026');
    expect(titles).toContain('EA Summit: Vietnam 2026');
    expect(titles).toContain('VMusic Gala 2026 - Dem nhac nghe thuat');
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe('seed news posts', () => {
  it('keeps sample news posts unique by title', () => {
    const titles = seedNewsPosts.map(post => post.title.toLowerCase());

    expect(new Set(titles).size).toBe(titles.length);
    expect(titles).toContain('better search experience is rolling out');
  });

  it('includes public news posts for the home page', () => {
    const published = seedNewsPosts.filter(post => post.status === 'published');

    expect(published.length).toBeGreaterThanOrEqual(4);
  });
});
