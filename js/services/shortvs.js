import { supabase } from '../supabase.js';

export async function createShortV({ videoUrl, thumbnailUrl, caption, userId }) {
  const { data, error } = await supabase
    .from('shortvs')
    .insert({
      user_id: userId,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl || '',
      caption: caption || '',
    })
    .select('*, profiles:user_id(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function getShortVs({ limit = 20, cursor = null } = {}) {
  let query = supabase
    .from('shortvs')
    .select('*, profiles:user_id(*)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getShortV(id) {
  const { data, error } = await supabase
    .from('shortvs')
    .select('*, profiles:user_id(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteShortV(id) {
  const { error } = await supabase.from('shortvs').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleShortVLike(shortvId, userId) {
  const { data: existing } = await supabase
    .from('shortv_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('shortv_id', shortvId)
    .limit(1);

  if (existing && existing.length > 0) {
    await supabase.from('shortv_likes').delete().eq('id', existing[0].id);
    return false;
  } else {
    await supabase.from('shortv_likes').insert({ user_id: userId, shortv_id: shortvId });
    return true;
  }
}

export async function isShortVLiked(shortvId, userId) {
  const { data } = await supabase
    .from('shortv_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('shortv_id', shortvId)
    .limit(1);
  return data && data.length > 0;
}

export async function incrementViews(shortvId) {
  try {
    await supabase.rpc('increment_shortv_views', { sid: shortvId });
  } catch (e) {}
}

export async function getShortVComments(shortvId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('shortv_comments')
    .select('*, profiles:user_id(*)')
    .eq('shortv_id', shortvId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function addShortVComment(shortvId, userId, content) {
  const { data, error } = await supabase
    .from('shortv_comments')
    .insert({ shortv_id: shortvId, user_id: userId, content })
    .select('*, profiles:user_id(*)')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteShortVComment(commentId) {
  const { error } = await supabase.from('shortv_comments').delete().eq('id', commentId);
  if (error) throw error;
}
