export function PageContainer({ children, className = '', maxWidth = 'max-w-6xl' }) {
  return (
    <div className={`${maxWidth} mx-auto px-4 py-8 ${className}`}>
      {children}
    </div>
  );
}
