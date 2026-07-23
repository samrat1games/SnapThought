import { supabase } from '../supabase.js';

export async function getTimeline(userId, { limit = 20, cursor = null } = {}) {
  let query = supabase
    .from('posts')
    .select('*, profiles:user_id(*)')
    .eq('post_type', 'original')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Feed query error:', error);
    throw error;
  }
  return data || [];
}

export async function getFollowingFeed(userId, { limit = 20, cursor = null } = {}) {
  // Get IDs of users this person follows
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  const followingIds = (follows || []).map(f => f.following_id);
  if (followingIds.length === 0) return [];

  let query = supabase
    .from('posts')
    .select('*, profiles:user_id(*)')
    .eq('post_type', 'original')
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getForYouFeed(userId, { limit = 20, cursor = null } = {}) {
  // "For You" = newest posts first, with slight boost for engagement
  let query = supabase
    .from('posts')
    .select('*, profiles:user_id(*)')
    .eq('post_type', 'original')
    .order('created_at', { ascending: false })
    .limit(limit * 3);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const posts = data || [];

  // Score: recency is primary, engagement is secondary boost
  const now = Date.now();
  const scored = posts.map(p => {
    const ageHours = (now - new Date(p.created_at).getTime()) / 3600000;
    const recencyScore = Math.max(0, 100 - ageHours);
    const engageScore = (p.like_count || 0) * 2 + (p.reply_count || 0) + (p.repost_count || 0);
    return { ...p, _score: recencyScore + engageScore };
  });
  scored.sort((a, b) => b._score - a._score);

  return scored.slice(0, limit);
}

export async function getExplorePosts({ limit = 20, cursor = null } = {}) {
  let query = supabase
    .from('posts')
    .select('*, profiles:user_id(*)')
    .eq('post_type', 'original')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
