// Role badges using icons from /icons folder
export const BADGE_DEV = '<img src="icons/admin.png" style="height:16px;vertical-align:middle;margin-left:4px" title="Developer">';
export const BADGE_DEV_SM = '<img src="icons/admin.png" style="height:13px;vertical-align:middle;margin-left:3px" title="Developer">';

export const BADGE_MOD_PLUS = '<img src="icons/moderator-plus.png" style="height:16px;vertical-align:middle;margin-left:4px" title="Moderator+">';
export const BADGE_MOD_PLUS_SM = '<img src="icons/moderator-plus.png" style="height:13px;vertical-align:middle;margin-left:3px" title="Moderator+">';

export const BADGE_MOD = '<img src="icons/moderator.png" style="height:16px;vertical-align:middle;margin-left:4px" title="Moderator">';
export const BADGE_MOD_SM = '<img src="icons/moderator.png" style="height:13px;vertical-align:middle;margin-left:3px" title="Moderator">';

export const BADGE_VERIFIED = '<img src="icons/verify.png" style="height:16px;vertical-align:middle;margin-left:4px" title="Verified">';
export const BADGE_VERIFIED_SM = '<img src="icons/verify.png" style="height:13px;vertical-align:middle;margin-left:3px" title="Verified">';

export const BADGE_BEST = '<img src="icons/best.png" style="height:16px;vertical-align:middle;margin-left:4px" title="Best">';
export const BADGE_BEST_SM = '<img src="icons/best.png" style="height:13px;vertical-align:middle;margin-left:3px" title="Best">';

// Role hierarchy: user < mod < mod+ < dev
export const ROLE_HIERARCHY = { user: 0, mod: 1, 'mod+': 2, dev: 3 };

export function getHighestRole(profile) {
  if (profile.is_admin) return 'dev';
  if (profile.role === 'mod+') return 'mod+';
  if (profile.role === 'mod') return 'mod';
  return 'user';
}

export function canBanRole(claimerRole, targetRole) {
  const c = ROLE_HIERARCHY[claimerRole] || 0;
  const t = ROLE_HIERARCHY[targetRole] || 0;
  return c > t;
}

export function getRoleBadges(profile) {
  const badges = [];
  if (profile.is_admin) {
    badges.push(BADGE_DEV);
  } else if (profile.role === 'mod+') {
    badges.push(BADGE_MOD_PLUS);
  } else if (profile.role === 'mod') {
    badges.push(BADGE_MOD);
  }
  if (profile.is_verified) badges.push(BADGE_VERIFIED);
  if (profile.is_best) badges.push(BADGE_BEST);
  return badges;
}

export function getRoleBadgesSm(profile) {
  const badges = [];
  if (profile.is_admin) {
    badges.push(BADGE_DEV_SM);
  } else if (profile.role === 'mod+') {
    badges.push(BADGE_MOD_PLUS_SM);
  } else if (profile.role === 'mod') {
    badges.push(BADGE_MOD_SM);
  }
  if (profile.is_verified) badges.push(BADGE_VERIFIED_SM);
  if (profile.is_best) badges.push(BADGE_BEST_SM);
  return badges;
}
