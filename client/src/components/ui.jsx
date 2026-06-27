import { TAGS } from '../api';

const TAG_COLORS = {
  finance: 'bg-emerald-100 text-emerald-700',
  safety: 'bg-red-100 text-red-700',
  infrastructure: 'bg-amber-100 text-amber-700',
  policy: 'bg-indigo-100 text-indigo-700',
  parks_rec: 'bg-lime-100 text-lime-700',
  environment: 'bg-teal-100 text-teal-700',
  housing: 'bg-purple-100 text-purple-700',
  other: 'bg-slate-200 text-slate-700',
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  denied: 'bg-red-100 text-red-700',
  approved: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  open: 'bg-green-100 text-green-700',
  closed: 'bg-slate-200 text-slate-600',
};

export function Tag({ tag }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[tag] || TAG_COLORS.other}`}>
      {tag.replace('_', ' & ')}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${STATUS_COLORS[status] || 'bg-slate-200'}`}>
      {status}
    </span>
  );
}

export function Rich({ html }) {
  return <div className="rich text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: html || '' }} />;
}

export function Avatar({ user, large = false }) {
  const initials = (user?.name || '?').split(' ').map((n) => n[0]).slice(0, 2).join('');
  return (
    <div className={`${large ? 'h-12 w-12 text-base' : 'h-8 w-8 text-xs'} rounded-full bg-brand-500 text-white flex items-center justify-center font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

export function TagSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="border rounded px-2 py-1 text-sm">
      {TAGS.map((t) => <option key={t} value={t}>{t.replace('_', ' & ')}</option>)}
    </select>
  );
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-5"
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white',
    ghost: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
  };
  return (
    <button {...props}
      className={`px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50 ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}
