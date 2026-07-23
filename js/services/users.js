import { supabase } from '../supabase.js';

export async function getProfile(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();
  if (error) throw error;
  return data;
}

export async function getProfileById(id) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserStats(userId) {
  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId),
  ]);

  return {
    followers: followersRes.count || 0,
    following: followingRes.count || 0,
  };
}

export async function searchUsers(query, { limit = 20 } = {}) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getSuggestedUsers(currentUserId, { limit = 5 } = {}) {
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUserId);

  const followingIds = (following || []).map(f => f.following_id);
  followingIds.push(currentUserId);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .not('id', 'in', `(${followingIds.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
