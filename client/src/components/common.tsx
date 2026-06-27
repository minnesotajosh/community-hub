import type { ReactNode } from 'react';
import { TAGS } from '../api';
import type { Tag as TagType, User } from '../types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Re-export shadcn primitives so the rest of the app imports from one place.
export { Button } from '@/components/ui/button';
export { Input } from '@/components/ui/input';
export { Textarea } from '@/components/ui/textarea';
export { Checkbox } from '@/components/ui/checkbox';
export { Label } from '@/components/ui/label';

export interface Option { value: string; label: string }

// Native-<select>-like wrapper around the shadcn (base-ui) Select.
// An empty-string value is treated as "no selection" so the placeholder shows.
export function SelectField({ value, onChange, options, placeholder, disabled, required, className }: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  return (
    <Select
      value={value === '' ? null : value}
      onValueChange={(v) => onChange((v as string) ?? '')}
      items={options}
      disabled={disabled}
      required={required}
    >
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

const TAG_COLORS: Record<string, string> = {
  finance: 'bg-emerald-100 text-emerald-700',
  safety: 'bg-red-100 text-red-700',
  infrastructure: 'bg-amber-100 text-amber-700',
  policy: 'bg-indigo-100 text-indigo-700',
  parks_rec: 'bg-lime-100 text-lime-700',
  environment: 'bg-teal-100 text-teal-700',
  housing: 'bg-purple-100 text-purple-700',
  other: 'bg-slate-200 text-slate-700',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  denied: 'bg-red-100 text-red-700',
  approved: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  open: 'bg-green-100 text-green-700',
  closed: 'bg-slate-200 text-slate-600',
};

export function Tag({ tag }: { tag: TagType }) {
  return (
    <Badge variant="outline" className={cn('border-transparent font-medium', TAG_COLORS[tag] || TAG_COLORS.other)}>
      {tag.replace('_', ' & ')}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn('border-transparent uppercase tracking-wide', STATUS_COLORS[status] || 'bg-slate-200')}>
      {status}
    </Badge>
  );
}

export function Rich({ html }: { html?: string }) {
  return <div className="rich text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: html || '' }} />;
}

export function Avatar({ user, large = false }: { user?: Pick<User, 'name'> | null; large?: boolean }) {
  const initials = (user?.name || '?').split(' ').map((n) => n[0]).slice(0, 2).join('');
  return (
    <div className={`${large ? 'h-12 w-12 text-base' : 'h-8 w-8 text-xs'} rounded-full bg-brand-500 text-white flex items-center justify-center font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

export function TagSelect({ value, onChange }: { value: TagType; onChange: (t: TagType) => void }) {
  return (
    <SelectField className="w-44" value={value} onChange={(v) => onChange(v as TagType)}
      options={TAGS.map((t) => ({ value: t, label: t.replace('_', ' & ') }))} />
  );
}

// Thin wrapper over the shadcn Dialog that keeps our { open, onClose, title } API.
export function Modal({ open, onClose, title, children, className }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={cn('sm:max-w-md max-h-[85vh] flex flex-col', className)}>
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto min-h-0 -mr-2 pr-2">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
