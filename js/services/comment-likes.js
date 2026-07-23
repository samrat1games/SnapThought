import { supabase } from '../supabase.js';

export async function toggleCommentLike(commentId, userId) {
  const { data: existing } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('comment_id', commentId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('id', existing.id);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase
      .from('comment_likes')
      .insert({ user_id: userId, comment_id: commentId });
    if (error) throw error;
    return true;
  }
}

export async function isCommentLiked(commentId, userId) {
  const { data } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('comment_id', commentId)
    .maybeSingle();
  return !!data;
}

export async function getCommentLikeCount(commentId) {
  const { count, error } = await supabase
    .from('comment_likes')
    .select('*', { count: 'exact', head: true })
    .eq('comment_id', commentId);
  if (error) throw error;
  return count || 0;
}
