import { supabase } from '../supabase.js';

const STAR = '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const BADGE_DEFINITIONS = {
  first_post: { name: 'First Post', icon: STAR, color: '#6366f1', description: 'Created your first post' },
  ten_posts: { name: 'Active Poster', icon: STAR, color: '#8b5cf6', description: 'Created 10 posts' },
  hundred_posts: { name: 'Power Poster', icon: STAR, color: '#a855f7', description: 'Created 100 posts' },
  first_follower: { name: 'First Follower', icon: STAR, color: '#3b82f6', description: 'Got your first follower' },
  ten_followers: { name: 'Popular', icon: STAR, color: '#06b6d4', description: 'Got 10 followers' },
  hundred_followers: { name: 'Influencer', icon: STAR, color: '#f59e0b', description: 'Got 100 followers' },
  first_like: { name: 'First Like', icon: STAR, color: '#ef4444', description: 'Received your first like' },
  hundred_likes: { name: 'Crowd Pleaser', icon: STAR, color: '#ec4899', description: 'Received 100 likes' },
  seven_day_streak: { name: '7-Day Streak', icon: STAR, color: '#f97316', description: 'Posted for 7 consecutive days' },
  thirty_day_streak: { name: '30-Day Streak', icon: STAR, color: '#dc2626', description: 'Posted for 30 consecutive days' },
  first_story: { name: 'Storyteller', icon: STAR, color: '#14b8a6', description: 'Shared your first story' },
  verified: { name: 'Verified', icon: STAR, color: '#1d4ed8', description: 'Got verified' },
  early_adopter: { name: 'Early Adopter', icon: STAR, color: '#7c3aed', description: 'Joined in the first month' },
};

export function getBadgeDefinitions() {
  return BADGE_DEFINITIONS;
}

function isMissingTable(err) {
  return err.code === 'PGRST205' || String(err.message || '').includes('Could not find the table');
}

export async function getUserAchievements(userId) {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data || [];
  } catch (err) {
    if (isMissingTable(err)) return [];
    throw err;
  }
}

async function awardBadge(userId, badgeType) {
  try {
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_type', badgeType)
      .maybeSingle();

    if (existing) return false;

    const { error } = await supabase
      .from('user_achievements')
      .insert({ user_id: userId, badge_type: badgeType });

    return !error;
  } catch (err) {
    if (isMissingTable(err)) return false;
    return false;
  }
}

export async function checkAndAwardBadges(userId) {
  try {
    return await _checkAndAwardBadges(userId);
  } catch (err) {
    if (isMissingTable(err)) return [];
    return [];
  }
}

async function _checkAndAwardBadges(userId) {
  const awarded = [];

  const { count: postCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('post_type', 'original');

  if (postCount >= 1) {
    if (await awardBadge(userId, 'first_post')) awarded.push('first_post');
  }
  if (postCount >= 10) {
    if (await awardBadge(userId, 'ten_posts')) awarded.push('ten_posts');
  }
  if (postCount >= 100) {
    if (await awardBadge(userId, 'hundred_posts')) awarded.push('hundred_posts');
  }

  const { count: followerCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  if (followerCount >= 1) {
    if (await awardBadge(userId, 'first_follower')) awarded.push('first_follower');
  }
  if (followerCount >= 10) {
    if (await awardBadge(userId, 'ten_followers')) awarded.push('ten_followers');
  }
  if (followerCount >= 100) {
    if (await awardBadge(userId, 'hundred_followers')) awarded.push('hundred_followers');
  }

  const { count: likeCount } = await supabase
    .from('likes')
    .select('*, posts!inner(user_id)', { count: 'exact', head: true })
    .eq('posts.user_id', userId);

  if (likeCount >= 1) {
    if (await awardBadge(userId, 'first_like')) awarded.push('first_like');
  }
  if (likeCount >= 100) {
    if (await awardBadge(userId, 'hundred_likes')) awarded.push('hundred_likes');
  }

  const { data: recentPosts } = await supabase
    .from('posts')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (recentPosts && recentPosts.length >= 7) {
    const days = new Set(recentPosts.map(p => new Date(p.created_at).toDateString()));
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (days.has(d.toDateString())) {
        streak++;
      } else {
        break;
      }
    }
    if (streak >= 7) {
      if (await awardBadge(userId, 'seven_day_streak')) awarded.push('seven_day_streak');
    }
    if (streak >= 30) {
      if (await awardBadge(userId, 'thirty_day_streak')) awarded.push('thirty_day_streak');
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_verified')
    .eq('id', userId)
    .single();

  if (profile?.is_verified) {
    if (await awardBadge(userId, 'verified')) awarded.push('verified');
  }

  const { data: joinDate } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', userId)
    .single();

  if (joinDate) {
    const created = new Date(joinDate.created_at);
    const appLaunch = new Date('2025-01-01');
    const oneMonthLater = new Date(appLaunch);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    if (created <= oneMonthLater) {
      if (await awardBadge(userId, 'early_adopter')) awarded.push('early_adopter');
    }
  }

  return awarded;
}
