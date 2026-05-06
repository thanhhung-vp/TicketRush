import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

const OPENROUTER_URL  = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL   = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
const MAX_TOKENS      = 400;
const TIMEOUT_MS      = 30_000;

const PROMPT = `Bạn là content writer cho nền tảng đặt vé sự kiện TicketRush. Nhìn poster này và sinh ra:
- title: tên sự kiện ngắn gọn (5-10 từ tiếng Việt, không dấu chấm cuối)
- description: mô tả 2-3 câu hấp dẫn về sự kiện (tiếng Việt, dưới 350 ký tự)

Trả lời ĐÚNG định dạng JSON, KHÔNG kèm markdown code fence, KHÔNG thêm văn bản:
{"title":"...","description":"..."}`;

/**
 * POST /api/ai/event-from-image
 * Admin-only: send a Cloudinary image URL to OpenRouter, get back { title, description } in Vietnamese.
 */
router.post('/event-from-image', authenticate, requireAdmin, async (req, res) => {
  const { image_url } = req.body || {};
  if (!image_url || typeof image_url !== 'string' || !/^https?:\/\//i.test(image_url)) {
    return res.status(400).json({ error: 'image_url (http/https) is required' });
  }
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const r = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  process.env.CLIENT_URL || 'http://localhost:3000',
        'X-Title':       'TicketRush',
      },
      body: JSON.stringify({
        model:       DEFAULT_MODEL,
        max_tokens:  MAX_TOKENS,
        temperature: 0.5,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: image_url } },
          ],
        }],
      }),
      signal: controller.signal,
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.error('[ai] OpenRouter HTTP', r.status, errText.slice(0, 300));
      return res.status(502).json({ error: 'AI provider error', status: r.status });
    }

    const data = await r.json();
    const raw  = data?.choices?.[0]?.message?.content?.trim() || '';

    // Strip optional markdown fence; tolerate leading text.
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    let parsed = null;
    try { parsed = JSON.parse(cleaned); }
    catch (_) {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
    }

    if (!parsed || typeof parsed !== 'object') {
      return res.status(502).json({ error: 'AI returned non-JSON', raw: raw.slice(0, 300) });
    }

    return res.json({
      title:       String(parsed.title       || '').trim().slice(0, 200),
      description: String(parsed.description || '').trim().slice(0, 1000),
      model:       DEFAULT_MODEL,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI request timed out' });
    }
    console.error('[ai] error:', err);
    return res.status(500).json({ error: 'AI request failed' });
  } finally {
    clearTimeout(timer);
  }
});

export default router;
