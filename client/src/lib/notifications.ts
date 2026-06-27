import type { Notification } from '../types';

export function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Where a notification points to: the concern or forum detail page.
export function linkFor(n: Notification): string | null {
  if (n.concern) return `/community/concerns/${n.concern._id}`;
  if (n.forum) return `/community/forums/${n.forum._id}`;
  return null;
}
