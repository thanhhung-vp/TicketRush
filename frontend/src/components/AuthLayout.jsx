const TILE_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
    <rect x='4' y='4' width='54' height='54' rx='9' fill='rgba(255,255,255,0.12)'/>
    <rect x='62' y='4' width='54' height='54' rx='9' fill='rgba(255,255,255,0.06)'/>
    <rect x='4' y='62' width='54' height='54' rx='9' fill='rgba(255,255,255,0.06)'/>
    <rect x='62' y='62' width='54' height='54' rx='9' fill='rgba(255,255,255,0.12)'/>
  </svg>`
);

export function AuthBg({ children }) {
  return (
    <div
      className="fixed inset-0 z-[60] overflow-auto flex flex-col"
      style={{ background: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 20%, #d946ef 55%, #ec4899 80%, #fda4af 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,${TILE_SVG}")`, backgroundSize: '120px 120px' }}
      />
      <div className="relative z-10 p-5">
        <a href="/" className="font-extrabold text-xl leading-none">
          <span className="text-pink-100">Ticket</span>
          <span className="text-white">Rush</span>
        </a>
      </div>
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 pb-12">
        {children}
      </div>
    </div>
  );
}

export function AuthCard({ children, title }) {
  return (
    <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-2xl px-8 py-8">
      {title && (
        <h1 className="text-[22px] font-bold text-gray-800 text-center mb-6">{title}</h1>
      )}
      {children}
    </div>
  );
}

export function IconInput({ icon, rightEl, type = 'text', ...props }) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
        {icon}
      </span>
      <input
        type={type}
        {...props}
        className={`w-full bg-gray-100 rounded-2xl pl-11 py-3.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300/60 transition ${rightEl ? 'pr-20' : 'pr-4'}`}
      />
      {rightEl && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
          {rightEl}
        </div>
      )}
    </div>
  );
}

export function PinkButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm transition hover:opacity-90 disabled:opacity-50"
      style={{ background: 'linear-gradient(90deg, #f9a8d4, #ec4899)' }}
    >
      {children}
    </button>
  );
}

export function AuthDivider({ text }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400 shrink-0">{text}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

export function GoogleAuthButton() {
  return (
    <div className="flex justify-center">
      <button
        type="button"
        title="Tính năng đang phát triển"
        className="w-12 h-12 rounded-full border border-gray-200 shadow-sm bg-white hover:bg-gray-50 transition flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      </button>
    </div>
  );
}

export function Checkbox({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-[18px] h-[18px] shrink-0 rounded border-2 flex items-center justify-center transition ${
          checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'
        }`}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="1.5,5 4,7.5 8.5,2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      {label}
    </label>
  );
}

// ── Icons ─────────────────────────────────────────────
export function EnvelopeIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
export function LockIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}
export function EyeIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}
export function EyeOffIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}
export function UserIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
export function ShieldIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
