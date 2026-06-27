export type Role = 'top_admin' | 'iac_board' | 'hub_admin' | 'hub_moderator' | 'member';

export type Tag =
  | 'finance' | 'safety' | 'infrastructure' | 'policy'
  | 'parks_rec' | 'environment' | 'housing' | 'other';

export type ConcernStatus = 'pending' | 'denied' | 'approved' | 'active';
export type ForumStatus = 'open' | 'closed';

/** A minimal populated reference ({ _id, name }). */
export interface Ref {
  _id: string;
  name: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  bio?: string;
  profileImage?: string;
  city?: Ref | null;
  community?: Ref | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface City {
  _id: string;
  name: string;
  description?: string;
  community: string;
}

export interface Community {
  _id: string;
  name: string;
  description?: string;
  iac?: string;
  cities: City[];
}

export interface Concern {
  _id: string;
  title: string;
  tag: Tag;
  description: string;
  author?: User | null;
  community: string;
  city?: Ref | null;
  stars: string[];
  status: ConcernStatus;
  closed: boolean;
  closedAt?: string | null;
  forum?: { _id: string; title: string; status: ForumStatus } | null;
  images?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface Comment {
  _id: string;
  author?: User | null;
  body: string;
  stars: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface Forum {
  _id: string;
  title: string;
  tag: Tag;
  description: string;
  author?: User | null;
  community: string;
  linkedConcerns: Array<{ _id: string; title: string; status: ConcernStatus; tag: Tag; closed: boolean }>;
  invitedUsers: Array<Pick<User, '_id' | 'name' | 'role'>>;
  comments: Comment[];
  status: ForumStatus;
  resolutionSummary: string;
  closedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type NotificationType =
  | 'concern_new' | 'concern_status' | 'concern_closed'
  | 'forum_new' | 'forum_comment' | 'forum_closed';

export interface Notification {
  _id: string;
  type: NotificationType;
  message: string;
  actor?: Pick<User, '_id' | 'name' | 'role' | 'profileImage'> | null;
  concern?: { _id: string; title: string } | null;
  forum?: { _id: string; title: string } | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

/** Sort direction + key used by the shared table tools. */
export interface SortState {
  key: string | null;
  dir: 'asc' | 'desc';
}
