import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SCROLL_RESET_EVENT = 'ticketrush:scroll-reset';

function scrollToHash(hash) {
  const id = decodeURIComponent(hash.slice(1));
  const target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView({ behavior: 'auto', block: 'start' });
  return true;
}

export default function ScrollRestoration() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(SCROLL_RESET_EVENT));

    window.requestAnimationFrame(() => {
      if (hash && scrollToHash(hash)) return;
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [pathname, search, hash]);

  return null;
}
