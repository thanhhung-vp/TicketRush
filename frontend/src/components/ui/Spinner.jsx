export function Spinner({ size = 'md', className = '' }) {
  const sz = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-4', lg: 'w-16 h-16 border-4' }[size];
  return (
    <div className={`${sz} border-accent border-t-transparent rounded-full animate-spin ${className}`} />
  );
}

export function PageSpinner() {
  return (
    <div className="flex justify-center items-center py-20">
      <Spinner size="lg" />
    </div>
  );
}
