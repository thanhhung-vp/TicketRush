const baseControl =
  'w-full bg-fill-tertiary rounded-md px-4 py-2.5 text-body text-label-primary placeholder-label-tertiary ' +
  'border border-transparent ' +
  'focus:outline-none focus:border-info focus:shadow-focus ' +
  'transition-[box-shadow,border-color] duration-fast ease-standard';

const errorControl = 'border-danger focus:border-danger focus:shadow-focus-danger';

function Field({ label, error, children }) {
  return (
    <div>
      {label && <label className="block text-subhead text-label-secondary mb-1">{label}</label>}
      {children}
      {error && <p className="text-footnote text-danger mt-1">{error}</p>}
    </div>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <Field label={label} error={error}>
      <input
        {...props}
        className={`${baseControl} ${error ? errorControl : ''} ${className}`}
      />
    </Field>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <Field label={label} error={error}>
      <textarea
        {...props}
        className={`${baseControl} resize-none ${error ? errorControl : ''} ${className}`}
      />
    </Field>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <Field label={label} error={error}>
      <select
        {...props}
        className={`${baseControl} ${error ? errorControl : ''} ${className}`}
      >
        {children}
      </select>
    </Field>
  );
}
