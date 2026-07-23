import { supabase } from '../supabase.js';

export async function blockUser(blockerId, blockedId) {
  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockerId, blockedId) {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) throw error;
}

export async function isBlocked(userId, targetId) {
  const { data } = await supabase
    .from('blocks')
    .select('id')
    .or(`and(blocker_id.eq.${userId},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${userId})`)
    .maybeSingle();
  return !!data;
}

export async function getBlockedUsers(userId) {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, profiles:blocked_id(*)')
    .eq('blocker_id', userId);
  if (error) throw error;
  return (data || []).map(r => r.profiles).filter(Boolean);
}

export async function muteUser(userId, mutedId) {
  const { error } = await supabase
    .from('mutes')
    .insert({ user_id: userId, muted_id: mutedId });
  if (error) throw error;
}

export async function unmuteUser(userId, mutedId) {
  const { error } = await supabase
    .from('mutes')
    .delete()
    .eq('user_id', userId)
    .eq('muted_id', mutedId);
  if (error) throw error;
}

export async function isMuted(userId, mutedId) {
  const { data } = await supabase
    .from('mutes')
    .select('id')
    .eq('user_id', userId)
    .eq('muted_id', mutedId)
    .maybeSingle();
  return !!data;
}

export async function getMutedUsers(userId) {
  const { data, error } = await supabase
    .from('mutes')
    .select('muted_id, profiles:muted_id(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []).map(r => r.profiles).filter(Boolean);
}
