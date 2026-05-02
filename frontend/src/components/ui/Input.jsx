export function Input({ label, error, className = '', ...props }) {
  return (
    <div>
      {label && <label className="block text-sm text-gray-400 mb-1">{label}</label>}
      <input
        {...props}
        className={`w-full bg-gray-800 border ${error ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 placeholder-gray-500 ${className}`}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div>
      {label && <label className="block text-sm text-gray-400 mb-1">{label}</label>}
      <textarea
        {...props}
        className={`w-full bg-gray-800 border ${error ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 resize-none ${className}`}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div>
      {label && <label className="block text-sm text-gray-400 mb-1">{label}</label>}
      <select
        {...props}
        className={`w-full bg-gray-800 border ${error ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 ${className}`}
      >
        {children}
      </select>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
