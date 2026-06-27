import axios from 'axios';
import type { Role, Tag, User } from './types';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

export const TAGS: Tag[] = [
  'finance', 'safety', 'infrastructure', 'policy',
  'parks_rec', 'environment', 'housing', 'other',
];

export const ROLE_LABELS: Record<Role, string> = {
  top_admin: 'Top Level Admin',
  iac_board: 'IAC Board Member',
  hub_admin: 'Community Hub Admin',
  hub_moderator: 'Community Hub Moderator',
  member: 'Community Hub Member',
};

export const RANK: Record<Role, number> = {
  member: 1, hub_moderator: 2, hub_admin: 3, iac_board: 4, top_admin: 5,
};

export const isStaff = (u: User | null | undefined): boolean =>
  !!u && RANK[u.role] >= RANK.hub_moderator;
export const isGlobal = (u: User | null | undefined): boolean =>
  !!u && RANK[u.role] >= RANK.iac_board;
