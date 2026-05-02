const VARIANT_CLS = {
  default:  'bg-gray-800 text-gray-300 border border-gray-700',
  success:  'bg-green-900/40 text-green-400 border border-green-800',
  warning:  'bg-yellow-900/40 text-yellow-400 border border-yellow-800',
  danger:   'bg-red-900/40 text-red-400 border border-red-800',
  info:     'bg-blue-900/40 text-blue-400 border border-blue-800',
  admin:    'bg-yellow-900/40 text-yellow-400 border border-yellow-800',
};

export function Badge({ variant = 'default', className = '', children }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${VARIANT_CLS[variant]} ${className}`}>
      {children}
    </span>
  );
}
