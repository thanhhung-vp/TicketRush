import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import SearchSuggestions from './SearchSuggestions.jsx';
import ThemeToggle from './ui/ThemeToggle.jsx';
import LanguageSwitcher from './ui/LanguageSwitcher.jsx';
import UserNavigation from './ui/UserNavigation.jsx';
import ticketLogo from '../ticketlogo.png';
import ticketLogoDark from '../../ticket trang.png';

export default function Navbar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [searchParams] = useSearchParams();
  const [mobileSearch, setMobileSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const currentSearch = searchParams.get('search') || searchParams.get('q') || '';
  const [searchValue, setSearchValue] = useState(currentSearch);
  const navigate = useNavigate();

  useEffect(() => { setSearchValue(currentSearch); }, [currentSearch]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const submitSearch = (value) => {
    const trimmed = value.trim();
    navigate(trimmed ? `/?search=${encodeURIComponent(trimmed)}` : '/');
    setMobileSearch(false);
  };

  const clearSearch = () => {
    setSearchValue('');
    navigate('/');
  };

  const compactShell = isDark
    ? 'max-w-5xl rounded-full border-white/20 bg-black/70 px-4 py-2 shadow-2xl shadow-black/25 backdrop-blur-2xl sm:px-5'
    : 'max-w-5xl rounded-full border-gray-200/80 bg-white/80 px-4 py-2 shadow-xl shadow-slate-900/10 backdrop-blur-2xl sm:px-5';
  const compactText = isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-950';
  const compactHover = isDark ? 'hover:bg-white/10' : 'hover:bg-gray-900/5';
  const compactLogoPrimary = isDark ? 'text-white' : 'text-primary';
  const compactLogoSecondary = isDark ? 'text-white/80' : 'text-gray-900';

  return (
    <nav className="sticky top-0 z-50 px-3 py-3 transition-all duration-300 sm:px-6">
      <div
        className={`mx-auto flex items-center justify-between gap-4 border transition-all duration-300 ease-out ${
          scrolled
            ? compactShell
            : 'max-w-6xl rounded-2xl border-transparent bg-transparent px-0 py-0 shadow-none'
        }`}
      >
        <Link to="/" className="flex shrink-0 items-center gap-0.5 text-xl font-extrabold">
          <span className={scrolled ? compactLogoPrimary : 'text-primary'}>Ticket</span>
          <span className={scrolled ? compactLogoSecondary : 'text-gray-800 dark:text-white'}>Rush</span>
        </Link>

        <div className={`hidden flex-1 transition-all duration-300 md:flex ${scrolled ? 'max-w-sm opacity-90' : 'max-w-md'}`}>
          <SearchSuggestions
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            onSubmit={submitSearch}
            onClear={clearSearch}
            className="w-full"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setMobileSearch(v => !v)}
            className={`p-1.5 transition md:hidden ${
              scrolled
                ? compactText
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white'
            }`}
            aria-label="Tìm kiếm"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <div className="hidden items-center gap-1.5 sm:flex">
            <ThemeToggle className={scrolled ? `${compactText} ${compactHover}` : ''} />
            <LanguageSwitcher className={scrolled ? `${compactText} ${compactHover}` : ''} />
          </div>

          {user ? (
            <>
              <Link
                to="/my-tickets"
                className="inline-flex rounded-full bg-gradient-to-r from-primary via-secondary to-emerald-400 p-[1.5px] text-sm font-semibold shadow-sm shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/20"
              >
                <span className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-3 transition sm:px-3.5 ${
                  scrolled
                    ? isDark
                      ? 'bg-black/80 text-white hover:bg-black/60'
                      : 'bg-white/90 text-gray-900 hover:bg-white'
                    : 'bg-white text-gray-800 hover:bg-gray-50 dark:bg-dark-surface dark:text-gray-100 dark:hover:bg-dark-card'
                }`}>
                  <img src={isDark ? ticketLogoDark : ticketLogo} alt="" className="h-5 w-5 shrink-0 -translate-y-0.5 object-contain" />
                  <span className="hidden leading-none sm:inline">{t('nav.myTickets')}</span>
                </span>
              </Link>

              <UserNavigation hasNotification={false} />
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  scrolled
                    ? compactText
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                }`}
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  scrolled
                    ? isDark
                      ? 'border-white/20 text-white/80 hover:bg-white/10 hover:text-white'
                      : 'border-gray-300/80 text-gray-700 hover:bg-gray-900/5 hover:text-gray-950'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-dark-border dark:text-gray-200 dark:hover:bg-dark-card'
                }`}
              >
                {t('nav.register')}
              </Link>
            </>
          )}
        </div>
      </div>

      {mobileSearch && (
        <div className={`mx-auto mt-3 max-w-5xl rounded-2xl border p-3 backdrop-blur-2xl ${
          isDark ? 'border-white/15 bg-black/70' : 'border-gray-200/80 bg-white/85'
        } md:hidden`}>
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
