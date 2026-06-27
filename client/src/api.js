import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

export const TAGS = [
  'finance', 'safety', 'infrastructure', 'policy',
  'parks_rec', 'environment', 'housing', 'other',
];

export const ROLE_LABELS = {
  top_admin: 'Top Level Admin',
  iac_board: 'IAC Board Member',
  hub_admin: 'Community Hub Admin',
  hub_moderator: 'Community Hub Moderator',
  member: 'Community Hub Member',
};

export const RANK = {
  member: 1, hub_moderator: 2, hub_admin: 3, iac_board: 4, top_admin: 5,
};
export const isStaff = (u) => u && RANK[u.role] >= RANK.hub_moderator;
export const isGlobal = (u) => u && RANK[u.role] >= RANK.iac_board;
