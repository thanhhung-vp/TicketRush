import { CATEGORIES } from '../../../utils/constants.js';

export function EventFilters({ filters, onChange }) {
  const hasActiveFilter =
    filters.search || filters.category || filters.location || filters.dateFrom || filters.dateTo;

  const handleClear = () =>
    onChange({ search: '', category: '', location: '', dateFrom: '', dateTo: '' });

  return (
    <div className="space-y-4">
      {/* Text inputs row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Tìm kiếm sự kiện..."
            value={filters.search ?? ''}
            onChange={e => onChange({ search: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
          />
        </div>
        <div className="sm:w-56">
          <input
            type="text"
            placeholder="Địa điểm..."
            value={filters.location ?? ''}
            onChange={e => onChange({ location: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Date range row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={e => onChange({ dateFrom: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-gray-300"
          />
        </div>
        <div className="flex-1">
          <input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={e => onChange({ dateTo: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-gray-300"
          />
        </div>
      </div>

      {/* Category pills + clear */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => onChange({ category: cat.value })}
            className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
              filters.category === cat.value
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}

        {hasActiveFilter && (
          <button
            onClick={handleClear}
            className="ml-auto px-3 py-1.5 rounded-full text-sm border border-red-800 bg-red-950/30 text-red-400 hover:bg-red-900/40 transition-all"
          >
            Xóa bộ lọc ✕
          </button>
        )}
      </div>
    </div>
  );
}
