import { useState } from 'react';
import { Flag as FlagIcon } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api';
import { Modal, Button, Textarea } from './common';

type Target =
  | { targetType: 'concern'; concernId: string }
  | { targetType: 'comment'; forumId: string; commentId: string }
  | { targetType: 'user'; userId: string };

type Props = Target & { label?: string; className?: string };

const LABELS: Record<Target['targetType'], string> = {
  concern: 'Flag this concern',
  comment: 'Flag this comment',
  user: 'Flag this account',
};

export default function FlagButton(props: Props) {
  const { label, className } = props;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { targetType: props.targetType, reason };
      if (props.targetType === 'concern') body.concernId = props.concernId;
      if (props.targetType === 'comment') { body.forumId = props.forumId; body.commentId = props.commentId; }
      if (props.targetType === 'user') body.userId = props.userId;
      await api.post('/flags', body);
      toast.success('Reported to moderators. Thanks for keeping the community safe.');
      setOpen(false); setReason('');
    } catch {
      toast.error('Could not submit the report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={className || 'inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600'}
        title={LABELS[props.targetType]}
      >
        <FlagIcon className="h-3.5 w-3.5" /> {label ?? 'Flag'}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={LABELS[props.targetType]}>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Tell moderators why this should be reviewed (optional).
          </p>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Reason — e.g. offensive language, spam, harassment…" rows={4} />
          <div className="flex gap-2">
            <Button variant="destructive" onClick={submit} disabled={busy}>Submit report</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
