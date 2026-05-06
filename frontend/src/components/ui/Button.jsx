const VARIANTS = {
  primary:     'bg-accent hover:bg-accent-hover active:bg-accent-pressed text-white border border-transparent',
  secondary:   'bg-fill-tertiary hover:bg-fill-quaternary text-label-primary border border-transparent',
  ghost:       'bg-transparent hover:bg-fill-quaternary text-label-primary border border-transparent',
  destructive: 'bg-danger hover:bg-danger active:bg-danger text-white border border-transparent',
  link:        'bg-transparent text-accent hover:underline border border-transparent px-0 py-0',
};

const SIZES = {
  sm:   'px-3 py-1.5 text-footnote',
  md:   'px-5 py-2.5 text-subhead font-medium',
  lg:   'px-6 py-3   text-body    font-semibold min-h-[44px]',
  full: 'px-6 py-3   text-body    font-semibold min-h-[44px] w-full',
};

export function Button({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl
        transition-[transform,background-color,color] duration-fast ease-standard
        active:scale-[0.98]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        focus-visible:outline-none focus-visible:shadow-focus
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
