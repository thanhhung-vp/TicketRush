import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import SearchSuggestions from './SearchSuggestions.jsx';
import ThemeToggle from './ui/ThemeToggle.jsx';
import LanguageSwitcher from './ui/LanguageSwitcher.jsx';
import UserNavigation from './ui/UserNavigation.jsx';
import ticketLogo from '../ticketlogo.png';

export default function Navbar() {
  const { t }              = useTranslation();
  const { user }           = useAuth();
  const [searchParams]     = useSearchParams();
  const [mobileSearch, setMobileSearch] = useState(false);

  const currentSearch = searchParams.get('search') || searchParams.get('q') || '';
  const [searchValue, setSearchValue] = useState(currentSearch);
  const navigate = useNavigate();

  useEffect(() => { setSearchValue(currentSearch); }, [currentSearch]);

  const submitSearch = (value) => {
    const trimmed = value.trim();
    navigate(trimmed ? `/?search=${encodeURIComponent(trimmed)}` : '/');
    setMobileSearch(false);
  };

  const clearSearch = () => {
    setSearchValue('');
    navigate('/');
  };

  return (
    <nav className="bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border px-4 sm:px-6 py-3 sticky top-0 z-50 shadow-sm dark:shadow-black/20 transition-colors duration-200">
      <div className="flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="text-xl font-extrabold flex items-center gap-0.5 shrink-0">
          <span className="text-primary">Ticket</span>
          <span className="text-gray-800 dark:text-white">Rush</span>
        </Link>

        {/* Search bar — desktop */}
        <div className="hidden md:flex flex-1 max-w-md">
          <SearchSuggestions
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            onSubmit={submitSearch}
            onClear={clearSearch}
            className="w-full"
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile search toggle */}
          <button
            onClick={() => setMobileSearch(v => !v)}
            className="md:hidden text-gray-500 hover:text-gray-700 transition p-1.5"
            aria-label="Tìm kiếm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Theme + Language toggles */}
          <div className="hidden sm:flex items-center gap-1.5">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>

          {user ? (
            <>
              {/* My Tickets shortcut */}
              <Link
                to="/my-tickets"
                className="inline-flex rounded-full bg-gradient-to-r from-primary via-secondary to-emerald-400 p-[1.5px] text-sm font-semibold shadow-sm shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/20"
              >
                <span className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white dark:bg-dark-surface px-3 text-gray-800 dark:text-gray-100 transition hover:bg-gray-50 dark:hover:bg-dark-card sm:px-3.5">
                  <img src={ticketLogo} alt="" className="h-5 w-5 shrink-0 -translate-y-0.5 object-contain" />
                  <span className="leading-none hidden sm:inline">{t('nav.myTickets')}</span>
                </span>
              </Link>

              {/* Bell + Avatar */}
              <UserNavigation hasNotification={false} />
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition font-medium px-3 py-1.5">
                {t('nav.login')}
              </Link>
              <Link to="/register"
                className="text-sm font-medium px-4 py-1.5 rounded-full border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-card transition">
                {t('nav.register')}
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile search — expandable */}
      {mobileSearch && (
        <div className="md:hidden mt-3">
          <SearchSuggestions
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            onSubmit={submitSearch}
            onClear={clearSearch}
            autoFocus
            className="w-full"
          />
        </div>
      )}
    </nav>
  );
}
