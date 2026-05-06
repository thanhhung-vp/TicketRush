const VARIANT_CLS = {
  default:  'bg-fill-tertiary text-label-primary',
  success:  'bg-success-tint text-success',
  warning:  'bg-warning-tint text-warning',
  danger:   'bg-danger-tint  text-danger',
  info:     'bg-info-tint    text-info',
  admin:    'bg-warning-tint text-warning',
};

export function Badge({ variant = 'default', className = '', children }) {
  return (
    <span className={`inline-flex items-center text-caption-1 font-medium px-2 py-0.5 rounded-full ${VARIANT_CLS[variant]} ${className}`}>
      {children}
    </span>
  );
}
