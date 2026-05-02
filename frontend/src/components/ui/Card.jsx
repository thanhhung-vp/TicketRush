export function Card({ className = '', children }) {
  return (
    <div className={`bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children }) {
  return <div className={`px-6 py-4 border-b border-gray-800 ${className}`}>{children}</div>;
}

export function CardBody({ className = '', children }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}
