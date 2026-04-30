import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api.js';

const CATEGORY_LABELS = {
  music: 'Live Music', sports: 'Thể thao', arts: 'Sân khấu',
  conference: 'Hội nghị', comedy: 'Hài kịch', festival: 'Lễ hội', other: 'Khác',
};

const CATEGORY_ICONS = {
  music: '🎵', sports: '⚽', arts: '🎭', conference: '🎤',
  comedy: '😂', festival: '🎪', other: '✨',
};

const POPULAR_CATEGORIES = [
  { label: 'Live Music',  category: 'music',    icon: '🎵' },
  { label: 'Thể thao',   category: 'sports',   icon: '⚽' },
  { label: 'Sân khấu',   category: 'arts',     icon: '🎭' },
  { label: 'Lễ hội',     category: 'festival', icon: '🎪' },
  { label: 'Hài kịch',   category: 'comedy',   icon: '😂' },
  { label: 'Hội nghị',   category: 'conference', icon: '🎤' },
];

function formatDateShort(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatVND(n) {
  if (!n) return '';
  return 'Từ ' + new Intl.NumberFormat('vi-VN').format(Number(n)) + '₫';
}

export default function SearchSuggestions({
  searchValue,
  setSearchValue,
  onSubmit,
  onClear,
  className = '',
  autoFocus = false,
}) {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchSuggestions = useCallback(async (query) => {
    setLoading(true);
    try {
      const { data } = await api.get('/events/suggestions', { params: { q: query } });
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (searchValue.trim().length >= 1) {
      debounceRef.current = setTimeout(() => fetchSuggestions(searchValue.trim()), 200);
    } else {
      setSuggestions([]);
    }
    setActiveIndex(-1);
    return () => clearTimeout(debounceRef.current);
  }, [searchValue, fetchSuggestions]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectSuggestion = (s) => {
    if (s.type === 'event' && s.event_id) {
      navigate(`/events/${s.event_id}`);
    } else {
      setSearchValue(s.label);
      onSubmit(s.label);
    }
    setShowDropdown(false);
  };

  const handleCategoryClick = (cat) => {
    navigate(`/?category=${cat}`);
    setShowDropdown(false);
  };

  // Keyboard navigation
  const allItems = searchValue.trim() ? suggestions : POPULAR_CATEGORIES;
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < allItems.length) {
        e.preventDefault();
        if (searchValue.trim()) {
          handleSelectSuggestion(allItems[activeIndex]);
        } else {
          handleCategoryClick(allItems[activeIndex].category);
        }
      } else {
        onSubmit(searchValue);
        setShowDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const showPopular  = !searchValue.trim() && showDropdown;
  const showResults  = searchValue.trim().length >= 1 && showDropdown;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      <input
        autoFocus={autoFocus}
        value={searchValue}
        onChange={e => { setSearchValue(e.target.value); setShowDropdown(true); }}
        onFocus={() => setShowDropdown(true)}
        placeholder="Tìm sự kiện, nghệ sĩ, địa điểm..."
        className="w-full bg-gray-50 border border-gray-300 rounded-full pl-10 pr-10 py-2 text-sm
                   focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                   placeholder-gray-400 transition text-gray-800"
        onKeyDown={handleKeyDown}
      />
      {searchValue && (
        <button
          onClick={() => { onClear(); setSuggestions([]); setShowDropdown(false); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition text-lg leading-none z-10"
        >×</button>
      )}

      {/* Dropdown */}
      {(showPopular || showResults) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-[9999]">

          {/* Popular categories (when input empty) */}
          {showPopular && (
            <div className="p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
                🔥 Khám phá theo thể loại
              </p>
              <div className="grid grid-cols-2 gap-1">
                {POPULAR_CATEGORIES.map((item, idx) => (
                  <button
                    key={item.category}
                    onClick={() => handleCategoryClick(item.category)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all ${
                      activeIndex === idx
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live search results */}
          {showResults && (
            <div className="p-2">
              {loading && suggestions.length === 0 ? (
                <div className="flex items-center justify-center py-6 gap-2 text-sm text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                  Đang tìm kiếm...
                </div>
              ) : suggestions.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">
                  Không tìm thấy kết quả cho "<span className="font-medium text-gray-600">{searchValue}</span>"
                </div>
              ) : (
                <>
                  {/* Group by type */}
                  {['event', 'venue'].map(type => {
                    const group = suggestions.filter(s => s.type === type);
                    if (!group.length) return null;
                    return (
                      <div key={type} className="mb-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-1.5">
                          {type === 'event' ? '🎫 Sự kiện' : '📍 Địa điểm'}
                        </p>
                        {group.map((s, i) => {
                          const globalIdx = suggestions.indexOf(s);
                          return (
                            <button
                              key={`${s.type}-${s.label}-${i}`}
                              onClick={() => handleSelectSuggestion(s)}
                              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-left transition-all ${
                                activeIndex === globalIdx
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {/* Icon */}
                              <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-base">
                                {type === 'event'
                                  ? (CATEGORY_ICONS[s.extra_info] || '🎫')
                                  : '📍'}
                              </span>

                              {/* Text */}
                              <div className="flex-1 min-w-0">
                                <HighlightedText text={s.label} query={searchValue} />
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {s.extra_info && (
                                    <span className="text-xs text-gray-400">
                                      {CATEGORY_LABELS[s.extra_info] || s.extra_info}
                                    </span>
                                  )}
                                  {s.event_date && (
                                    <span className="text-xs text-gray-400">
                                      · {formatDateShort(s.event_date)}
                                    </span>
                                  )}
                                  {s.min_price && (
                                    <span className="text-xs text-primary font-medium">
                                      · {formatVND(s.min_price)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Search all footer */}
                  <button
                    onClick={() => { onSubmit(searchValue); setShowDropdown(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 mt-1 text-sm text-primary hover:bg-primary/5 rounded-xl transition font-medium border-t border-gray-100"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Xem tất cả kết quả cho "{searchValue}"
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HighlightedText({ text, query }) {
  if (!query.trim()) return <span className="font-medium">{text}</span>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span className="font-medium">
      {parts.map((part, i) =>
        regex.test(part)
          ? <span key={i} className="text-primary font-bold">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}
