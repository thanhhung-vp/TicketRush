import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import SearchSuggestions from './SearchSuggestions.jsx';
import ticketLogo from '../ticketlogo.png';

export default function Navbar() {
  const { user, logout }   = useAuth();
  const navigate           = useNavigate();
  const [searchParams]     = useSearchParams();
  const [open, setOpen]    = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const menuRef            = useRef(null);

  const currentSearch = searchParams.get('search') || searchParams.get('q') || '';
  const [searchValue, setSearchValue] = useState(currentSearch);

  useEffect(() => { setSearchValue(currentSearch); }, [currentSearch]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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
    <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="text-xl font-extrabold flex items-center gap-0.5 shrink-0">
          <span className="text-primary">Ticket</span>
          <span className="text-gray-800">Rush</span>
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

          {user ? (
            <>
              <Link
                to="/my-tickets"
                className="hidden sm:inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
              >
                <img src={ticketLogo} alt="" className="h-5 w-5 object-contain" />
                <span>Vé của tôi</span>
              </Link>

              <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 hover:bg-gray-100 rounded-full pl-1 pr-2 py-1 transition"
              >
                {/* Avatar */}
                <span className="w-7 h-7 rounded-full border-2 border-gray-300 bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                  <svg className="w-4 h-4 text-gray-400 translate-y-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                  </svg>
                </span>
                {/* Username */}
                <span className="hidden sm:block text-sm text-gray-700 max-w-[110px] truncate font-medium">
                  {user.email?.split('@')[0]}
                </span>
                {/* Hamburger icon */}
                <svg className="w-4 h-4 text-gray-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50 py-1.5">
                  <Link to="/my-tickets" onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                    <img src={ticketLogo} alt="" className="h-5 w-5 object-contain" />
                    <span>Vé của tôi</span>
                  </Link>
                  <Link to="/profile" onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                    Thông tin cá nhân
                  </Link>
                  <Link to="/faq" onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                    FAQ
                  </Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" onClick={() => setOpen(false)}
                      className="block px-4 py-2.5 text-sm text-amber-600 hover:bg-gray-50 transition">
                      Quản trị viên
                    </Link>
                  )}
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={handleLogout}
                    className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                    Đăng xuất
                  </button>
                </div>
              )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 transition font-medium px-3 py-1.5">
                Đăng nhập
              </Link>
              <Link to="/register"
                className="text-sm font-medium px-4 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition">
                Đăng ký
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
