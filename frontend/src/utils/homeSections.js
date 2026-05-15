export function isPastEvent(event, now = new Date()) {
  if (event?.status === 'ended') return true;

  const eventDate = new Date(event?.event_date);
  if (Number.isNaN(eventDate.getTime())) return false;

  return eventDate < now;
}

export function splitEventsBySchedule(events = [], now = new Date()) {
  return events.reduce(
    (groups, event) => (
      isPastEvent(event, now)
        ? { upcoming: groups.upcoming, past: [...groups.past, event] }
        : { upcoming: [...groups.upcoming, event], past: groups.past }
    ),
    { upcoming: [], past: [] }
  );
}

export function getTotalPages(items = [], pageSize = 1) {
  const safePageSize = Math.max(Math.trunc(Number(pageSize)) || 1, 1);
  return Math.max(Math.ceil(items.length / safePageSize), 1);
}

export function clampPage(page, totalPages) {
  const maxPage = Math.max(Math.trunc(Number(totalPages)) || 1, 1);
  const currentPage = Math.trunc(Number(page)) || 1;
  return Math.min(Math.max(currentPage, 1), maxPage);
}

export function getPageItems(items = [], page = 1, pageSize = 1) {
  const safePageSize = Math.max(Math.trunc(Number(pageSize)) || 1, 1);
  const currentPage = clampPage(page, getTotalPages(items, safePageSize));
  const start = (currentPage - 1) * safePageSize;

  return items.slice(start, start + safePageSize);
}

export function getCompactPaginationItems(totalPages, currentPage) {
  const total = Math.max(Math.trunc(Number(totalPages)) || 1, 1);
  const current = clampPage(currentPage, total);

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, 'ellipsis', total];
  }

  if (current >= total - 2) {
    return [1, 'ellipsis', total - 2, total - 1, total];
  }

  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
}
