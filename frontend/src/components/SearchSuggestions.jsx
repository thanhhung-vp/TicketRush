import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Clock, MapPin, Search, Ticket, Trash2, X } from 'lucide-react';
import api from '../lib/api.js';
import { clearSearchHistory, readSearchHistory, saveSearchTerm } from '../utils/searchHistory.js';

const CATEGORY_ICONS = {
  music: '🎵', sports: '⚽', arts: '🎭', conference: '🎤',
  comedy: '😂', festival: '🎪', other: '✨',
};

function formatDateShort(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatVND(n) {
  if (!n) return '';
  return new Intl.NumberFormat('vi-VN').format(Number(n)) + '₫';
}

export default function SearchSuggestions({
  searchValue,
  setSearchValue,
  onSubmit,
  onClear,
  className = '',
  autoFocus = false,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(() => readSearchHistory());
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

  const submitSearchTerm = (value) => {
    const term = value.trim();
    if (!term) {
      onSubmit('');
      return;
    }

    setHistory(saveSearchTerm(term));
    onSubmit(term);
  };

  const handleSelectHistory = (term) => {
    setSearchValue(term);
    submitSearchTerm(term);
    setShowDropdown(false);
  };

  const handleSelectSuggestion = (s) => {
    setHistory(saveSearchTerm(s.label));
    if (s.type === 'event' && s.event_id) {
      navigate(`/events/${s.event_id}`);
    } else {
      setSearchValue(s.label);
      submitSearchTerm(s.label);
    }
    setShowDropdown(false);
  };

  const trimmedSearch = searchValue.trim();
  const showHistory = trimmedSearch.length === 0 && showDropdown && history.length > 0;
  const showResults = trimmedSearch.length >= 1 && showDropdown;
  const allItems = showHistory ? history.map(label => ({ type: 'history', label })) : suggestions;
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
        const item = allItems[activeIndex];
        if (item.type === 'history') handleSelectHistory(item.label);
        else handleSelectSuggestion(item);
      } else {
        submitSearchTerm(searchValue);
        setShowDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400 dark:text-gray-500">
        <Search className="h-4 w-4" aria-hidden="true" />
      </span>
      <input
        autoFocus={autoFocus}
        value={searchValue}
        onChange={e => { setSearchValue(e.target.value); setShowDropdown(true); }}
        onFocus={() => { setHistory(readSearchHistory()); setShowDropdown(true); }}
        placeholder={t('search.placeholder')}
        className="w-full rounded-full border border-gray-300 bg-gray-50 py-2 pl-10 pr-10 text-sm text-gray-800 transition placeholder-gray-400
                   focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                   dark:border-dark-border dark:bg-dark-card dark:text-gray-100 dark:placeholder-gray-500"
        onKeyDown={handleKeyDown}
      />
      {searchValue && (
        <button
          onClick={() => { onClear(); setSuggestions([]); setShowDropdown(false); }}
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
          aria-label={t('common.clear')}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {/* Dropdown */}
      {(showResults || showHistory) && (
        <div className="absolute left-0 right-0 top-full z-[9999] mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-dark-border dark:bg-dark-surface">
          <div className="p-2">
            {showHistory ? (
              <div>
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {t('search.recentSearches')}
                  </p>
                  <button
                    type="button"
                    onClick={() => { clearSearchHistory(); setHistory([]); setActiveIndex(-1); }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 transition hover:text-primary dark:text-gray-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('search.clearHistory')}
                  </button>
                </div>
                <div className="space-y-1">
                  {history.map((term, index) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleSelectHistory(term)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        activeIndex === index
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-dark-card dark:text-gray-500">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{term}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            ) : loading && suggestions.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400 dark:text-gray-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary dark:border-gray-700" />
                {t('search.searching')}
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                {t('search.noResults')} "<span className="font-medium text-gray-600 dark:text-gray-300">{searchValue}</span>"
              </div>
            ) : (
              <>
                {/* Group by type */}
                {['event', 'venue'].map(type => {
                  const group = suggestions.filter(s => s.type === type);
                  if (!group.length) return null;
                  return (
                    <div key={type} className="mb-1">
                      <p className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        {type === 'event' ? `🎫 ${t('search.events')}` : `📍 ${t('search.venues')}`}
                      </p>
                      {group.map((s, i) => {
                        const globalIdx = suggestions.indexOf(s);
                        return (
                          <button
                            key={`${s.type}-${s.label}-${i}`}
                            onClick={() => handleSelectSuggestion(s)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                              activeIndex === globalIdx
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10'
                            }`}
                          >
                            {/* Icon */}
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-base dark:bg-dark-card">
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
                                    {t(`event.categories.${s.extra_info}`, { defaultValue: s.extra_info })}
                                  </span>
                                )}
                                {s.event_date && (
                                  <span className="text-xs text-gray-400">
                                    · {formatDateShort(s.event_date)}
                                  </span>
                                )}
                                {s.min_price && (
                                  <span className="text-xs text-primary font-medium">
                                    · {t('event.priceFrom')} {formatVND(s.min_price)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Search all footer */}
                <button
                  onClick={() => { submitSearchTerm(searchValue); setShowDropdown(false); }}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-gray-100 px-3 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/5 dark:border-dark-border"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  {t('search.viewAll')} "{searchValue}"
                </button>
              </>
            )}
          </div>
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
