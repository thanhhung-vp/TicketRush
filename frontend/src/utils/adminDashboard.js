import { clampPage, getPageItems, getTotalPages } from './homeSections.js';

export const OCCUPANCY_PAGE_SIZE = 6;

function normalizeSearch(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getEventOccupancyPercent(event) {
  const soldSeats = Number(event?.sold_seats || 0);
  const totalSeats = Number(event?.total_seats || 0);

  if (!Number.isFinite(soldSeats) || !Number.isFinite(totalSeats) || totalSeats <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((soldSeats / totalSeats) * 100)));
}

export function filterOccupancyEvents(events = [], query = '') {
  const normalizedQuery = normalizeSearch(query);
  const source = Array.isArray(events) ? events : [];

  if (!normalizedQuery) return [...source];

  return source.filter(event => {
    const searchable = normalizeSearch([
      event?.title,
      event?.venue,
      event?.category,
    ].filter(Boolean).join(' '));

    return searchable.includes(normalizedQuery);
  });
}

export function getOccupancyPage(events = [], { page = 1, pageSize = OCCUPANCY_PAGE_SIZE, query = '' } = {}) {
  const filteredEvents = filterOccupancyEvents(events, query);
  const totalPages = getTotalPages(filteredEvents, pageSize);
  const currentPage = clampPage(page, totalPages);

  return {
    items: getPageItems(filteredEvents, currentPage, pageSize),
    filteredEvents,
    currentPage,
    totalPages,
    totalItems: filteredEvents.length,
  };
}
