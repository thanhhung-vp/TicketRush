const STYLES = {
  error:   'bg-danger-tint  border-danger  text-danger',
  success: 'bg-success-tint border-success text-success',
  warning: 'bg-warning-tint border-warning text-warning',
  info:    'bg-info-tint    border-info    text-info',
};

export function Alert({ type = 'error', children, className = '' }) {
  if (!children) return null;
  return (
    <div className={`border rounded-lg px-4 py-3 text-footnote ${STYLES[type]} ${className}`}>
      {children}
    </div>
  );
}
