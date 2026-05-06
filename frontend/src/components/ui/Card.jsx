export function Card({ className = '', elevated = false, children }) {
  const shadow = elevated ? 'shadow-1' : '';
  return (
    <div className={`bg-surface rounded-2xl border border-separator overflow-hidden ${shadow} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children }) {
  return <div className={`px-6 py-4 border-b border-separator ${className}`}>{children}</div>;
}

export function CardBody({ className = '', children }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}
