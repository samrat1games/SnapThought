import { supabase } from '../supabase.js';

export async function toggleFollow(followerId, followingId) {
  // Check if already following
  const { data: existing, error: checkError } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .limit(1);

  if (checkError) {
    console.error('Follow check error:', checkError);
    throw checkError;
  }

  if (existing && existing.length > 0) {
    // Unfollow
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('id', existing[0].id);
    if (error) {
      console.error('Unfollow error:', error);
      throw error;
    }
    return false;
  } else {
    // Follow
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });
    if (error) {
      console.error('Follow error:', error);
      throw error;
    }

    // Try to create notification (don't fail if it errors)
    try {
      await supabase.from('notifications').insert({
        user_id: followingId,
        actor_id: followerId,
        type: 'follow',
      });
    } catch (e) {
      console.warn('Notification insert failed:', e);
    }

    return true;
  }
}

export async function isFollowing(followerId, followingId) {
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .limit(1);

  if (error) {
    console.error('isFollowing error:', error);
    return false;
  }
  return data && data.length > 0;
}

export async function getFollowers(userId, { limit = 50, cursor = null } = {}) {
  let query = supabase
    .from('follows')
    .select('profiles:follower_id(*)')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(d => d.profiles);
}

export async function getFollowing(userId, { limit = 50, cursor = null } = {}) {
  let query = supabase
    .from('follows')
    .select('profiles:following_id(*)')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(d => d.profiles);
}
