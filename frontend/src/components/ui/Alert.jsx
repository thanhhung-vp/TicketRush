const STYLES = {
  error:   'bg-red-950/30 border-red-900/50 text-red-400',
  success: 'bg-green-950/30 border-green-900/50 text-green-400',
  warning: 'bg-yellow-950/20 border-yellow-700/50 text-yellow-300',
  info:    'bg-blue-950/20 border-blue-700/50 text-blue-300',
};

export function Alert({ type = 'error', children, className = '' }) {
  if (!children) return null;
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm ${STYLES[type]} ${className}`}>
      {children}
    </div>
  );
}
