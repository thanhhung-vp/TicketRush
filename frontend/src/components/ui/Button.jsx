const VARIANTS = {
  primary:   'bg-blue-600 hover:bg-blue-700 text-white',
  success:   'bg-green-600 hover:bg-green-500 text-white',
  danger:    'bg-red-600 hover:bg-red-500 text-white',
  ghost:     'border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500',
  secondary: 'bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white',
};

const SIZES = {
  sm:  'px-3 py-1.5 text-sm',
  md:  'px-5 py-2.5 text-sm font-medium',
  lg:  'px-6 py-3 text-base font-bold',
  full:'px-6 py-3 text-base font-bold w-full',
};

export function Button({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
