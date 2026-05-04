const IMAGE_WIDTH = 960;
const CARD_WIDTH = 880;
const CARD_HEIGHT = 330;
const CARD_GAP = 28;
const PAGE_PADDING = 40;
const SIDE_STUB_WIDTH = 220;

const DEFAULT_LABELS = {
  brand: 'TicketRush',
  ticketCode: 'Ticket Code',
  seat: 'Zone / Seat',
  location: 'Location',
  time: 'Time',
  gate: 'Show QR at the gate',
  price: 'Price',
};

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function formatDate(value, locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatCurrency(value, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function wrapText(value, maxLength, maxLines = 2) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length <= maxLength) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) lines.push(currentLine);
    currentLine = word;

    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && currentLine) lines.push(currentLine);

  if (lines.length > maxLines) return lines.slice(0, maxLines);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    const lastLine = lines[lines.length - 1];
    lines[lines.length - 1] = `${lastLine.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
  }

  return lines;
}

function renderTextLines(lines, x, y, className, lineHeight) {
  return lines.map((line, index) => (
    `<text x="${x}" y="${y + index * lineHeight}" class="${className}">${escapeXml(line)}</text>`
  )).join('');
}

function renderCenteredTextLines(lines, x, y, className, lineHeight) {
  return lines.map((line, index) => (
    `<text x="${x}" y="${y + index * lineHeight}" text-anchor="middle" class="${className}">${escapeXml(line)}</text>`
  )).join('');
}

function slugifyFilePart(value) {
  const normalized = String(value || 'ticket')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'ticket';
}

function ticketIcon(x, y) {
  return `
    <g transform="translate(${x} ${y})" fill="none" stroke="#334155" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 28h98a10 10 0 0 1 10 10v18a18 18 0 0 0 0 36v18a10 10 0 0 1-10 10H18A10 10 0 0 1 8 110V92a18 18 0 0 0 0-36V38a10 10 0 0 1 10-10Z" />
      <path d="M45 55h37" />
      <path d="M45 82h56" />
      <path d="M98 30v23" />
      <path d="M98 95v23" />
    </g>
  `;
}

function renderQr(row, x, y) {
  if (!row.qrCode) {
    return `
      <rect x="${x}" y="${y}" width="144" height="144" rx="18" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" />
      <text x="${x + 72}" y="${y + 77}" text-anchor="middle" class="muted">QR</text>
    `;
  }

  return `
    <rect x="${x}" y="${y}" width="154" height="154" rx="20" fill="#ffffff" stroke="#dbeafe" stroke-width="2" />
    <image href="${escapeXml(row.qrCode)}" x="${x + 11}" y="${y + 11}" width="132" height="132" preserveAspectRatio="xMidYMid meet" />
  `;
}

function renderTicketCard(row, index, locale, labels) {
  const cardX = PAGE_PADDING;
  const cardY = PAGE_PADDING + index * (CARD_HEIGHT + CARD_GAP);
  const stubCenterX = cardX + SIDE_STUB_WIDTH / 2;
  const mainX = cardX + SIDE_STUB_WIDTH + 36;
  const qrX = cardX + CARD_WIDTH - 194;
  const qrY = cardY + 112;
  const seatLabel = `${row.zone || labels.seat} - ${row.label || ''}`.trim();
  const ticketCode = String(row.id || '').slice(0, 12).toUpperCase();
  const gateLines = wrapText(labels.gate, 18, 2);

  return `
    <g>
      <rect x="${cardX}" y="${cardY}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="26" fill="#ffffff" stroke="#dbeafe" stroke-width="2" filter="url(#shadow)" />
      <path d="M${cardX + 26} ${cardY}H${cardX + SIDE_STUB_WIDTH}V${cardY + CARD_HEIGHT}H${cardX + 26}A26 26 0 0 1 ${cardX} ${cardY + CARD_HEIGHT - 26}V${cardY + 26}A26 26 0 0 1 ${cardX + 26} ${cardY}Z" fill="url(#stubGradient)" />
      <path d="M${cardX + SIDE_STUB_WIDTH} ${cardY + 18}V${cardY + CARD_HEIGHT - 18}" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="10 10" />
      ${ticketIcon(cardX + 48, cardY + 102)}
      <text x="${cardX + 52}" y="${cardY + 62}" class="brand">${escapeXml(labels.brand)}</text>
      ${renderCenteredTextLines(gateLines, stubCenterX, cardY + 266, 'stubCaption', 20)}

      ${renderTextLines(wrapText(row.eventTitle, 28, 2), mainX, cardY + 58, 'title', 38)}

      <g transform="translate(${mainX} ${cardY + 136})">
        <text x="0" y="0" class="label">${escapeXml(labels.location)}</text>
        <text x="0" y="28" class="value">${escapeXml(row.venue)}</text>
        <text x="190" y="0" class="label">${escapeXml(labels.time)}</text>
        <text x="190" y="28" class="value">${escapeXml(formatDate(row.eventDate, locale))}</text>
      </g>

      <g transform="translate(${mainX} ${cardY + 218})">
        <text x="0" y="0" class="label">${escapeXml(labels.seat)}</text>
        <text x="0" y="34" class="seat">${escapeXml(seatLabel)}</text>
        <text x="0" y="76" class="price">${escapeXml(formatCurrency(row.price, locale))}</text>
      </g>

      ${renderQr(row, qrX, qrY)}
      <text x="${qrX + 77}" y="${cardY + 294}" text-anchor="middle" class="code">${escapeXml(labels.ticketCode)} #${escapeXml(ticketCode)}</text>
    </g>
  `;
}

export function normalizeTicketsForDownload(order = {}, tickets = []) {
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const orderItemBySeat = new Map(orderItems.map(item => [item.seat_id, item]));
  const sourceTickets = Array.isArray(tickets) && tickets.length > 0 ? tickets : orderItems;

  return sourceTickets.map((ticket, index) => {
    const matchingItem = orderItemBySeat.get(ticket.seat_id) || {};

    return {
      id: ticket.id || ticket.ticket_id || matchingItem.ticket_id || ticket.seat_id || `ticket-${index + 1}`,
      orderId: ticket.order_id || order.id || '',
      eventTitle: ticket.event_title || order.event_title || '',
      venue: ticket.venue || order.venue || '',
      eventDate: ticket.event_date || order.event_date || '',
      zone: ticket.zone || matchingItem.zone || '',
      label: ticket.label || matchingItem.label || '',
      price: ticket.price ?? matchingItem.price ?? 0,
      qrCode: ticket.qr_code || ticket.qrCode || matchingItem.qr_code || '',
    };
  });
}

export function filterTicketsForSeat(tickets = [], seat = {}) {
  if (!Array.isArray(tickets)) return [];
  const selectedSeatId = seat.seat_id || seat.id;
  if (!selectedSeatId) return [];

  return tickets.filter(ticket => ticket.seat_id === selectedSeatId);
}

export function buildTicketFileName(order = {}, tickets = []) {
  const titlePart = slugifyFilePart(order.event_title || 'ticket');
  const orderPart = String(order.id || 'order').slice(0, 8);
  const rows = normalizeTicketsForDownload(order, tickets);
  const seatPart = rows.length === 1
    ? `-${slugifyFilePart(rows[0].label || rows[0].id || 'ticket')}`
    : '';

  return `${titlePart}${seatPart}-${orderPart}.png`;
}

export function buildTicketsSvg({ order = {}, tickets = [], locale = 'vi-VN', labels = {} }) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const rows = normalizeTicketsForDownload(order, tickets);
  const height = PAGE_PADDING * 2 + rows.length * CARD_HEIGHT + Math.max(0, rows.length - 1) * CARD_GAP;
  const cards = rows.map((row, index) => renderTicketCard(row, index, locale, mergedLabels)).join('');

  return {
    width: IMAGE_WIDTH,
    height,
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${IMAGE_WIDTH}" height="${height}" viewBox="0 0 ${IMAGE_WIDTH} ${height}">
        <defs>
          <linearGradient id="pageGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ecfeff" />
            <stop offset="50%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#fef9c3" />
          </linearGradient>
          <linearGradient id="stubGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#cffafe" />
            <stop offset="55%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#fef08a" />
          </linearGradient>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#0e7490" flood-opacity="0.16" />
          </filter>
        </defs>
        <style>
          text { font-family: Arial, "Segoe UI", sans-serif; }
          .brand { font-size: 18px; font-weight: 800; fill: #0891b2; }
          .stubCaption { font-size: 14px; font-weight: 700; fill: #475569; }
          .title { font-size: 30px; font-weight: 900; fill: #020617; }
          .label { font-size: 16px; font-weight: 800; fill: #334155; }
          .value { font-size: 18px; font-weight: 500; fill: #475569; }
          .seat { font-size: 25px; font-weight: 900; fill: #155e75; }
          .price { font-size: 28px; font-weight: 900; fill: #059669; }
          .code { font-size: 13px; font-weight: 800; fill: #475569; }
          .muted { font-size: 18px; font-weight: 800; fill: #94a3b8; }
        </style>
        <rect width="${IMAGE_WIDTH}" height="${height}" fill="url(#pageGradient)" />
        ${cards}
      </svg>
    `.trim(),
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not render ticket image.'));
    image.src = src;
  });
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not create ticket PNG.'));
    }, 'image/png');
  });
}

function triggerDownload(href, fileName) {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadTicketsImage({ order = {}, tickets = [], locale = 'vi-VN', labels = {} }) {
  const rows = normalizeTicketsForDownload(order, tickets);
  if (rows.length === 0) {
    throw new Error('No tickets available to download.');
  }

  const { svg, width, height } = buildTicketsSvg({ order, tickets, locale, labels });
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare ticket image.');

    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);

    const pngBlob = await canvasToPngBlob(canvas);
    const pngUrl = URL.createObjectURL(pngBlob);
    triggerDownload(pngUrl, buildTicketFileName(order, tickets));
    window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
