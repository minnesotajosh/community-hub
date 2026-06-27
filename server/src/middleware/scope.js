import { isGlobal } from './auth.js';

// Returns a Mongo filter limiting docs to the user's community,
// unless the user is global (iac_board / top_admin) who can see all.
export function communityFilter(user) {
  if (isGlobal(user)) return {};
  return { community: user.community };
}

// Throw-style guard: can this user act within the given community id?
export function canAccessCommunity(user, communityId) {
  if (isGlobal(user)) return true;
  return String(user.community) === String(communityId);
}
